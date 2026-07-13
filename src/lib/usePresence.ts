import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

type PresenceState = Record<string, { username: string; typing: boolean }[]>

export function usePresence(username: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!username) return

    const channel = supabase.channel('chat-presence', {
      config: { presence: { key: username } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState
        const online = new Set<string>()
        const typing = new Set<string>()
        for (const key of Object.keys(state)) {
          online.add(key)
          const entries = state[key]
          if (entries?.some((e) => e.typing)) typing.add(key)
        }
        setOnlineUsers(online)
        setTypingUsers(typing)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username, typing: false })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username])

  function setTyping(isTyping: boolean) {
    const channel = channelRef.current
    if (!channel || !username) return
    channel.track({ username, typing: isTyping })

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        channel.track({ username, typing: false })
      }, 3000)
    }
  }

  return { onlineUsers, typingUsers: typingUsers, setTyping }
}
