import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { SUPPORT_EMAIL } from '@/constants/site'

export const metadata: Metadata = { title: 'Privacy Policy' }

// DRAFT — plain-language starting point. Have this reviewed before relying on it.
// Keep this in step with what the app actually collects.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Hosts:</strong> your email address and password (stored securely by our authentication provider), and the games you create.</li>
          <li><strong>Players:</strong> the display name you type when you join. No account or email is needed.</li>
          <li><strong>Gifts:</strong> the photo, name, description and delivery details you enter.</li>
          <li><strong>Game activity:</strong> turns, steals and reactions, so the game and recap work.</li>
          <li><strong>Payments:</strong> handled by Stripe. We receive a payment confirmation, not your card details.</li>
        </ul>
      </section>
      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Anyone with your game&apos;s join code can see player names, gift photos, names and descriptions, and the live feed.</li>
          <li>Delivery details are private. They are shown only to the game&apos;s host and, after the game ends, to the player who won that gift.</li>
          <li>Gift photos are stored at web addresses that are not listed publicly but can be viewed by anyone who has the link. Don&apos;t include anything sensitive in a gift photo.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>
          Only to run your game, take payment, keep the service secure, and reply when you contact
          us. We do not sell personal information and we do not show ads.
        </p>
      </section>
      <section>
        <h2>Services we rely on</h2>
        <p>
          Pilfer is operated by Jamble. Supabase (database, sign-in and file storage), Vercel
          (hosting), Stripe (payments), Sentry (error reports) and PostHog (anonymous usage
          counts, such as how many games are started) process data on our behalf. We do not
          record your screen or what you type.
        </p>
      </section>
      <section>
        <h2>Your device</h2>
        <p>
          We keep a sign-in cookie for hosts, and store a player ID in your browser so you can rejoin
          a game if you close the page.
        </p>
      </section>
      <section>
        <h2>Deleting your data</h2>
        <p>
          Email <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> to
          delete your account, a game, or anything you entered in a game. Pilfer is not intended
          for children under 13.
        </p>
      </section>
    </LegalPage>
  )
}
