'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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

  const [giftUrl, setGiftUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [giftName, setGiftName] = useState('')
  const [description, setDescription] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const pid = localStorage.getItem('jamble_player_id')
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
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!game || !playerId) return
    if (!imageFile) {
      setError('Please upload a photo of your gift.')
      return
    }

    setSubmitting(true)
    setError(null)

    const supabase = createClient()

    // Upload image at submit time
    const ext = imageFile.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gift-images')
      .upload(filename, imageFile, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setSubmitting(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('gift-images')
      .getPublicUrl(uploadData.path)

    const { error: insertError } = await supabase.from('gifts').insert({
      game_id: game.id,
      submitted_by: playerId,
      image_url: publicUrl,
      gift_name: giftName,
      description: description || null,
      delivery_info: deliveryInfo,
      current_holder: null,
      steal_count: 0,
      is_locked: false,
      is_opened: false,
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push(`/game/${code}`)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="mx-auto max-w-lg space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Submit your gift</h1>
          {game && (
            <p className="mt-1 text-zinc-400">
              For <span className="font-medium text-white">{game.game_name}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gift link — optional */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Gift link <span className="text-zinc-500">(optional) — e.g. Amazon, Etsy, or any product URL</span>
            </label>
            <input
              type="url"
              value={giftUrl}
              onChange={(e) => setGiftUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-white focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Photo upload — required */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">
              Gift photo <span className="text-zinc-400">(required)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-700 p-8 text-center transition hover:border-zinc-500"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Gift preview"
                  className="mx-auto max-h-48 rounded-lg object-contain"
                />
              ) : (
                <p className="text-zinc-500">Click to upload a photo</p>
              )}
            </div>
            {imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-zinc-500 underline"
              >
                Change photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Gift name */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Gift name <span className="text-zinc-500">(max 40 chars)</span>
            </label>
            <input
              type="text"
              required
              maxLength={40}
              value={giftName}
              onChange={(e) => setGiftName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-white focus:outline-none"
              placeholder="e.g. Cozy Blanket Set"
            />
          </div>

          {/* Description — optional */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Description <span className="text-zinc-500">(optional — shown during reveal)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-white focus:outline-none"
              placeholder="What makes this gift special?"
            />
          </div>

          {/* Delivery info — required */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-300">
              Delivery info <span className="text-zinc-500">(private — only you and the host see this)</span>
            </label>
            <input
              type="text"
              required
              value={deliveryInfo}
              onChange={(e) => setDeliveryInfo(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-white focus:outline-none"
              placeholder="e.g. Amazon link, Venmo @yourname, hand delivery"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit gift'}
          </button>
        </form>
      </div>
    </div>
  )
}
