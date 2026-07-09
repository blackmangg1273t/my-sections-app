import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase, type ChatMessage, type Profile } from '../lib/supabaseClient'
import { useLocalIdentity } from '../lib/useLocalIdentity'

type ProfilesByUsername = Record<string, Profile>

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase()
}

export default function Chat({ onBack }: { onBack: () => void }) {
  const { username, avatarUrl, setUsername, setAvatarUrl } = useLocalIdentity()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [profiles, setProfiles] = useState<ProfilesByUsername>({})
  const [draft, setDraft] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isReady = Boolean(username)

  // Load messages + profiles, then subscribe to realtime inserts
  useEffect(() => {
    if (!isReady) return

    let active = true

    async function load() {
      setLoading(true)
      const [{ data: msgs, error: msgErr }, { data: profs, error: profErr }] =
        await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(200),
          supabase.from('profiles').select('*'),
        ])

      if (!active) return

      if (msgErr || profErr) {
        setError('تعذر تحميل الرسائل. حاول تاني.')
      } else {
        setMessages(msgs ?? [])
        const map: ProfilesByUsername = {}
        for (const p of profs ?? []) map[p.username] = p
        setProfiles(map)
      }
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage])
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [isReady])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim() || !username) return
    const content = draft.trim()
    setDraft('')
    const { error: sendErr } = await supabase
      .from('messages')
      .insert({ username, content })
    if (sendErr) setError('تعذر إرسال الرسالة.')
  }

  if (!isReady) {
    return (
      <ProfileSetup
        onBack={onBack}
        onSaved={(name, avatar) => {
          setUsername(name)
          setAvatarUrl(avatar)
        }}
      />
    )
  }

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <button type="button" className="chat-back" onClick={onBack}>
          ← رجوع
        </button>
        <div className="chat-header-title">
          <h2>شات المشروع</h2>
          <span className="chat-live-dot" aria-hidden="true" />
        </div>
        <button
          type="button"
          className="chat-me"
          onClick={() => setShowSettings(true)}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={username ?? ''} className="chat-avatar-sm" />
          ) : (
            <span className="chat-avatar-sm chat-avatar-fallback">
              {initials(username ?? '?')}
            </span>
          )}
          <span>{username}</span>
        </button>
      </header>

      {error && <p className="chat-error">{error}</p>}

      <div className="chat-messages">
        {loading ? (
          <p className="chat-loading">بيتحمّل الشات…</p>
        ) : messages.length === 0 ? (
          <p className="chat-loading">لسه مفيش رسائل، ابدأ أول واحدة!</p>
        ) : (
          messages.map((m) => {
            const isMine = m.username === username
            const profile = profiles[m.username]
            return (
              <div
                key={m.id}
                className={`chat-bubble-row${isMine ? ' chat-bubble-row-mine' : ''}`}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={m.username}
                    className="chat-avatar-sm"
                  />
                ) : (
                  <span className="chat-avatar-sm chat-avatar-fallback">
                    {initials(m.username)}
                  </span>
                )}
                <div className={`chat-bubble${isMine ? ' chat-bubble-mine' : ''}`}>
                  <span className="chat-bubble-name">{m.username}</span>
                  <p>{m.content}</p>
                  <time>
                    {new Date(m.created_at).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="اكتب رسالة…"
          maxLength={2000}
        />
        <button type="submit" disabled={!draft.trim()}>
          إرسال
        </button>
      </form>

      {showSettings && (
        <ProfileSetup
          isEditing
          initialUsername={username ?? ''}
          initialAvatar={avatarUrl}
          onBack={() => setShowSettings(false)}
          onSaved={(name, avatar) => {
            setUsername(name)
            setAvatarUrl(avatar)
            setShowSettings(false)
          }}
        />
      )}
    </div>
  )
}

function ProfileSetup({
  onSaved,
  onBack,
  isEditing = false,
  initialUsername = '',
  initialAvatar = null,
}: {
  onSaved: (username: string, avatarUrl: string | null) => void
  onBack: () => void
  isEditing?: boolean
  initialUsername?: string
  initialAvatar?: string | null
}) {
  const [name, setName] = useState(initialUsername)
  const [avatar, setAvatar] = useState<string | null>(initialAvatar)
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

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

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
      setError('لازم تختار يوزرنيم.')
      return
    }
    if (trimmed.length > 24) {
      setError('اليوزرنيم لازم يكون أقصر من 24 حرف.')
      return
    }

    setSaving(true)
    setError(null)

    // Upsert-by-username: if changing username while editing, rename the
    // existing profile row; otherwise create/update the profile.
    if (isEditing && initialUsername && initialUsername !== trimmed) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', trimmed)
        .maybeSingle()

      if (existing) {
        setError('اليوزرنيم ده مستخدم بالفعل، اختار واحد تاني.')
        setSaving(false)
        return
      }

      const { error: renameErr } = await supabase
        .from('profiles')
        .update({ username: trimmed, avatar_url: avatar, updated_at: new Date().toISOString() })
        .eq('username', initialUsername)

      if (renameErr) {
        setError('تعذر حفظ التغييرات.')
        setSaving(false)
        return
      }
    } else {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(
          { username: trimmed, avatar_url: avatar, updated_at: new Date().toISOString() },
          { onConflict: 'username' },
        )

      if (upsertErr) {
        setError('اليوزرنيم ده مستخدم بالفعل، اختار واحد تاني.')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSaved(trimmed, avatar)
  }

  return (
    <div className="chat-modal-backdrop">
      <div className="chat-modal">
        <h3>{isEditing ? 'إعدادات البروفايل' : 'ادخل الشات'}</h3>
        <p className="chat-modal-copy">
          {isEditing
            ? 'غيّر اليوزرنيم أو الصورة وقت ما تحب.'
            : 'اختار يوزرنيم عشان تبدأ الدردشة، مفيش باسورد ولا تسجيل.'}
        </p>

        <form onSubmit={handleSave}>
          <label className="chat-avatar-picker">
            {avatar ? (
              <img src={avatar} alt="avatar preview" />
            ) : (
              <span className="chat-avatar-fallback chat-avatar-lg">
                {initials(name || '؟')}
              </span>
            )}
            <input
              type="file"
              accept="image/*,image/gif"
              onChange={handleFileChange}
              hidden
            />
            <span className="chat-avatar-edit-label">
              {uploading ? 'بيترفع…' : 'غيّر الصورة (صورة أو GIF)'}
            </span>
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اليوزرنيم بتاعك"
            className="chat-username-input"
          />

          {error && <p className="chat-error">{error}</p>}

          <div className="chat-modal-actions">
            <button type="button" className="chat-secondary-btn" onClick={onBack}>
              إلغاء
            </button>
            <button type="submit" disabled={saving || uploading}>
              {saving ? 'بيتحفظ…' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
