import { Tier } from '@/types'

// Single source of truth for pricing. The checkout route, the webhook and the
// pricing UI all read from here — change a price in one place only.
export const FREE_PLAYER_LIMIT = 10

export const TIERS: Tier[] = [
  {
    id: 'free',
    group: 'personal',
    label: 'The Taster',
    players: 'Up to 10 players',
    playerLimit: FREE_PLAYER_LIMIT,
    price: 'Free',
    priceInCents: null,
    cta: 'Start for free',
    highlight: false,
  },
  {
    id: 'personal_25',
    group: 'personal',
    label: 'The Gathering',
    players: 'Up to 25 players',
    playerLimit: 25,
    price: '$19',
    priceInCents: 1900,
    cta: 'Choose The Gathering',
    highlight: true,
  },
  {
    id: 'personal_50',
    group: 'personal',
    label: 'The Bash',
    players: 'Up to 50 players',
    playerLimit: 50,
    price: '$39',
    priceInCents: 3900,
    cta: 'Choose The Bash',
    highlight: false,
  },
  {
    id: 'team_25',
    group: 'team',
    label: 'Team',
    players: 'Up to 25 players',
    playerLimit: 25,
    price: '$59',
    priceInCents: 5900,
    cta: 'Choose Team',
    highlight: true,
  },
  {
    id: 'team_50',
    group: 'team',
    label: 'Team Plus',
    players: 'Up to 50 players',
    playerLimit: 50,
    price: '$99',
    priceInCents: 9900,
    cta: 'Choose Team Plus',
    highlight: false,
  },
]

export const PAID_TIER_IDS = ['personal_25', 'personal_50', 'team_25', 'team_50'] as const
export type PaidTierId = (typeof PAID_TIER_IDS)[number]

export const TIER_MAP: Record<string, Tier> = Object.fromEntries(TIERS.map((t) => [t.id, t]))
