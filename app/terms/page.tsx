import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { SUPPORT_EMAIL } from '@/constants/site'

export const metadata: Metadata = { title: 'Terms of Service' }

// DRAFT — plain-language starting point. Have this reviewed before relying on it.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <h2>What Pilfer is</h2>
        <p>
          Pilfer is operated by Jamble (&quot;we&quot;, &quot;us&quot;). It is an online tool for running a White Elephant style gift exchange game. Hosts
          create a game and invite players. Players bring and deliver their own gifts. Pilfer does
          not sell, buy, hold or ship gifts and is not a party to any exchange between players.
        </p>
      </section>
      <section>
        <h2>Accounts</h2>
        <p>
          Hosts need an account and must be at least 18. Players join with a name and a join code
          and do not need an account. Hosts are responsible for who they invite and for how their
          game is run.
        </p>
      </section>
      <section>
        <h2>Plans and payment</h2>
        <ul>
          <li>Free games allow up to 10 players. Paid plans are a one-time price per game.</li>
          <li>Friends &amp; family plans are for non-commercial use. Companies and other organizations should choose a Work &amp; organizations plan.</li>
          <li>Payments are processed by Stripe. We do not see or store card numbers.</li>
        </ul>
      </section>
      <section>
        <h2>Refunds</h2>
        <p>
          If your paid game has not started, email {SUPPORT_EMAIL} and we will refund it in full. If
          a technical problem on our side stops a paid game from being played, we will refund it or
          give you a replacement game, your choice.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Don&apos;t upload anything illegal, hateful, sexually explicit or that you don&apos;t have
          the right to share, and don&apos;t try to disrupt the service or other people&apos;s
          games. We may remove content or close games that break these rules.
        </p>
      </section>
      <section>
        <h2>Gifts are between players</h2>
        <p>
          Players are solely responsible for the gifts they offer and for delivering them. Pilfer
          makes no promise that any gift will be delivered or will be as described.
        </p>
      </section>
      <section>
        <h2>The service</h2>
        <p>
          Pilfer is provided as is. We work hard to keep it running, but we can&apos;t guarantee it
          will be uninterrupted or error-free. To the extent the law allows, our total liability for
          any claim is limited to the amount you paid us for the game in question.
        </p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>
          We may update these terms; the date above shows the latest version. Questions:{' '}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
