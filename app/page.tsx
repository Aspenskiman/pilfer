import Image from 'next/image'
import Link from 'next/link'
import { TIERS } from '@/constants/tiers'
import { SUPPORT_EMAIL } from '@/constants/site'
import { Logo } from '@/components/brand/Logo'
import { PageShell, TopBar } from '@/components/brand/Shell'
import { StageDemo } from '@/components/brand/StageDemo'

const STEPS = [
  {
    title: 'Create your game',
    body: 'Name it, pick a date, and share one link or QR code. No app to install. Guests join from any phone.',
  },
  {
    title: 'Everyone adds a gift',
    body: 'Each player snaps a photo of their gift and says how the winner will get it. Gifts stay wrapped until game time.',
  },
  {
    title: 'Open, steal, lock',
    body: 'Put the stage on a big screen or shared call. Players take turns from their phones. Three steals and a gift is locked for good.',
  },
]

const FEATURES = [
  ['Your phone is the controller', 'A full-screen "your turn" moment, then one tap to open or steal.'],
  ['A stage for the whole room', 'Every open, steal and lock plays out live on the shared screen.'],
  ['The rules run themselves', 'Turn order, revenge turns, the three-steal lock and no instant steal-backs are all enforced for you.'],
  ['Spectators welcome', 'Anyone can watch and react without bringing a gift, and spectators never count against your player limit.'],
  ['Works with any video call', 'Share the stage screen on Zoom, Meet or Teams, or play in the same room.'],
  ['A recap at the end', 'Most-stolen gift, biggest thief, and who gets what, with delivery details shown only to the winner.'],
]

const OCCASIONS = [
  {
    paper: 'pf-wrap-dots',
    title: 'The office holiday party',
    body: 'Remote, hybrid or all in one room. Share the stage on the call and let the steals do the icebreaking.',
  },
  {
    paper: 'pf-wrap-stripes',
    title: 'Family in three time zones',
    body: 'Grandma joins with a link and her name. No account, nothing to install.',
  },
  {
    paper: 'pf-wrap-confetti',
    title: 'Birthdays and showers',
    body: 'A gift swap gives the party a main event, and everyone leaves with something.',
  },
  {
    paper: 'pf-wrap-check',
    title: 'Friends, any excuse',
    body: 'Game night, Friendsgiving, a regift purge in January. Ten players are free.',
  },
]

const FAQ = [
  ['Do players need an account?', 'No. Only the host signs up. Players join with a link or code and a name.'],
  ['Do players ever pay?', 'Never. The host picks a plan for the game; players and spectators are always free.'],
  ['Are the gifts real?', 'Yes, players bring their own. Each player says how the winner will receive the gift (a link, a hand-off, a gift card). Pilfer does not sell or ship gifts.'],
  ['What if someone drops off mid-game?', 'The host can take a turn on behalf of any player from the stage screen, so the game keeps moving.'],
  ['Can I get a refund?', `Yes. If your paid game has not started, email ${SUPPORT_EMAIL} and we will refund it in full.`],
]

