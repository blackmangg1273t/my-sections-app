import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Palette,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  X,
} from 'lucide-react'
import {
  supabase,
  type ChatMessage,
  type ChatRead,
  type MessageReaction,
  type Profile,
} from '../lib/supabaseClient'
import { useLocalIdentity } from '../lib/useLocalIdentity'
import { useChatTheme, THEMES, type ThemeId } from '../lib/useChatTheme'
import { usePresence } from '../lib/usePresence'

type ProfilesByUsername = Record<string, Profile>
const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥']
const GROUP_WINDOW_MS = 5 * 60 * 1000

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase()
}

export default function Chat({ onBack }: { onBack: () => void }) {
  const { username, avatarUrl, setUsername, setAvatarUrl, clearIdentity } =
    useLocalIdentity()
  const { theme, setTheme } = useChatTheme()
  const { onlineUsers, typingUsers, setTyping } = usePresence(username)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [profiles, setProfiles] = useState<ProfilesByUsername>({})
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const [reads, setReads] = useState<ChatRead[]>([])
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<{ url: string; type: 'image' | 'gif' } | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isReady = Boolean(username)

  useEffect(() => {
    if (!isReady) return
    let active = true

    async function load() {
      setLoading(true)
      const [msgRes, profRes, reactRes, readsRes] = await Promise.all([
        supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(300),
        supabase.from('profiles').select('id, username, avatar_url, created_at, updated_at'),
        supabase.from('message_reactions').select('*'),
        supabase.from('chat_reads').select('*'),
      ])

      if (!active) return

      if (msgRes.error || profRes.error) {
        setError('تعذر تحميل الرسائل. حاول تاني.')
      } else {
        setMessages(msgRes.data ?? [])
        const map: ProfilesByUsername = {}
        for (const p of profRes.data ?? []) map[p.username] = p
        setProfiles(map)
        setReactions(reactRes.data ?? [])
        setReads(readsRes.data ?? [])
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('public:chat-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const incoming = payload.new as ChatMessage
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updated = payload.new as ChatMessage
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        supabase
          .from('message_reactions')
          .select('*')
          .then(({ data }) => setReactions(data ?? []))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reads' }, () => {
        supabase
          .from('chat_reads')
          .select('*')
          .then(({ data }) => setReads(data ?? []))
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [isReady])

  // Mark as read whenever new messages arrive while the chat is open
  useEffect(() => {
    if (!username || messages.length === 0) return
    supabase
      .from('chat_reads')
      .upsert({ username, last_read_at: new Date().toISOString() }, { onConflict: 'username' })
      .then(() => {})
  }, [username, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const messageById = useMemo(() => {
    const map = new Map<string, ChatMessage>()
    for (const m of messages) map.set(m.id, m)
    return map
  }, [messages])

  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, MessageReaction[]>()
    for (const r of reactions) {
      const list = map.get(r.message_id) ?? []
      list.push(r)
      map.set(r.message_id, list)
    }
    return map
  }, [reactions])

  const pinnedMessage = messages.filter((m) => m.pinned && !m.deleted).at(-1)

  const otherUsersLastRead = useMemo(() => {
    let max = ''
    for (const r of reads) {
      if (r.username !== username && r.last_read_at > max) max = r.last_read_at
    }
    return max
  }, [reads, username])

  const visibleMessages = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return messages
    const q = searchQuery.trim().toLowerCase()
    return messages.filter((m) => !m.deleted && m.content.toLowerCase().includes(q))
  }, [messages, showSearch, searchQuery])

  async function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setError('حجم الملف كبير أوي (الحد الأقصى 8MB).')
      return
    }
    setUploadingAttachment(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('chat-media').upload(path, file)
    if (uploadErr) {
      setError('تعذر رفع المرفق.')
      setUploadingAttachment(false)
      return
    }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path)
    setAttachment({ url: data.publicUrl, type: file.type === 'image/gif' ? 'gif' : 'image' })
    setUploadingAttachment(false)
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!username) return
    if (!draft.trim() && !attachment) return

    if (editingId) {
      const { data: updated, error: editErr } = await supabase
        .from('messages')
        .update({ content: draft.trim(), edited_at: new Date().toISOString() })
        .eq('id', editingId)
        .eq('username', username)
        .select()
        .single()
      if (editErr) {
        setError('تعذر تعديل الرسالة.')
      } else if (updated) {
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? (updated as ChatMessage) : m)))
      }
      setEditingId(null)
      setDraft('')
      return
    }

    const content = draft.trim()
    setDraft('')
    const attachmentToSend = attachment
    setAttachment(null)
    setTyping(false)
    const pendingReplyTo = replyTo?.id ?? null
    setReplyTo(null)

    const { data: sent, error: sendErr } = await supabase
      .from('messages')
      .insert({
        username,
        content,
        reply_to_id: pendingReplyTo,
        attachment_url: attachmentToSend?.url ?? null,
        attachment_type: attachmentToSend?.type ?? null,
      })
      .select()
      .single()

    if (sendErr) {
      setError('تعذر إرسال الرسالة.')
    } else if (sent) {
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent as ChatMessage]))
    }
  }

  function startEdit(m: ChatMessage) {
    setEditingId(m.id)
    setDraft(m.content)
    setReplyTo(null)
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!username) return
    const existing = reactions.find((r) => r.message_id === messageId && r.username === username)
    if (existing && existing.emoji === emoji) {
      setReactions((prev) => prev.filter((r) => !(r.message_id === messageId && r.username === username)))
      await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('username', username)
    } else {
      setReactions((prev) => [
        ...prev.filter((r) => !(r.message_id === messageId && r.username === username)),
        { message_id: messageId, username, emoji, created_at: new Date().toISOString() },
      ])
      await supabase
        .from('message_reactions')
        .upsert({ message_id: messageId, username, emoji }, { onConflict: 'message_id,username' })
    }
    setReactionPickerFor(null)
  }

  async function deleteMessage(m: ChatMessage) {
    if (!username) return
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === m.id ? { ...msg, deleted: true, content: '', attachment_url: null, attachment_type: null } : msg,
      ),
    )
    await supabase
      .from('messages')
      .update({ deleted: true, content: '', attachment_url: null, attachment_type: null })
      .eq('id', m.id)
      .eq('username', username)
  }

  async function togglePin(m: ChatMessage) {
    setMessages((prev) => prev.map((msg) => (msg.id === m.id ? { ...msg, pinned: !msg.pinned } : msg)))
    await supabase.from('messages').update({ pinned: !m.pinned }).eq('id', m.id)
  }

  const typingOthers = [...typingUsers].filter((u) => u !== username)

  if (!isReady) {
    return (
      <div className="chat-shell" data-theme={theme}>
        <AccessGate
          onBack={onBack}
          onSuccess={(name, avatar) => {
            setUsername(name)
            setAvatarUrl(avatar)
          }}
        />
      </div>
    )
  }

  return (
    <div className="chat-shell" data-theme={theme}>
      <header className="chat-header">
        <button type="button" className="chat-back" onClick={onBack}>
          <ArrowRight size={16} strokeWidth={2.5} /> رجوع
        </button>
        <div className="chat-header-title">
          <h2>NULLPOINT</h2>
          <span className="chat-live-dot" aria-hidden="true" />
          <span className="chat-online-count">{onlineUsers.size} متصل الآن</span>
        </div>
        <div className="chat-header-actions">
          <button type="button" className="chat-icon-btn" title="بحث" onClick={() => setShowSearch((v) => !v)}>
            <Search size={17} />
          </button>
          <button type="button" className="chat-icon-btn" title="الثيمات" onClick={() => setShowThemes((v) => !v)}>
            <Palette size={17} />
          </button>
          <button type="button" className="chat-me" onClick={() => setShowSettings(true)}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={username ?? ''} className="chat-avatar-sm" />
            ) : (
              <span className="chat-avatar-sm chat-avatar-fallback">{initials(username ?? '?')}</span>
            )}
            <span>{username}</span>
            {onlineUsers.has(username ?? '') && <span className="chat-online-dot" />}
          </button>
        </div>
      </header>

      {showThemes && (
        <div className="chat-theme-row">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chat-theme-swatch${theme === t.id ? ' chat-theme-swatch-active' : ''}`}
              style={{ background: t.swatch }}
              onClick={() => setTheme(t.id)}
              title={t.label}
            >
              {theme === t.id ? <Check size={14} color="#14342b" /> : ''}
            </button>
          ))}
        </div>
      )}

      {showSearch && (
        <div className="chat-search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الرسائل…"
            autoFocus
          />
        </div>
      )}

      {pinnedMessage && !showSearch && (
        <div className="chat-pinned-banner">
          <Pin size={14} />
          <span className="chat-pinned-name">{pinnedMessage.username}:</span>{' '}
          <span className="chat-pinned-text">{pinnedMessage.content || 'مرفق'}</span>
        </div>
      )}

      {error && <p className="chat-error">{error}</p>}

      <div className="chat-messages">
        {loading ? (
          <p className="chat-loading">بيتحمّل الشات…</p>
        ) : visibleMessages.length === 0 ? (
          <p className="chat-loading">
            {showSearch && searchQuery ? 'مفيش نتائج' : 'لسه مفيش رسائل، ابدأ أول واحدة!'}
          </p>
        ) : (
          visibleMessages.map((m, index) => {
            const isMine = m.username === username
            const profile = profiles[m.username]
            const repliedMsg = m.reply_to_id ? messageById.get(m.reply_to_id) : null
            const msgReactions = reactionsByMessage.get(m.id) ?? []
            const reactionCounts = new Map<string, number>()
            for (const r of msgReactions) reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) ?? 0) + 1)
            const myReaction = msgReactions.find((r) => r.username === username)?.emoji
            const isSeen = isMine && !!otherUsersLastRead && otherUsersLastRead >= m.created_at

            const prev = visibleMessages[index - 1]
            const isGroupStart =
              !prev ||
              prev.username !== m.username ||
              new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > GROUP_WINDOW_MS

            return (
              <div
                key={m.id}
                className={`chat-bubble-row${isMine ? ' chat-bubble-row-mine' : ''}${isGroupStart ? '' : ' chat-bubble-row-grouped'}`}
              >
                {isGroupStart ? (
                  profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={m.username} className="chat-avatar-sm" />
                  ) : (
                    <span className="chat-avatar-sm chat-avatar-fallback">{initials(m.username)}</span>
                  )
                ) : (
                  <span className="chat-avatar-spacer" />
                )}

                <div className="chat-bubble-col">
                  <div className={`chat-bubble${isMine ? ' chat-bubble-mine' : ''}`}>
                    {isGroupStart && <span className="chat-bubble-name">{m.username}</span>}

                    {repliedMsg && (
                      <div className="chat-reply-quote">
                        <strong>{repliedMsg.username}</strong>
                        <span>{repliedMsg.content || 'مرفق'}</span>
                      </div>
                    )}

                    {m.deleted ? (
                      <p className="chat-deleted-text">
                        <Trash2 size={13} /> تم حذف الرسالة
                      </p>
                    ) : (
                      <>
                        {m.attachment_url && (
                          <img src={m.attachment_url} alt="مرفق" className="chat-attachment-img" />
                        )}
                        {m.content && <p>{m.content}</p>}
                      </>
                    )}

                    <time>
                      {new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      {m.edited_at && ' · معدّلة'}
                      {isMine && (
                        <span className="chat-receipt">
                          {isSeen ? <CheckCheck size={13} /> : <Check size={13} />}
                        </span>
                      )}
                    </time>

                    {msgReactions.length > 0 && (
                      <div className="chat-reactions-row">
                        {[...reactionCounts.entries()].map(([emoji, count]) => (
                          <button
                            key={emoji}
                            type="button"
                            className={`chat-reaction-chip${myReaction === emoji ? ' chat-reaction-chip-mine' : ''}`}
                            onClick={() => toggleReaction(m.id, emoji)}
                          >
                            {emoji} {count}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!m.deleted && (
                    <div className="chat-bubble-actions">
                      <button
                        type="button"
                        title="رياكشن"
                        onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                      >
                        <Smile size={14} />
                      </button>
                      <button
                        type="button"
                        title="رد"
                        onClick={() => {
                          setReplyTo(m)
                          setEditingId(null)
                        }}
                      >
                        <Reply size={14} />
                      </button>
                      {isMine && (
                        <>
                          <button type="button" title="تعديل" onClick={() => startEdit(m)}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" title="حذف" onClick={() => deleteMessage(m)}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <button type="button" title={m.pinned ? 'إلغاء التثبيت' : 'تثبيت'} onClick={() => togglePin(m)}>
                        {m.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                    </div>
                  )}

                  {reactionPickerFor === m.id && (
                    <div className="chat-emoji-picker">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => toggleReaction(m.id, emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {typingOthers.length > 0 && (
        <p className="chat-typing-indicator">
          {typingOthers.join('، ')} {typingOthers.length === 1 ? 'بيكتب' : 'بيكتبوا'}
          <span className="chat-typing-dots">
            <span />
            <span />
            <span />
          </span>
        </p>
      )}

      {(replyTo || editingId) && (
        <div className="chat-composer-context">
          <span>
            {editingId ? (
              <>
                <Pencil size={13} /> بتعدّل رسالة
              </>
            ) : (
              <>
                <Reply size={13} /> بترد على {replyTo?.username}
              </>
            )}
            {replyTo && <em>{replyTo.content}</em>}
          </span>
          <button
            type="button"
            onClick={() => {
              setReplyTo(null)
              setEditingId(null)
              setDraft('')
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {attachment && (
        <div className="chat-composer-context">
          <span>
            <ImageIcon size={13} /> صورة مرفقة
          </span>
          <button type="button" onClick={() => setAttachment(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      <form className="chat-input-row" onSubmit={handleSend}>
        <label className="chat-attach-btn" title="أرفق صورة أو GIF">
          {uploadingAttachment ? <span className="chat-mini-spinner" /> : <Paperclip size={18} />}
          <input type="file" accept="image/*,image/gif" onChange={handleAttachmentChange} hidden />
        </label>
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setTyping(e.target.value.length > 0)
          }}
          placeholder="اكتب رسالة…"
          maxLength={2000}
        />
        <button type="submit" className="chat-send-btn" disabled={!draft.trim() && !attachment} aria-label={editingId ? 'حفظ' : 'إرسال'}>
          {editingId ? <Check size={18} /> : <Send size={17} />}
        </button>
      </form>

      {showSettings && (
        <SettingsModal
          currentUsername={username ?? ''}
          currentAvatar={avatarUrl}
          onClose={() => setShowSettings(false)}
          onSaved={(name, avatar) => {
            setUsername(name)
            setAvatarUrl(avatar)
            setShowSettings(false)
          }}
          onLogout={() => {
            clearIdentity()
            setShowSettings(false)
          }}
        />
      )}
    </div>
  )
}

function AccessGate({
  onBack,
  onSuccess,
}: {
  onBack: () => void
  onSuccess: (username: string, avatarUrl: string | null) => void
}) {
  const [step, setStep] = useState<'name' | 'password' | 'new'>('name')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [protectWithPassword, setProtectWithPassword] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('اكتب يوزرنيم الأول.')
      return
    }
    if (trimmed.length > 24) {
      setError('اليوزرنيم لازم يكون أقصر من 24 حرف.')
      return
    }
    setError(null)
    setBusy(true)
    const { data, error: rpcErr } = await supabase.rpc('username_has_password', { p_username: trimmed })
    setBusy(false)

    if (rpcErr) {
      setError('حصل خطأ، جرب تاني.')
      return
    }
    setStep(data === null ? 'new' : 'password')
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const trimmed = name.trim()
    const { data: ok, error: rpcErr } = await supabase.rpc('verify_username_password', {
      p_username: trimmed,
      p_password: password || null,
    })
    setBusy(false)

    if (rpcErr || !ok) {
      setError('الباسورد أو الكلمة السرية غلط.')
      return
    }

    const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('username', trimmed).maybeSingle()
    onSuccess(trimmed, profile?.avatar_url ?? null)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير أوي (الحد الأقصى 5MB).')
      return
    }
    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadErr) {
      setError('تعذر رفع الصورة.')
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatar(data.publicUrl)
    setUploading(false)
  }

  async function handleClaim(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const trimmed = name.trim()
    const { error: claimErr } = await supabase.rpc('claim_username', {
      p_username: trimmed,
      p_avatar_url: avatar,
      p_password: protectWithPassword ? password || null : null,
    })
    setBusy(false)

    if (claimErr) {
      if (claimErr.message?.includes('username_taken')) {
        setError('اليوزرنيم ده اتاخد لسه، جرب تاني.')
        setStep('name')
      } else {
        setError('حصل خطأ غير متوقع، جرب تاني كمان شوية.')
      }
      return
    }
    onSuccess(trimmed, avatar)
  }

  return (
    <div className="chat-modal-backdrop">
      <div className="chat-modal">
        <h3>NULLPOINT</h3>
        <p className="chat-modal-copy">
          {step === 'name' && 'منظومة دردشة مستقلة، اختار يوزرنيمك عشان تدخل.'}
          {step === 'password' && 'اليوزرنيم ده محمي، اكتب الباسورد أو الكلمة السرية.'}
          {step === 'new' && 'اليوزرنيم ده متاح! تقدر تحميه بباسورد أو كلمة سرية زي اسم لون.'}
        </p>

        {step === 'name' && (
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اليوزرنيم بتاعك"
              className="chat-username-input"
              autoFocus
            />
            {error && <p className="chat-error">{error}</p>}
            <div className="chat-modal-actions">
              <button type="button" className="chat-secondary-btn" onClick={onBack}>إلغاء</button>
              <button type="submit" disabled={busy}>{busy ? 'بيتحقق…' : 'متابعة'}</button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="الباسورد أو الكلمة السرية"
              className="chat-username-input"
              autoFocus
            />
            {error && <p className="chat-error">{error}</p>}
            <div className="chat-modal-actions">
              <button type="button" className="chat-secondary-btn" onClick={() => { setStep('name'); setPassword(''); setError(null) }}>
                رجوع
              </button>
              <button type="submit" disabled={busy}>{busy ? 'بيتحقق…' : 'دخول'}</button>
            </div>
          </form>
        )}

        {step === 'new' && (
          <form onSubmit={handleClaim}>
            <label className="chat-avatar-picker">
              {avatar ? (
                <img src={avatar} alt="avatar preview" />
              ) : (
                <span className="chat-avatar-fallback chat-avatar-lg">{initials(name || '؟')}</span>
              )}
              <input type="file" accept="image/*,image/gif" onChange={handleFileChange} hidden />
              <span className="chat-avatar-edit-label">{uploading ? 'بيترفع…' : 'اختار صورة أو GIF (اختياري)'}</span>
            </label>

            <label className="chat-checkbox-row">
              <input type="checkbox" checked={protectWithPassword} onChange={(e) => setProtectWithPassword(e.target.checked)} />
              احمِ اليوزرنيم ده بباسورد أو كلمة سرية
            </label>

            {protectWithPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="باسورد أو كلمة زي اسم لون"
                className="chat-username-input"
              />
            )}

            {error && <p className="chat-error">{error}</p>}

            <div className="chat-modal-actions">
              <button type="button" className="chat-secondary-btn" onClick={() => { setStep('name'); setError(null) }}>
                رجوع
              </button>
              <button type="submit" disabled={busy || uploading}>{busy ? 'بيتحفظ…' : 'ادخل الشات'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function SettingsModal({
  currentUsername,
  currentAvatar,
  onSaved,
  onClose,
  onLogout,
}: {
  currentUsername: string
  currentAvatar: string | null
  onSaved: (username: string, avatarUrl: string | null) => void
  onClose: () => void
  onLogout: () => void
}) {
  const [name, setName] = useState(currentUsername)
  const [avatar, setAvatar] = useState<string | null>(currentAvatar)
  const [currentPassword, setCurrentPassword] = useState('')
  const [wantsPasswordChange, setWantsPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير أوي (الحد الأقصى 5MB).')
      return
    }
    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadErr) {
      setError('تعذر رفع الصورة.')
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatar(data.publicUrl)
    setUploading(false)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('لازم يكون فيه يوزرنيم.')
      return
    }

    setSaving(true)
    setError(null)

    const { data: ok, error: verifyErr } = await supabase.rpc('verify_username_password', {
      p_username: currentUsername,
      p_password: currentPassword || null,
    })

    if (verifyErr || !ok) {
      setError('الباسورد الحالي غلط.')
      setSaving(false)
      return
    }

    const { error: updateErr } = await supabase.rpc('update_profile', {
      p_current_username: currentUsername,
      p_new_username: trimmed,
      p_avatar_url: avatar,
      p_new_password: wantsPasswordChange ? newPassword || null : null,
      p_change_password: wantsPasswordChange,
    })

    setSaving(false)

    if (updateErr) {
      if (updateErr.message?.includes('username_taken')) {
        setError('اليوزرنيم الجديد ده متاخد بالفعل.')
      } else {
        setError('حصل خطأ غير متوقع، جرب تاني كمان شوية.')
      }
      return
    }

    onSaved(trimmed, avatar)
  }

  return (
    <div className="chat-modal-backdrop">
      <div className="chat-modal">
        <h3>إعدادات الحساب</h3>
        <p className="chat-modal-copy">غيّر اليوزرنيم أو الصورة أو الباسورد وقت ما تحب.</p>

        <form onSubmit={handleSave}>
          <label className="chat-avatar-picker">
            {avatar ? (
              <img src={avatar} alt="avatar preview" />
            ) : (
              <span className="chat-avatar-fallback chat-avatar-lg">{initials(name || '؟')}</span>
            )}
            <input type="file" accept="image/*,image/gif" onChange={handleFileChange} hidden />
            <span className="chat-avatar-edit-label">{uploading ? 'بيترفع…' : 'غيّر الصورة (صورة أو GIF)'}</span>
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اليوزرنيم بتاعك"
            className="chat-username-input"
          />

          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="الباسورد الحالي (سيبه فاضي لو مش محدد باسورد)"
            className="chat-username-input"
          />

          <label className="chat-checkbox-row">
            <input type="checkbox" checked={wantsPasswordChange} onChange={(e) => setWantsPasswordChange(e.target.checked)} />
            غيّر الباسورد / الكلمة السرية
          </label>

          {wantsPasswordChange && (
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="باسورد جديد (سيبه فاضي عشان تشيل الحماية)"
              className="chat-username-input"
            />
          )}

          {error && <p className="chat-error">{error}</p>}

          <div className="chat-modal-actions">
            <button type="button" className="chat-secondary-btn" onClick={onLogout}>تسجيل خروج</button>
            <button type="button" className="chat-secondary-btn" onClick={onClose}>إلغاء</button>
            <button type="submit" disabled={saving || uploading}>{saving ? 'بيتحفظ…' : 'حفظ'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export type { ThemeId }
