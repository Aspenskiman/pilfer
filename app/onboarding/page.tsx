import Link from 'next/link'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">You&apos;re in.</h1>
          <p className="text-zinc-400 text-lg">
            Your account is confirmed and ready to go.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200"
        >
          Create your first game
        </Link>
      </div>
    </div>
  )
}
