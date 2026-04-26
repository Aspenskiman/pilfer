import { Theme } from '@/types'

export const THEMES: Theme[] = [
  { id: 'winter_celebration', label: 'Winter Celebration', emoji: '❄️' },
  { id: 'birthday_bash',      label: 'Birthday Bash',      emoji: '🎂' },
  { id: 'shower_party',       label: 'Shower Party',       emoji: '🌸' },
  { id: 'team_mode',          label: 'Team Mode',          emoji: '👥' },
  { id: 'fall_gathering',     label: 'Fall Gathering',     emoji: '🍂' },
  { id: 'just_for_fun',       label: 'Just for Fun',       emoji: '🎉' },
  { id: 'summer_vibes',       label: 'Summer Vibes',       emoji: '☀️' },
  { id: 'celebration',        label: 'Celebration',        emoji: '🎊' },
]

export const DEFAULT_THEME = 'winter_celebration'
