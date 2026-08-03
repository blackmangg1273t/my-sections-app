import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Loader2,
  Search,
  Square,
  Terminal,
  TriangleAlert,
} from 'lucide-react'

interface YtDlpToolProps {
  onBack: () => void
  purpose?: string
}

interface Health {
  ok: boolean
  ytDlp: string | null
  ffmpeg: boolean
  downloadRoot: string
}

interface Info {
  id: string
  title: string
  uploader: string | null
  duration: number | null
  thumbnail: string | null
  extractor: string | null
  isLive: boolean
  heights: number[]
}

interface Progress {
  percent: number
  speed: string
  eta: string
  total: string
  stage: string
  status: 'running' | 'done' | 'error'
  error: string | null
  notice: string | null
  files: { name: string; size: number }[]
}

const AUDIO_FORMATS = ['mp3', 'm4a', 'opus', 'flac', 'wav']

function formatDuration(seconds: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

export default function YtDlpTool({ onBack, purpose }: YtDlpToolProps) {
  const [health, setHealth] = useState<Health | null>(null)
  const [checking, setChecking] = useState(true)

  const [url, setUrl] = useState('')
  const [info, setInfo] = useState<Info | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'video' | 'audio'>('video')
  const [quality, setQuality] = useState<string>('best')
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [container, setContainer] = useState('auto')
  const [subtitles, setSubtitles] = useState(false)
  const [thumbnail, setThumbnail] = useState(false)
  const [metadata, setMetadata] = useState(true)
  const [sponsorblock, setSponsorblock] = useState(false)
  const [playlist, setPlaylist] = useState(false)
  const [section, setSection] = useState('')
  const [cookiesBrowser, setCookiesBrowser] = useState('')

  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [copied, setCopied] = useState(false)
  const streamRef = useRef<EventSource | null>(null)

  const checkHealth = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/health')
      setHealth(await res.json())
    } catch {
      setHealth(null)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  useEffect(() => () => streamRef.current?.close(), [])

  const fetchInfo = async () => {
    if (!url.trim()) return
    setLoadingInfo(true)
    setError(null)
    setInfo(null)
    setProgress(null)
    setJobId(null)
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), cookiesBrowser }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'تعذّر قراءة الرابط')
      setInfo(data)
      setQuality('best')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر الاتصال بالسيرفر المحلي')
    } finally {
      setLoadingInfo(false)
    }
  }

  const startDownload = async () => {
    setError(null)
    setProgress(null)
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          mode,
          quality,
          audioFormat,
          container,
          subtitles,
          thumbnail,
          metadata,
          sponsorblock,
          playlist,
          section,
          cookiesBrowser,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'تعذّر بدء التحميل')

      setJobId(data.jobId)
      streamRef.current?.close()
      const stream = new EventSource(`/api/progress?id=${data.jobId}`)
      streamRef.current = stream
      stream.onmessage = (event) => {
        const payload: Progress = JSON.parse(event.data)
        setProgress(payload)
        if (payload.status !== 'running') stream.close()
      }
      stream.onerror = () => stream.close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر بدء التحميل')
    }
  }

  const cancelDownload = async () => {
    if (!jobId) return
    await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobId }),
    })
  }

  const equivalentCommand = () => {
    const parts = ['yt-dlp']
    if (mode === 'audio') parts.push('-x', '--audio-format', audioFormat, '--audio-quality', '0')
    else {
      parts.push(
        '-f',
        quality === 'best' ? 'bv*+ba/b' : `bv*[height<=${quality}]+ba/b[height<=${quality}]`,
      )
      if (container !== 'auto') parts.push('--merge-output-format', container)
    }
    if (subtitles) parts.push('--write-subs', '--write-auto-subs', '--sub-langs', 'ar,en', '--embed-subs')
    if (thumbnail) parts.push('--embed-thumbnail')
    if (metadata) parts.push('--embed-metadata')
    if (sponsorblock) parts.push('--sponsorblock-remove', 'sponsor,selfpromo,interaction')
    if (section.trim()) parts.push('--download-sections', `*${section.trim()}`)
    parts.push(playlist ? '--yes-playlist' : '--no-playlist')
    parts.push(`"${url || 'URL'}"`)
    return parts.join(' ')
  }

  const copyCommand = () => {
    void navigator.clipboard.writeText(equivalentCommand())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const serverReady = Boolean(health?.ok)
  const busy = progress?.status === 'running'

  return (
    <div className="ytdlp">
      <header className="ytdlp-bar">
        <button type="button" className="ytdlp-back" onClick={onBack}>
          <ArrowRight className="w-4 h-4 rotate-180" aria-hidden="true" />
          <span>رجوع للأقسام</span>
        </button>
        <span className={`ytdlp-status ${serverReady ? 'is-on' : 'is-off'}`}>
          {checking ? 'جاري التحقق…' : serverReady ? `yt-dlp ${health?.ytDlp}` : 'السيرفر غير متصل'}
        </span>
      </header>

      <p className="tool-purpose-bar">{purpose ?? 'تنزيل فيديو وصوت من المواقع'}</p>

      <main className="ytdlp-body">
        {!checking && !serverReady && (
          <section className="ytdlp-panel ytdlp-panel--warn">
            <h2 className="ytdlp-panel-title">
              <Terminal className="w-5 h-5" aria-hidden="true" />
              شغّل السيرفر المحلي أولاً
            </h2>
            <p className="ytdlp-note">
              yt-dlp برنامج يعمل على الجهاز، فالمتصفح وحده لا يستطيع التحميل. شغّل هذا الأمر مرة واحدة
              في مجلد المشروع ثم اضغط إعادة المحاولة:
            </p>
            <code className="ytdlp-code">npm run server</code>
            <p className="ytdlp-note">
              يحتاج الجهاز <strong>yt-dlp</strong> و<strong>ffmpeg</strong> مثبّتين
              {' ('}
              <code>brew install yt-dlp ffmpeg</code>
              {' أو '}
              <code>pip install yt-dlp</code>
              {')'}.
            </p>
            <button type="button" className="ytdlp-btn ytdlp-btn--ghost" onClick={() => void checkHealth()}>
              إعادة المحاولة
            </button>
          </section>
        )}

        {serverReady && !health?.ffmpeg && (
          <p className="ytdlp-inline-warn">
            <TriangleAlert className="w-4 h-4" aria-hidden="true" />
            ffmpeg غير مثبّت: الدمج وتحويل الصوت قد يفشل.
          </p>
        )}

        <section className="ytdlp-panel">
          <label className="ytdlp-label" htmlFor="ytdlp-url">
            رابط الفيديو
          </label>
          <div className="ytdlp-row">
            <input
              id="ytdlp-url"
              type="url"
              dir="ltr"
              className="ytdlp-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) void fetchInfo()
              }}
            />
            <button
              type="button"
              className="ytdlp-btn"
              onClick={() => void fetchInfo()}
              disabled={!serverReady || loadingInfo || !url.trim()}
            >
              {loadingInfo ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4" aria-hidden="true" />
              )}
              جلب المعلومات
            </button>
          </div>
          <div>
            <label className="ytdlp-label" htmlFor="ytdlp-cookies">
              كوكيز المتصفح (لو طلب الموقع تسجيل الدخول أو "أثبت أنك لست روبوت")
            </label>
            <select
              id="ytdlp-cookies"
              className="ytdlp-input"
              value={cookiesBrowser}
              onChange={(event) => setCookiesBrowser(event.target.value)}
            >
              <option value="">بدون كوكيز</option>
              {['chrome', 'firefox', 'edge', 'safari', 'brave', 'opera', 'chromium', 'vivaldi'].map(
                (b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ),
              )}
            </select>
          </div>
          {error && <p className="ytdlp-error">{error}</p>}
        </section>

        {info && (
          <>
            <section className="ytdlp-panel ytdlp-preview">
              {info.thumbnail && (
                <img
                  className="ytdlp-thumb"
                  src={info.thumbnail}
                  alt={`الصورة المصغّرة لـ ${info.title}`}
                  crossOrigin="anonymous"
                />
              )}
              <div className="ytdlp-preview-meta">
                <h2 className="ytdlp-title">{info.title}</h2>
                <p className="ytdlp-sub">
                  {[info.uploader, formatDuration(info.duration), info.extractor]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {info.isLive && <p className="ytdlp-inline-warn">بثّ مباشر: سيسجّل حتى توقفه.</p>}
              </div>
            </section>

            <section className="ytdlp-panel">
              <div className="ytdlp-grid">
                <div>
                  <span className="ytdlp-label">النوع</span>
                  <div className="ytdlp-seg">
                    <button
                      type="button"
                      className={mode === 'video' ? 'is-active' : ''}
                      onClick={() => setMode('video')}
                    >
                      فيديو
                    </button>
                    <button
                      type="button"
                      className={mode === 'audio' ? 'is-active' : ''}
                      onClick={() => setMode('audio')}
                    >
                      صوت فقط
                    </button>
                  </div>
                </div>

                {mode === 'video' ? (
                  <>
                    <div>
                      <label className="ytdlp-label" htmlFor="ytdlp-quality">
                        الجودة
                      </label>
                      <select
                        id="ytdlp-quality"
                        className="ytdlp-input"
                        value={quality}
                        onChange={(event) => setQuality(event.target.value)}
                      >
                        <option value="best">أفضل جودة متاحة</option>
                        {info.heights.map((h) => (
                          <option key={h} value={String(h)}>
                            {h}p
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="ytdlp-label" htmlFor="ytdlp-container">
                        الحاوية
                      </label>
                      <select
                        id="ytdlp-container"
                        className="ytdlp-input"
                        value={container}
                        onChange={(event) => setContainer(event.target.value)}
                      >
                        <option value="auto">تلقائي</option>
                        <option value="mp4">mp4</option>
                        <option value="mkv">mkv</option>
                        <option value="webm">webm</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="ytdlp-label" htmlFor="ytdlp-audio">
                      صيغة الصوت
                    </label>
                    <select
                      id="ytdlp-audio"
                      className="ytdlp-input"
                      value={audioFormat}
                      onChange={(event) => setAudioFormat(event.target.value)}
                    >
                      {AUDIO_FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="ytdlp-label" htmlFor="ytdlp-section">
                    مقطع زمني (اختياري)
                  </label>
                  <input
                    id="ytdlp-section"
                    dir="ltr"
                    className="ytdlp-input"
                    placeholder="00:01:30-00:04:00"
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                  />
                </div>
              </div>

              <div className="ytdlp-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={subtitles}
                    onChange={(event) => setSubtitles(event.target.checked)}
                  />
                  الترجمات (ar, en)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={thumbnail}
                    onChange={(event) => setThumbnail(event.target.checked)}
                  />
                  الصورة المصغّرة
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={metadata}
                    onChange={(event) => setMetadata(event.target.checked)}
                  />
                  البيانات الوصفية
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={sponsorblock}
                    disabled={mode === 'audio'}
                    onChange={(event) => setSponsorblock(event.target.checked)}
                  />
                  تخطّي الإعلانات (SponsorBlock)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={playlist}
                    onChange={(event) => setPlaylist(event.target.checked)}
                  />
                  تحميل قائمة التشغيل كاملة
                </label>
              </div>

              <div className="ytdlp-actions">
                <button
                  type="button"
                  className="ytdlp-btn"
                  onClick={() => void startDownload()}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4" aria-hidden="true" />
                  )}
                  {busy ? 'جاري التحميل…' : 'ابدأ التحميل'}
                </button>
                {busy && (
                  <button type="button" className="ytdlp-btn ytdlp-btn--ghost" onClick={() => void cancelDownload()}>
                    <Square className="w-4 h-4" aria-hidden="true" />
                    إيقاف
                  </button>
                )}
                <button type="button" className="ytdlp-btn ytdlp-btn--ghost" onClick={copyCommand}>
                  {copied ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )}
                  {copied ? 'تم النسخ' : 'نسخ الأمر المكافئ'}
                </button>
              </div>
            </section>
          </>
        )}

        {progress && (
          <section className="ytdlp-panel">
            <div className="ytdlp-progress-head">
              <span>{progress.stage}</span>
              <span dir="ltr">{Math.round(progress.percent)}%</span>
            </div>
            <div
              className="ytdlp-progress"
              role="progressbar"
              aria-valuenow={Math.round(progress.percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${Math.min(progress.percent, 100)}%` }} />
            </div>
            <p className="ytdlp-sub" dir="ltr">
              {[progress.speed, progress.eta && `ETA ${progress.eta}`, progress.total]
                .filter(Boolean)
                .join('  ·  ')}
            </p>

            {progress.status === 'error' && <p className="ytdlp-error">{progress.error}</p>}

            {progress.notice && (
              <p className="ytdlp-inline-warn">
                <TriangleAlert className="w-4 h-4" aria-hidden="true" />
                {progress.notice}
              </p>
            )}

            {progress.status === 'done' && (
              <ul className="ytdlp-files">
                {progress.files.map((file) => (
                  <li key={file.name}>
                    <a
                      className="ytdlp-btn ytdlp-btn--ghost"
                      href={`/api/file?id=${jobId}&name=${encodeURIComponent(file.name)}`}
                      download
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      حفظ الملف
                    </a>
                    <span className="ytdlp-file-name" dir="ltr">
                      {file.name} <em>({formatSize(file.size)})</em>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {progress.status === 'done' && health?.downloadRoot && (
              <p className="ytdlp-note" dir="ltr">
                {health.downloadRoot}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
