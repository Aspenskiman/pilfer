import type { Metadata } from 'next'
import { DemoGame } from './DemoGame'

export const metadata: Metadata = {
  title: 'Play the demo',
  description:
    'Try Pilfer in three minutes. Play a short White Elephant game against four computer players. No account needed.',
}

export default function DemoPage() {
  return <DemoGame />
}
