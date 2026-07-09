import { sections } from './data/sections'

function App() {
  const hasSections = sections.length > 0

  return (
    <main className="app-shell">
      <header className="site-header" aria-label="رأس الموقع">
        <a className="brand" href="/" aria-label="my sections app">
          My Sections
        </a>
        <span className="status">{sections.length} أقسام</span>
      </header>

      <section className="intro" aria-labelledby="intro-title">
        <div>
          <p className="eyebrow">مساحة مشتركة للأفكار</p>
          <h1 id="intro-title">كل برومبت يتحول إلى قسم مستقل.</h1>
          <p className="intro-copy">
            الموقع جاهز لك وللأصدقاء. كل فكرة جديدة تظهر هنا كقسم منظم، مع
            ملخص سريع والنص الكامل للبرومبت عند الحاجة.
          </p>
        </div>
      </section>

      <section className="sections-area" aria-labelledby="sections-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">الأقسام</p>
            <h2 id="sections-title">مساحة الأقسام</h2>
          </div>
          <span className="counter">{sections.length}</span>
        </div>

        {hasSections ? (
          <div className="section-grid">
            {sections.map((section) => (
              <article className="section-card" key={section.id}>
                <div className="section-meta">
                  <time dateTime={section.createdAt}>{section.createdAt}</time>
                  <div className="tag-list" aria-label="وسوم القسم">
                    {section.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>

                <h3>{section.title}</h3>
                <p>{section.description}</p>

                <ul className="highlight-list">
                  {section.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>

                <details className="prompt-panel">
                  <summary>عرض البرومبت الكامل</summary>
                  <pre>{section.content}</pre>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-title">جاهز للقسم الأول</p>
            <p>
              عند إرسال أول برومبت، سيظهر هنا كقسم مستقل بعنوان ووصف ومحتوى.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