export default function Home() {
  const personal = TIERS.filter((t) => t.group === 'personal')
  const team = TIERS.filter((t) => t.group === 'team')

  return (
    <PageShell>
      <TopBar maxWidth="max-w-6xl">
        <Link href="/join" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-tusk/80 hover:text-tusk sm:block">
          Join a game
        </Link>
        <Link href="/login" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-tusk/80 hover:text-tusk">
          Log in
        </Link>
        <Link href="/signup" className="pf-btn pf-btn-sm pf-btn-loot whitespace-nowrap">
          Host a game
        </Link>
      </TopBar>

      {/* Hero: a round of the game, playing on the stage and on one phone */}
      <section className="relative">
        <div className="pf-spot hidden lg:block" aria-hidden="true">
          <div className="pf-beam" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-x-10 gap-y-12 px-5 pb-16 pt-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:pb-24 lg:pt-12">
          <div>
            <h1 className="pf-display text-[3.4rem] text-tusk sm:text-7xl lg:text-[5.25rem]">
              Steal the good gift.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-tusk/80 sm:text-xl">
              Pilfer is the White Elephant gift swap, run as a live game. You host. Everyone plays
              from their phone, and the big screen shows every open, every steal and every grudge.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/signup" className="pf-btn pf-btn-lg pf-btn-loot">
                Host a free game
              </Link>
              <Link href="/join" className="pf-btn pf-btn-lg pf-btn-ghost">
                I have a join code
              </Link>
            </div>
            <p className="mt-5 text-sm font-medium text-tusk/60">
              Free for up to 10 players. No app to install, no card needed.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[600px]">
            <StageDemo />
            <div className="pf-caught absolute -left-14 bottom-0 hidden sm:block lg:-left-20">
              <Logo size={104} priority className="-rotate-12 drop-shadow-[0_8px_0_rgba(12,12,23,0.55)]" />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-tusk/60">
              The shared screen and one player&apos;s phone, during a round.
            </p>
          </div>
        </div>
        {/* The burglar's shirt, as the fold */}
        <div className="pf-stripes h-10 w-full" aria-hidden="true" />
      </section>

      {/* The three moves, on bright paper. Not a sequence, so not numbered. */}
      <section className="pf-sheet">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <h2 className="pf-display text-4xl sm:text-6xl">Three moves. One good gift.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/75">
            On your turn you open something new or take what someone else already has. That is the
            whole game, and it is enough to start a feud.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="pf-move bg-mint">
              <div className="pf-move-art pf-move-art-mint">
                <MoveArt name="open" />
              </div>
              <div className="p-6">
                <h3 className="pf-display text-4xl">Open</h3>
                <p className="mt-2 text-lg font-medium leading-snug text-ink/80">
                  Pick a wrapped gift and unwrap it in front of everyone. Could be an air fryer.
                  Could be a singing fish.
                </p>
              </div>
            </div>
            <div className="pf-move bg-redhanded">
              <div className="pf-move-art pf-move-art-red !items-start !justify-end">
                <MoveArt name="steal" />
              </div>
              <div className="p-6">
                <h3 className="pf-display text-4xl">Steal</h3>
                <p className="mt-2 text-lg font-medium leading-snug text-ink/85">
                  See something better? Take it. The player you robbed gets a revenge turn right
                  away.
                </p>
              </div>
            </div>
            <div className="pf-move bg-loot">
              <div className="pf-move-art pf-move-art-loot">
                <MoveArt name="lock" />
              </div>
              <div className="p-6">
                <h3 className="pf-display text-4xl">Lock</h3>
                <p className="mt-2 text-lg font-medium leading-snug text-ink/80">
                  The third steal locks a gift for good. Whoever is holding it keeps it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence, so it is numbered */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <h2 className="pf-display text-4xl text-tusk sm:text-5xl">How hosting goes</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="pf-display block text-7xl text-loot" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-3 text-xl font-extrabold text-tusk">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-tusk/70">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <div className="pf-panel px-6 py-10 sm:px-10">
          <h2 className="pf-display text-4xl text-tusk sm:text-5xl">What you get</h2>
          <dl className="mt-8 grid gap-x-12 gap-y-7 sm:grid-cols-2">
            {FEATURES.map(([title, body]) => (
              <div key={title} className="border-l-4 border-loot pl-4">
                <dt className="text-lg font-extrabold text-tusk">{title}</dt>
                <dd className="mt-1 leading-relaxed text-tusk/70">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Occasions, as wrapping paper */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <h2 className="pf-display text-4xl text-tusk sm:text-5xl">Any party with presents</h2>
        <p className="mt-3 max-w-xl text-lg text-tusk/70">
          December is the busy season, but a gift swap works any time people get together.
        </p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {OCCASIONS.map((o) => (
            <li key={o.title} className={`pf-wrap ${o.paper}`}>
              <div className="pf-wrap-tag">
                <h3 className="text-lg font-extrabold leading-tight">{o.title}</h3>
                <p className="mt-1 text-sm font-medium leading-snug text-ink/75">{o.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing: plans as tickets */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <h2 className="pf-display text-4xl text-tusk sm:text-5xl">One price per game</h2>
        <p className="mt-3 max-w-xl text-lg text-tusk/70">
          The host pays once for the game. Players never pay, and spectators are always free.
        </p>

        <h3 className="mt-10 text-xl font-extrabold text-tusk">Friends and family</h3>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {personal.map((t) => (
            <Ticket key={t.id} label={t.label} players={t.players} price={t.price} paid={t.priceInCents != null} />
          ))}
        </div>

        <h3 className="mt-12 text-xl font-extrabold text-tusk">Work and organizations</h3>
        <p className="mt-1 text-tusk/65">
          For companies, teams, churches and schools. Includes a receipt for expensing.
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {team.map((t) => (
            <Ticket key={t.id} label={t.label} players={t.players} price={t.price} paid tone="red" />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
        <h2 className="pf-display text-4xl text-tusk sm:text-5xl">Questions</h2>
        <div className="mt-8 divide-y-2 divide-tusk/10 border-y-2 border-tusk/10">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-extrabold text-tusk [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  className="pf-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-loot text-xl text-ink transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 max-w-2xl leading-relaxed text-tusk/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <div className="pf-paper flex flex-col items-center gap-6 overflow-hidden px-6 py-10 text-center sm:flex-row sm:px-10 sm:text-left">
          <Logo size={120} className="shrink-0 -rotate-6" />
          <div className="flex-1">
            <h2 className="pf-display text-4xl text-ink sm:text-5xl">Your party needs a thief.</h2>
            <p className="mt-2 text-lg text-ink/70">
              Set up a game in a couple of minutes and send one link.
            </p>
          </div>
          <Link href="/signup" className="pf-btn pf-btn-lg pf-btn-red shrink-0">
            Host a free game
          </Link>
        </div>
      </section>

      <footer className="border-t-2 border-tusk/10 px-6 py-8 text-center text-sm text-tusk/50">
        <div className="flex items-center justify-center gap-6 font-bold">
          <Link href="/terms" className="hover:text-tusk">Terms</Link>
          <Link href="/privacy" className="hover:text-tusk">Privacy</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-tusk">Contact</a>
        </div>
        <p className="mt-3">
          Pilfer, the online White Elephant game, by Jamble. © {new Date().getFullYear()} Jamble
        </p>
      </footer>
    </PageShell>
  )
}

function Ticket({
  label,
  players,
  price,
  paid,
  tone = 'loot',
}: {
  label: string
  players: string
  price: string
  paid: boolean
  tone?: 'loot' | 'red'
}) {
  return (
    <div className={`pf-paper flex overflow-hidden ${tone === 'red' ? 'pf-paper-red' : ''}`}>
      <div className="flex-1 p-5">
        <h4 className="text-xl font-extrabold leading-tight">{label}</h4>
        <p className="mt-1 font-medium text-ink/65">{players}</p>
      </div>
      <div className="pf-perf flex w-28 shrink-0 flex-col items-center justify-center px-2 py-5 text-center">
        <span className="pf-display text-4xl">{price}</span>
        <span className="mt-1 text-xs font-bold text-ink/60">{paid ? 'per game' : 'forever'}</span>
      </div>
    </div>
  )
}

/** One of the three rendered move illustrations in public/art. */
function MoveArt({ name }: { name: 'open' | 'steal' | 'lock' }) {
  // The thief's arm reaches in from the corner, so that drawing is pinned there.
  return (
    <Image
      src={`/art/${name}.webp`}
      alt=""
      width={320}
      height={320}
      className={`w-auto object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.45)] ${name === 'steal' ? 'h-[16.25rem]' : 'h-[15.5rem]'}`}
    />
  )
}
