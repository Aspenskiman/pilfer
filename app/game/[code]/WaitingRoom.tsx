import Link from 'next/link'
import type { Player } from '@/types'
import { PageShell } from '@/components/brand/Shell'
import { Logo } from '@/components/brand/Logo'
import { GiftBox } from '@/components/brand/GiftBox'
import { Avatar } from '@/components/brand/Avatar'

type Props = {
  gameName: string | null
  joinCode: string
  players: Player[]
  submittedIds: Set<string>
  giftCount: number
  currentPlayerId: string | null
  isHost: boolean
  alreadySubmitted: boolean
  allSubmitted: boolean
  startingGame: boolean
  startError: string | null
  onStart: () => void
}

/** The lobby everyone sits in before the host starts the game. */
export default function WaitingRoom({
  gameName,
  joinCode,
  players,
  submittedIds,
  giftCount,
  currentPlayerId,
  isHost,
  alreadySubmitted,
  allSubmitted,
  startingGame,
  startError,
  onStart,
}: Props) {
  const me = players.find((p) => p.id === currentPlayerId) ?? null
  const iNeedAGift = !!me && me.role === 'participant' && !submittedIds.has(me.id)
  const readyCount = players.filter((p) => submittedIds.has(p.id)).length
  const canStart = readyCount >= 2

  return (
    <PageShell>
      <main className="mx-auto max-w-xl px-5 pb-32 pt-8 sm:px-6">
        <div className="flex items-start gap-4">
          <Logo size={72} className="shrink-0 -rotate-6" />
          <div className="min-w-0">
            <p className="font-bold text-tusk/60">{isHost ? 'Waiting room, host view' : 'Waiting room'}</p>
            <h1 className="pf-display mt-1 break-words text-4xl text-tusk sm:text-5xl">{gameName}</h1>
          </div>
        </div>

        <p className="mt-5 flex flex-wrap items-center gap-3 text-tusk/70">
          Friends can join with code
          <span className="pf-tag text-2xl">{joinCode}</span>
        </p>

        {/* The one thing this player still has to do */}
        {iNeedAGift && (
          <div className="pf-paper mt-8 flex items-center gap-4 p-5">
            <GiftBox seed={0} size={72} className="shrink-0 -rotate-6" />
            <div className="min-w-0 flex-1">
              <h2 className="pf-display text-2xl">Add your gift</h2>
              <p className="mt-1 text-sm font-medium text-ink/70">
                Snap a photo of what you&apos;re bringing. It stays wrapped until someone opens it.
              </p>
              <Link href={`/game/${joinCode}/submit`} className="pf-btn pf-btn-red mt-3">
                Add my gift
              </Link>
            </div>
          </div>
        )}

        {alreadySubmitted && (
          <p className="pf-panel mt-8 px-4 py-3 text-center font-bold text-mint" role="status">
            Your gift is already in the pile.
          </p>
        )}

        {/* The pile */}
        <section className="pf-panel mt-8 p-5" aria-label="Gift pile">
          <h2 className="text-lg font-extrabold text-tusk">
            {giftCount === 0
              ? 'No gifts in the pile yet'
              : `${giftCount} ${giftCount === 1 ? 'gift' : 'gifts'} wrapped and waiting`}
          </h2>
          {giftCount > 0 && (
            <div className="mt-4 flex flex-wrap items-end gap-1">
              {Array.from({ length: giftCount }, (_, i) => (
                <GiftBox
                  key={i}
                  seed={i}
                  size={i % 3 === 0 ? 64 : 52}
                  className={`pf-pop ${i % 2 === 0 ? '-rotate-3' : 'rotate-3'}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* The crew */}
        <section className="mt-8">
          <h2 className="text-lg font-extrabold text-tusk">
            {players.length === 0
              ? 'Nobody has joined yet'
              : `${players.length} ${players.length === 1 ? 'person is' : 'people are'} here`}
          </h2>

          {players.length === 0 ? (
            <p className="mt-2 text-tusk/65">
              Share the join code, or the QR code from your game page, to get people in.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {players.map((player) => {
                const isMe = player.id === currentPlayerId
                const hasSubmitted = submittedIds.has(player.id)
                const watching = player.role === 'spectator'

                return (
                  <li
                    key={player.id}
                    className={`pf-panel flex items-center gap-3 px-4 py-3 ${isMe ? '!border-loot' : ''}`}
                  >
                    <Avatar name={player.display_name} />
                    <span className="min-w-0 flex-1 truncate text-lg font-bold text-tusk">
                      {player.display_name}
                      {isMe && <span className="ml-2 text-sm font-medium text-tusk/50">you</span>}
                    </span>
                    {watching ? (
                      <span className="pf-chip pf-chip-quiet">Watching</span>
                    ) : hasSubmitted ? (
                      <span className="pf-chip pf-chip-open">Gift in</span>
                    ) : (
                      <span className="pf-chip pf-chip-quiet">No gift yet</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {!isHost && players.length > 0 && (
          <p className="mt-8 text-center font-medium text-tusk/60">
            The host starts the game. Keep this page open and it will switch over on its own.
          </p>
        )}
      </main>

      {/* Host only: start bar pinned to the bottom of the screen */}
      {isHost && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-alley/95 px-5 py-4 backdrop-blur">
          <div className="mx-auto max-w-xl">
            <button
              onClick={onStart}
              disabled={startingGame || players.length === 0}
              className="pf-btn pf-btn-lg pf-btn-loot w-full"
            >
              {startingGame ? 'Starting…' : 'Start the game'}
            </button>
            {startError ? (
              <p className="pf-error-dark mt-2 text-center" role="alert">
                {startError}
              </p>
            ) : !canStart ? (
              <p className="mt-2 text-center text-sm font-medium text-tusk/60">
                You need at least 2 players with a gift in the pile. {readyCount} so far.
              </p>
            ) : !allSubmitted ? (
              <p className="mt-2 text-center text-sm font-medium text-tusk/60">
                Not everyone has added a gift. You can still start, and they will watch.
              </p>
            ) : (
              <p className="mt-2 text-center text-sm font-bold text-mint">
                Everyone&apos;s gift is in. Ready when you are.
              </p>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
