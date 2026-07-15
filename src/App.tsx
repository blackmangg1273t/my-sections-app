import { useState } from 'react'
import { sections } from './data/sections'
import Chat from './components/Chat'
import YtDlpTool from './components/YtDlpTool'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [ytDlpOpen, setYtDlpOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  if (chatOpen) {
    return <Chat onBack={() => setChatOpen(false)} />
  }

  if (ytDlpOpen) {
    return <YtDlpTool onBack={() => setYtDlpOpen(false)} />
  }

  const selected = sections.find((s) => s.id === selectedId) ?? null
  const latest = [...sections].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]

  function selectSection(id: string) {
    setSelectedId(id)
    setNavOpen(false)
  }

  return (
    <div className="layout">
      <button
        type="button"
        className="nav-toggle"
        onClick={() => setNavOpen((v) => !v)}
        aria-expanded={navOpen}
      >
        {navOpen ? '✕ قفل القائمة' : '☰ الأقسام'}
      </button>

      {navOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="قفل القائمة"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside className={`sidebar${navOpen ? ' sidebar-open' : ''}`} aria-label="فهرس الأقسام">
        <button type="button" className="sidebar-brand" onClick={() => selectSection('')}>
          <span className="sidebar-brand-mark">MS</span>
          <span className="sidebar-brand-text">
            My Sections
            <em>فهرس البرومبتات</em>
          </span>
        </button>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-home-link${selectedId === null ? ' sidebar-item-active' : ''}`}
            onClick={() => selectSection('')}
          >
            الصفحة الرئيسية
          </button>

          <p className="sidebar-label">الفهرس · {sections.length}</p>

          <ol className="sidebar-list">
            {sections.map((section, index) => (
              <li key={section.id}>
                <button
                  type="button"
                  className={`sidebar-item${selectedId === section.id ? ' sidebar-item-active' : ''}`}
                  onClick={() => selectSection(section.id)}
                >
                  <span className="sidebar-index">{pad(index + 1)}</span>
                  <span className="sidebar-item-title">{section.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <main className="main-area">
        {!selected ? (
          <section className="welcome">
            <p className="eyebrow">أهلاً بيك</p>
            <h1>مساحة واحدة، لكل فكرة قسمها الخاص.</h1>
            <p className="welcome-copy">
              كل برومبت بتبعته بيتحول هنا لقسم مستقل: عنوان، وصف، ووسوم، والنص
              الكامل عند الحاجة. اختار قسم من الفهرس على الجنب عشان تبدأ.
            </p>

            <div className="welcome-stats">
              <div className="stat-card">
                <span className="stat-number">{pad(sections.length)}</span>
                <span className="stat-label">قسم مسجّل</span>
              </div>
              {latest && (
                <div className="stat-card">
                  <span className="stat-number">{latest.createdAt}</span>
                  <span className="stat-label">آخر إضافة — {latest.title}</span>
                </div>
              )}
            </div>

            {sections.length === 0 && (
              <div className="empty-state">
                <p className="empty-title">جاهز للقسم الأول</p>
                <p>عند إرسال أول برومبت، سيظهر هنا كقسم مستقل بعنوان ووصف ومحتوى.</p>
              </div>
            )}
          </section>
        ) : (
          <section className="section-detail" aria-labelledby="section-detail-title">
            <div className="section-detail-meta">
              <time dateTime={selected.createdAt}>{selected.createdAt}</time>
              <div className="tag-list" aria-label="وسوم القسم">
                {selected.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>

            <h1 id="section-detail-title">{selected.title}</h1>
            <p className="section-detail-desc">{selected.description}</p>

            {selected.id === 'secure-messaging-platform' && (
              <button type="button" className="chat-launch-btn" onClick={() => setChatOpen(true)}>
                افتح الشات المباشر ↗
              </button>
            )}

            {selected.id === 'universal-media-downloader' && (
              <button type="button" className="chat-launch-btn" onClick={() => setYtDlpOpen(true)}>
                افتح أداة التحميل ↗
              </button>
            )}

            <ul className="highlight-list">
              {selected.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>

            <div className="prompt-panel-direct">
              <h3 className="panel-label">المحتوى الكامل:</h3>
              <pre>{selected.content}</pre>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
