import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase, type ChatMessage, type Profile } from '../lib/supabaseClient'
import { useLocalIdentity } from '../lib/useLocalIdentity'
import { useChatTheme, THEMES, type ThemeId } from '../lib/useChatTheme'

type ProfilesByUsername = Record<string, Profile>

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase()
}

export default function Chat({ onBack }: { onBack: () => void }) {
  const { username, avatarUrl, setUsername, setAvatarUrl, clearIdentity } =
    useLocalIdentity()
  const { theme, setTheme } = useChatTheme()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [profiles, setProfiles] = useState<ProfilesByUsername>({})
  const [draft, setDraft] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isReady = Boolean(username)

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
          supabase.from('profiles').select('id, username, avatar_url, created_at, updated_at'),
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
          ← رجوع
        </button>
        <div className="chat-header-title">
          <h2>NULLPOINT</h2>
          <span className="chat-live-dot" aria-hidden="true" />
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-icon-btn"
            title="الثيمات"
            onClick={() => setShowThemes((v) => !v)}
          >
            🎨
          </button>
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
              {theme === t.id ? '✓' : ''}
            </button>
          ))}
        </div>
      )}

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

/** First-run gate: choose a username, and if it's taken + password-protected,
 * ask for the password/secret word. If it's brand new, let the user claim it
 * and optionally protect it. */
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
    const { data, error: rpcErr } = await supabase.rpc('username_has_password', {
      p_username: trimmed,
    })
    setBusy(false)

    if (rpcErr) {
      setError('حصل خطأ، جرب تاني.')
      return
    }

    if (data === null) {
      setStep('new')
    } else {
      setStep('password')
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const trimmed = name.trim()
    const { data: ok, error: rpcErr } = await supabase.rpc(
      'verify_username_password',
      { p_username: trimmed, p_password: password || null },
    )
    setBusy(false)

    if (rpcErr || !ok) {
      setError('الباسورد أو الكلمة السرية غلط.')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('username', trimmed)
      .maybeSingle()

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
      setError('اليوزرنيم ده اتاخد لسه، جرب تاني.')
      setStep('name')
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
              <button type="button" className="chat-secondary-btn" onClick={onBack}>
                إلغاء
              </button>
              <button type="submit" disabled={busy}>
                {busy ? 'بيتحقق…' : 'متابعة'}
              </button>
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
              <button
                type="button"
                className="chat-secondary-btn"
                onClick={() => {
                  setStep('name')
                  setPassword('')
                  setError(null)
                }}
              >
                رجوع
              </button>
              <button type="submit" disabled={busy}>
                {busy ? 'بيتحقق…' : 'دخول'}
              </button>
            </div>
          </form>
        )}

        {step === 'new' && (
          <form onSubmit={handleClaim}>
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
                {uploading ? 'بيترفع…' : 'اختار صورة أو GIF (اختياري)'}
              </span>
            </label>

            <label className="chat-checkbox-row">
              <input
                type="checkbox"
                checked={protectWithPassword}
                onChange={(e) => setProtectWithPassword(e.target.checked)}
              />
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
              <button
                type="button"
                className="chat-secondary-btn"
                onClick={() => {
                  setStep('name')
                  setError(null)
                }}
              >
                رجوع
              </button>
              <button type="submit" disabled={busy || uploading}>
                {busy ? 'بيتحفظ…' : 'ادخل الشات'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/** Settings modal: change username / avatar / password. Requires the current
 * password (if one is set) before applying any change. */
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
      setError('لازم يكون فيه يوزرنيم.')
      return
    }

    setSaving(true)
    setError(null)

    const { data: ok, error: verifyErr } = await supabase.rpc(
      'verify_username_password',
      { p_username: currentUsername, p_password: currentPassword || null },
    )

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
      setError('اليوزرنيم الجديد ده متاخد بالفعل.')
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

          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="الباسورد الحالي (سيبه فاضي لو مش محدد باسورد)"
            className="chat-username-input"
          />

          <label className="chat-checkbox-row">
            <input
              type="checkbox"
              checked={wantsPasswordChange}
              onChange={(e) => setWantsPasswordChange(e.target.checked)}
            />
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
            <button type="button" className="chat-secondary-btn" onClick={onLogout}>
              تسجيل خروج
            </button>
            <button type="button" className="chat-secondary-btn" onClick={onClose}>
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

export type { ThemeId }
