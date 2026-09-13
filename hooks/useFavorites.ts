import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'lisbon-ai-week-a-favorites'

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export function useFavorites() {
  // Read synchronously: never briefly overwrite an existing agenda with an empty state.
  const [favorites, setFavorites] = useState<string[]>(() => read())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      // Storage may be unavailable; retain this visitor's in-memory agenda.
    }
  }, [favorites])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }, [])

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
