import { Tier } from '@/types'

export const TIERS: Tier[] = [
  {
    id: 'free',
    label: 'The Taster',
    players: 'Up to 8 players',
    playerLimit: 8,
    price: 'Free',
    priceInCents: null,
    cta: 'Start for free',
    highlight: false,
  },
  {
    id: 'tier1',
    label: 'The Gathering',
    players: 'Up to 15 players',
    playerLimit: 15,
    price: '$29.99',
    priceInCents: 2999,
    cta: 'Choose this plan',
    highlight: false,
  },
  {
    id: 'tier2',
    label: 'The Party',
    players: 'Up to 30 players',
    playerLimit: 30,
    price: '$49.99',
    priceInCents: 4999,
    cta: 'Choose this plan',
    highlight: true,
  },
  {
    id: 'tier3',
    label: 'The Bash',
    players: 'Up to 50 players',
    playerLimit: 50,
    price: '$79.99',
    priceInCents: 7999,
    cta: 'Choose this plan',
    highlight: false,
  },
]

export const TIER_MAP = Object.fromEntries(TIERS.map((t) => [t.id, t]))
