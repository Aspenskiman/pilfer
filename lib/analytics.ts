import posthog from 'posthog-js'

// The launch funnel. Keep properties free of personal data
// (no names, emails, gift details or delivery info).
type EventName =
  | 'game_created'
  | 'checkout_started'
  | 'game_opened_for_joining'
  | 'player_joined'
  | 'gift_submitted'
  | 'game_started'
  | 'recap_viewed'

export function track(event: EventName, props?: Record<string, string | number | boolean | null>) {
  try {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    posthog.capture(event, props)
  } catch {
    // analytics must never break the game
  }
}
