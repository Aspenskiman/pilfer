import Image from 'next/image'
import Link from 'next/link'
import { TIERS } from '@/constants/tiers'
import { SUPPORT_EMAIL } from '@/constants/site'

const STEPS = [
  {
    n: '1',
    title: 'Create your game',
    body: 'Name it, pick a date, and share one link or QR code. No app to install — guests join from any phone.',
  },
  {
    n: '2',
    title: 'Everyone adds a gift',
    body: 'Each player snaps a photo of their gift and says how the winner will get it. Gifts stay wrapped until game time.',
  },
  {
    n: '3',
    title: 'Open, steal, lock',
    body: 'Put the stage on a big screen or shared call. Players take turns from their phones. Three steals and a gift is locked for good.',
  },
]

const FEATURES = [
  ['Phone is the controller', 'A full-screen YOUR TURN moment, then one tap to open or steal.'],
  ['A stage for the whole room', 'Every open, steal and lock plays out live on the shared screen.'],
  ['The rules run themselves', 'Turn order, revenge turns, the three-steal lock and no instant steal-backs are all enforced for you.'],
  ['Spectators welcome', 'Anyone can watch and react without bringing a gift, and spectators never count against your player limit.'],
  ['Works with any video call', 'Share the stage screen on Zoom, Meet or Teams, or play in the same room.'],
  ['A recap at the end', 'Most-stolen gift, biggest thief, and who gets what — with delivery details shown only to the winner.'],
]

const FAQ = [
  ['Do players need an account?', 'No. Only the host signs up. Players join with a link or code and a name.'],
  ['Do players ever pay?', 'Never. The host picks a plan for the game; players and spectators are always free.'],
  ['Are the gifts real?', 'Yes — players bring their own. Each player says how the winner will receive the gift (a link, a hand-off, a gift card). Pilfer does not sell or ship gifts.'],
  ['What if someone drops off mid-game?', 'The host can take a turn on behalf of any player from the stage screen, so the game keeps moving.'],
  ['Can I get a refund?', `Yes. If your paid game has not started, email ${SUPPORT_EMAIL} and we will refund it in full.`],
]

export default function Home() {
  const personal = TIERS.filter((t) => t.group === 'personal')
  const team = TIERS.filter((t) => t.group === 'team')

  return (
    <div className="min-h-screen bg-[#1A2B4A] text-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/pilfer-logo.png" alt="" width={44} height={44} priority className="h-11 w-11" />
          <span className="text-2xl font-bold text-[#B8922A]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Pilfer <span className="text-sm font-normal text-white/50">by Jamble</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/join" className="rounded-lg px-3 py-2 text-white/80 hover:text-white">
            Join a game
          </Link>
          <Link href="/login" className="rounded-lg px-3 py-2 text-white/80 hover:text-white">
            Log in
          </Link>
          <Link href="/signup" className="rounded-lg bg-[#B8922A] px-4 py-2 text-white hover:opacity-90">
            Host a game
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-12 text-center">
        <Image
          src="/pilfer-logo.png"
          alt="Pilfer logo: a white elephant dressed as a burglar, carrying a loot bag"
          width={160}
          height={160}
          priority
          className="mx-auto mb-8 h-32 w-32 sm:h-40 sm:w-40"
        />
        <h1
          className="text-4xl font-bold leading-tight sm:text-6xl"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          White Elephant, live, with everyone&apos;s phone in the game.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
          Pilfer runs your gift exchange for you: players open and steal from their phones while the
          big screen shows every twist. Free for up to 10 players.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-xl bg-[#B8922A] px-8 py-4 text-lg font-bold text-white hover:opacity-90 sm:w-auto"
          >
            Host a free game
          </Link>
          <Link
            href="/join"
            className="w-full rounded-xl border border-white/30 px-8 py-4 text-lg font-bold text-white hover:bg-white/10 sm:w-auto"
          >
            I have a join code
          </Link>
        </div>
        <p className="mt-4 text-sm text-white/40">No app to install. No credit card for free games.</p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[#B8922A]">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B8922A] font-bold">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[#B8922A]">
          What you get
        </h2>
        <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {FEATURES.map(([title, body]) => (
            <div key={title}>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[#B8922A]">
          Pricing
        </h2>
        <p className="mt-3 text-center text-white/60">
          One price per game. Players never pay. Spectators are always free.
        </p>

        <h3 className="mt-10 text-lg font-bold">Friends &amp; family</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {personal.map((t) => (
            <PriceCard key={t.id} label={t.label} players={t.players} price={t.price} paid={t.priceInCents != null} />
          ))}
        </div>

        <h3 className="mt-10 text-lg font-bold">Work &amp; organizations</h3>
        <p className="mt-1 text-sm text-white/50">
          For companies, teams, churches and schools. Includes a receipt for expensing.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {team.map((t) => (
            <PriceCard key={t.id} label={t.label} players={t.players} price={t.price} paid />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/signup"
            className="inline-block rounded-xl bg-[#B8922A] px-8 py-4 text-lg font-bold text-white hover:opacity-90"
          >
            Host a game
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[#B8922A]">
          Questions
        </h2>
        <dl className="mt-8 space-y-6">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt className="font-bold">{q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-white/60">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/40">
        <div className="flex items-center justify-center gap-5">
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white">Contact</a>
        </div>
        <p className="mt-3">Pilfer, the online White Elephant game, by Jamble · © {new Date().getFullYear()} Jamble</p>
      </footer>
    </div>
  )
}

function PriceCard({
  label, players, price, paid,
}: { label: string; players: string; price: string; paid: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h4 className="font-bold">{label}</h4>
      <p className="mt-1 text-sm text-white/60">{players}</p>
      <p className="mt-4 text-3xl font-bold">
        {price}
        {paid && <span className="ml-1 text-sm font-normal text-white/50">per game</span>}
      </p>
    </div>
  )
}
