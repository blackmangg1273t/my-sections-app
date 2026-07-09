import { useCallback, useEffect, useState } from 'react'

const USERNAME_KEY = 'chat_username'
const AVATAR_KEY = 'chat_avatar_url'

export function useLocalIdentity() {
  const [username, setUsernameState] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null)

  useEffect(() => {
    setUsernameState(localStorage.getItem(USERNAME_KEY))
    setAvatarUrlState(localStorage.getItem(AVATAR_KEY))
  }, [])

  const setUsername = useCallback((value: string) => {
    localStorage.setItem(USERNAME_KEY, value)
    setUsernameState(value)
  }, [])

  const setAvatarUrl = useCallback((value: string | null) => {
    if (value) {
      localStorage.setItem(AVATAR_KEY, value)
    } else {
      localStorage.removeItem(AVATAR_KEY)
    }
    setAvatarUrlState(value)
  }, [])

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(AVATAR_KEY)
    setUsernameState(null)
    setAvatarUrlState(null)
  }, [])

  return { username, avatarUrl, setUsername, setAvatarUrl, clearIdentity }
}
