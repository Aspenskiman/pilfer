import Link from 'next/link'
import { StatusScreen } from '@/components/brand/Shell'
import { Confetti } from '@/components/brand/Confetti'

export default function OnboardingPage() {
  return (
    <>
      <Confetti />
      <StatusScreen
        title="You're in."
        action={
          <Link href="/dashboard/new" className="pf-btn pf-btn-lg pf-btn-loot">
            Create your first game
          </Link>
        }
      >
        <p>Your account is confirmed and ready to go.</p>
      </StatusScreen>
    </>
  )
}
