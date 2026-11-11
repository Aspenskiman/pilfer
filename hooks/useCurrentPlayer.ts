import { useEffect, useState } from 'react'
import { Player } from '@/types'
import { LOCAL_STORAGE_PLAYER_KEY, LOCAL_STORAGE_TOKEN_KEY } from '@/constants/game'

export function useCurrentPlayer(players: Player[]) {
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)

  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    setCurrentPlayerId(localStorage.getItem(LOCAL_STORAGE_PLAYER_KEY))
    setSessionToken(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY))
  }, [])

  const currentPlayer = players.find((p) => p.id === currentPlayerId) ?? null

  return { currentPlayer, currentPlayerId, sessionToken }
}
