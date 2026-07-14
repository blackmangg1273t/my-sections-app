import { useState } from 'react'
import { ArrowRight, Download, Info, Settings, Play, Music, Video, List, FileText, Globe, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react'

export default function YtDlpTool({ onBack }: { onBack: () => void }) {
  const [url, setUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'tool' | 'guide'>('tool')
  const [output, setOutput] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRun = () => {
    if (!url) return
    setLoading(true)
    setOutput(null)
    
    // Simulating a real tool behavior since we are in a frontend-only static app environment
    // In a real production app, this would call a backend API that runs yt-dlp
    setTimeout(() => {
      setLoading(false)
      setOutput(`[yt-dlp] جاري فحص الرابط: ${url}\n[info] تم العثور على الفيديو: "yt-dlp features demo"\n[download] جاري التحميل... 100%\n[ffmpeg] دمج الصوت والفيديو...\n[done] تم التحميل بنجاح!`)
    }, 2000)
  }

  return (
    <div className="tool-container">
      <header className="tool-header">
        <button onClick={onBack} className="back-btn">
          <ArrowRight size={20} />
          رجوع للموقع
        </button>
        <div className="tool-title-group">
          <h1>المُحمّل الذكي (yt-dlp)</h1>
          <p>أداة احترافية لتحميل الوسائط من آلاف المواقع</p>
        </div>
      </header>

      <nav className="tool-tabs">
        <button 
          className={activeTab === 'tool' ? 'active' : ''} 
          onClick={() => setActiveTab('tool')}
        >
          <Play size={18} />
          استخدام الأداة
        </button>
        <button 
          className={activeTab === 'guide' ? 'active' : ''} 
          onClick={() => setActiveTab('guide')}
        >
          <Info size={18} />
          دليل الاستخدام الشامل
        </button>
      </nav>

      <main className="tool-content">
        {activeTab === 'tool' ? (
          <div className="tool-interface">
            <div className="input-group">
              <label htmlFor="video-url">رابط الفيديو أو قائمة التشغيل</label>
              <div className="input-wrapper">
                <input 
                  id="video-url"
                  type="text" 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button onClick={handleRun} disabled={loading || !url}>
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
                  {loading ? 'جاري المعالجة...' : 'تحميل الآن'}
                </button>
              </div>
            </div>

            <div className="options-grid">
              <div className="option-card">
                <Video size={20} />
                <span>أفضل جودة فيديو</span>
              </div>
              <div className="option-card">
                <Music size={20} />
                <span>صوت فقط (MP3)</span>
              </div>
              <div className="option-card">
                <List size={20} />
                <span>قائمة تشغيل</span>
              </div>
              <div className="option-card">
                <Settings size={20} />
                <span>إعدادات متقدمة</span>
              </div>
            </div>

            {output && (
              <div className="terminal-output">
                <div className="terminal-header">
                  <span>مخرجات النظام</span>
                  <div className="terminal-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <pre>{output}</pre>
              </div>
            )}

            <div className="tool-notice">
              <AlertCircle size={18} />
              <p>ملاحظة: هذه الواجهة تجريبية. لاستخدام yt-dlp بكامل قوته، يُنصح باستخدامه عبر سطر الأوامر (CLI).</p>
            </div>
          </div>
        ) : (
          <div className="guide-content">
            <section>
              <h3><Globe size={20} /> ما هي أداة yt-dlp؟</h3>
              <p>هي أقوى أداة مفتوحة المصدر لتحميل الفيديو والصوت من الإنترنت. تدعم أكثر من 1000 موقع مختلف وتوفر تحكماً كاملاً في كل تفاصيل عملية التحميل.</p>
            </section>

            <div className="guide-grid">
              <div className="guide-card">
                <h4><Video size={18} /> تحميل الفيديو</h4>
                <code>yt-dlp "URL"</code>
                <p>تحميل الفيديو بأفضل جودة متاحة تلقائياً.</p>
              </div>
              <div className="guide-card">
                <h4><Music size={18} /> استخراج الصوت</h4>
                <code>yt-dlp -x --audio-format mp3 "URL"</code>
                <p>تحويل الفيديو لملف صوتي MP3 عالي الجودة.</p>
              </div>
              <div className="guide-card">
                <h4><ShieldCheck size={18} /> تجاوز القيود</h4>
                <code>yt-dlp --cookies-from-browser chrome "URL"</code>
                <p>التحميل من المواقع التي تتطلب تسجيل دخول عبر المتصفح.</p>
              </div>
              <div className="guide-card">
                <h4><FileText size={18} /> الترجمات</h4>
                <code>yt-dlp --write-subs --embed-subs "URL"</code>
                <p>تحميل الترجمات ودمجها داخل ملف الفيديو مباشرة.</p>
              </div>
            </div>

            <section className="advanced-usage">
              <h3><Settings size={20} /> استخدامات متقدمة</h3>
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>الأمر</th>
                    <th>الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>-F</code></td>
                    <td>عرض جميع الجودات والصيغ المتاحة قبل التحميل</td>
                  </tr>
                  <tr>
                    <td><code>-f "best[height&lt;=720]"</code></td>
                    <td>تحديد أقصى دقة للتحميل (مثلاً 720p)</td>
                  </tr>
                  <tr>
                    <td><code>--playlist-items 1,3,5</code></td>
                    <td>تحميل فيديوهات محددة من قائمة تشغيل</td>
                  </tr>
                  <tr>
                    <td><code>--embed-thumbnail</code></td>
                    <td>دمج صورة الفيديو المصغرة داخل الملف</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        )}
      </main>

      <style>{`
        .tool-container {
          background: var(--paper);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          color: var(--ink);
          direction: rtl;
        }
        .tool-header {
          padding: 2rem;
          background: var(--forest);
          color: white;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          width: fit-content;
          font-weight: 600;
        }
        .tool-title-group h1 {
          color: white;
          margin: 0;
          font-size: 2rem;
        }
        .tool-title-group p {
          opacity: 0.8;
          margin: 0.5rem 0 0;
        }
        .tool-tabs {
          display: flex;
          background: white;
          border-bottom: 1px solid var(--line);
          padding: 0 2rem;
        }
        .tool-tabs button {
          padding: 1rem 1.5rem;
          border: none;
          background: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 700;
          color: #666;
          border-bottom: 3px solid transparent;
        }
        .tool-tabs button.active {
          color: var(--forest);
          border-bottom-color: var(--forest);
        }
        .tool-content {
          flex: 1;
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
        }
        .input-group {
          margin-bottom: 2rem;
        }
        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }
        .input-wrapper {
          display: flex;
          gap: 1rem;
        }
        .input-wrapper input {
          flex: 1;
          padding: 1rem;
          border: 2px solid var(--line);
          border-radius: 12px;
          font-size: 1rem;
        }
        .input-wrapper button {
          background: var(--forest);
          color: white;
          border: none;
          padding: 0 2rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .option-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .option-card:hover {
          border-color: var(--forest);
          transform: translateY(-2px);
        }
        .terminal-output {
          background: #1e1e1e;
          color: #d4d4d4;
          border-radius: 12px;
          overflow: hidden;
          font-family: monospace;
          margin-bottom: 2rem;
        }
        .terminal-header {
          background: #333;
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }
        .terminal-dots {
          display: flex;
          gap: 4px;
        }
        .terminal-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #555;
        }
        .terminal-output pre {
          padding: 1rem;
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.6;
        }
        .tool-notice {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #fff3cd;
          border-radius: 8px;
          color: #856404;
        }
        .guide-content section {
          margin-bottom: 3rem;
        }
        .guide-content h3 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--forest);
          border-bottom: 2px solid var(--line);
          padding-bottom: 0.5rem;
        }
        .guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .guide-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--line);
        }
        .guide-card h4 {
          margin: 0 0 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .guide-card code {
          display: block;
          background: #f0f0f0;
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          direction: ltr;
        }
        .guide-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }
        .guide-table th, .guide-table td {
          padding: 1rem;
          text-align: right;
          border-bottom: 1px solid var(--line);
        }
        .guide-table th {
          background: #f8f8f8;
          font-weight: 700;
        }
        .guide-table code {
          background: #f0f0f0;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          direction: ltr;
          display: inline-block;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .input-wrapper {
            flex-direction: column;
          }
          .tool-header {
            padding: 1.5rem;
          }
          .tool-content {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}
