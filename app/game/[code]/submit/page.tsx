'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { submitGift } from '@/app/actions/submitGift'
import { track } from '@/lib/analytics'
import { LOCAL_STORAGE_PLAYER_KEY, LOCAL_STORAGE_TOKEN_KEY } from '@/constants/game'
import { CenteredCard, StatusScreen } from '@/components/brand/Shell'
import { GiftBox } from '@/components/brand/GiftBox'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

type Game = {
  id: string
  game_name: string
  join_code: string
}

export default function SubmitGiftPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [giftName, setGiftName] = useState('')
  const [description, setDescription] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const pid = localStorage.getItem(LOCAL_STORAGE_PLAYER_KEY)
    setPlayerId(pid)

    const supabase = createClient()

    async function check() {
      const { data: gameData } = await supabase
        .from('party_games')
        .select('id, game_name, join_code')
        .eq('join_code', code.toUpperCase())
        .single()

      if (!gameData) {
        router.push(`/game/${code}`)
        return
      }

      setGame(gameData)

      if (pid) {
        const { data: existing } = await supabase
          .from('gifts')
          .select('id')
          .eq('game_id', gameData.id)
          .eq('submitted_by', pid)
          .maybeSingle()

        if (existing) {
          router.push(`/game/${code}?already_submitted=1`)
          return
        }
      }

      setChecking(false)
    }

    check()
  }, [code, router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('That photo is too large — please use one under 8 MB.')
      return
    }
    setError(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!game) return
    if (!playerId) {
      setError('We could not find your player on this device. Please rejoin from your invite link.')
      return
    }
    if (!imageFile) {
      setError('Please upload a photo of your gift.')
      return
    }

    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    const supabase = createClient()

    // Upload image client-side — Storage SDK requires browser File object
    const ext = (imageFile.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const filename = `${game.id}/${crypto.randomUUID()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gift-images')
      .upload(filename, imageFile, { upsert: false, contentType: imageFile.type })

    if (uploadError) {
      setError('Photo upload failed. Please try again.')
      setSubmitting(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('gift-images')
      .getPublicUrl(uploadData.path)

    // Validate and insert via server action
    const result = await submitGift({
      game_id: game.id,
      player_id: playerId,
      session_token: localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY),
      gift_name: giftName,
      description: description || undefined,
      delivery_info: deliveryInfo || undefined,
      image_url: publicUrl,
    })

    setSubmitting(false)

    if ('fieldErrors' in result) {
      setFieldErrors(result.fieldErrors)
      return
    }
    if ('error' in result) {
      setError(result.error)
      return
    }

    track('gift_submitted')
    router.push(`/game/${code}`)
  }

  if (checking) {
    return <StatusScreen title="Loading…" />
  }

  return (
    <CenteredCard width="max-w-lg" tone="red" topBarHref={`/game/${code}`}>
      <h1 className="pf-display pr-20 text-4xl sm:text-5xl">Add your gift</h1>
      {game && (
        <p className="mt-3 text-ink/70">
          For <span className="font-extrabold text-ink">{game.game_name}</span>. It stays wrapped
          until someone opens it.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-6">
        {/* Photo upload — required */}
        <div>
          <span className="pf-label">Photo of the gift</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-[3px] border-dashed border-ink/50 bg-white px-4 py-7 text-center transition-colors hover:border-ink"
          >
            {imagePreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Your gift"
                  className="max-h-52 rounded-xl border-[3px] border-ink object-contain"
                />
                <span className="pf-link text-sm">Choose a different photo</span>
              </>
            ) : (
              <>
                <GiftBox seed={0} size={64} />
                <span className="font-extrabold">Take or choose a photo</span>
                <span className="text-sm font-medium text-ink/60">JPG or PNG, up to 8 MB</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div>
          <label htmlFor="gift_name" className="pf-label">
            What is it? <span className="pf-hint">(up to 40 characters)</span>
          </label>
          <input
            id="gift_name"
            type="text"
            required
            maxLength={40}
            value={giftName}
            onChange={(e) => setGiftName(e.target.value)}
            className="pf-input"
            placeholder="Cozy blanket set"
          />
          {fieldErrors.gift_name && <p className="pf-error mt-1.5">{fieldErrors.gift_name[0]}</p>}
        </div>

        <div>
          <label htmlFor="gift_description" className="pf-label">
            Sell it <span className="pf-hint">(optional, shown when it&apos;s opened)</span>
          </label>
          <textarea
            id="gift_description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={200}
            className="pf-input resize-none"
            placeholder="What makes this the one to steal?"
          />
          {fieldErrors.description && <p className="pf-error mt-1.5">{fieldErrors.description[0]}</p>}
        </div>

        <div>
          <label htmlFor="delivery_info" className="pf-label">
            How the winner gets it
          </label>
          <input
            id="delivery_info"
            type="text"
            required
            maxLength={300}
            value={deliveryInfo}
            onChange={(e) => setDeliveryInfo(e.target.value)}
            className="pf-input"
            placeholder="Amazon link, hand delivery, gift card code"
          />
          <p className="mt-1.5 text-sm font-medium text-ink/60">
            Private. Only the host and whoever ends up with your gift can see this.
          </p>
          {fieldErrors.delivery_info && <p className="pf-error mt-1.5">{fieldErrors.delivery_info[0]}</p>}
        </div>

        {error && (
          <p className="pf-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="pf-btn pf-btn-lg pf-btn-red w-full">
          {submitting ? 'Wrapping it up…' : 'Add to the pile'}
        </button>
      </form>
    </CenteredCard>
  )
}
