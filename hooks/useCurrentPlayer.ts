import { useEffect, useState } from 'react'
import { Player } from './usePlayers'

export function useCurrentPlayer(players: Player[]) {
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)

  useEffect(() => {
    setCurrentPlayerId(localStorage.getItem('jamble_player_id'))
  }, [])

  const currentPlayer = players.find((p) => p.id === currentPlayerId) ?? null

  return { currentPlayer, currentPlayerId }
}
