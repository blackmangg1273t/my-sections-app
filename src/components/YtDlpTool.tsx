import { useState } from 'react';
import { Copy, Settings, Info, ArrowRight } from 'lucide-react';

interface YtDlpToolProps {
  onBack: () => void;
}

export default function YtDlpTool({ onBack }: YtDlpToolProps) {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('best');
  const [audioOnly, setAudioOnly] = useState(false);
  const [subtitles, setSubtitles] = useState(false);
  const [thumbnail, setThumbnail] = useState(false);
  const [outputDir, setOutputDir] = useState('./downloads');
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [copied, setCopied] = useState(false);

  const generateCommand = () => {
    if (!url.trim()) {
      alert('الرجاء إدخال رابط الفيديو أولاً');
      return;
    }

    let cmd = 'yt-dlp';
    
    // إضافة خيارات الجودة
    if (format !== 'best') {
      cmd += ` -f ${format}`;
    }
    
    // صوت فقط
    if (audioOnly) {
      cmd += ' -x --audio-format mp3';
    }
    
    // ترجمات
    if (subtitles) {
      cmd += ' --write-sub --write-auto-sub --embed-subs';
    }
    
    // صورة مصغرة
    if (thumbnail) {
      cmd += ' --write-thumbnail --convert-thumbnails jpg';
    }
    
    // مجلد الإخراج
    cmd += ` -o "${outputDir}/%(title)s.%(ext)s"`;
    
    // إضافة الرابط
    cmd += ` "${url}"`;

    setGeneratedCommand(cmd);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (generatedCommand) {
      navigator.clipboard.writeText(generatedCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
          <span>رجوع للأقسام</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          🎥 أداة تحميل الفيديوهات
        </h1>
      </div>

      {/* Description */}
      <div className="text-center mb-8">
        <p className="text-gray-600">
          قم بتوليد أوامر yt-dlp مخصصة لتحميل الفيديوهات بجودة عالية
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid gap-6">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رابط الفيديو
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              dir="ltr"
            />
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              جودة التحميل
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={audioOnly}
            >
              <option value="best">أفضل جودة متاحة</option>
              <option value="1080">1080p Full HD</option>
              <option value="720">720p HD</option>
              <option value="480">480p</option>
              <option value="360">360p</option>
              <option value="audio">صوت فقط (MP3)</option>
            </select>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 space-x-reverse p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={audioOnly}
                onChange={(e) => {
                  setAudioOnly(e.target.checked);
                  if (e.target.checked) setFormat('audio');
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">🎵 استخراج الصوت فقط</span>
            </label>

            <label className="flex items-center space-x-3 space-x-reverse p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={subtitles}
                onChange={(e) => setSubtitles(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">📝 تضمين الترجمات</span>
            </label>

            <label className="flex items-center space-x-3 space-x-reverse p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={thumbnail}
                onChange={(e) => setThumbnail(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">🖼️ حفظ الصورة المصغرة</span>
            </label>
          </div>

          {/* Output Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مجلد الحفظ
            </label>
            <input
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="./downloads"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateCommand}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg"
          >
            🚀 توليد الأمر
          </button>
        </div>
      </div>

      {/* Generated Command */}
      {generatedCommand && (
        <div className="bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              الأمر المُولد
            </h3>
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'تم النسخ!' : 'نسخ'}
            </button>
          </div>
          <div className="bg-black rounded-lg p-4 overflow-x-auto">
            <code className="text-green-400 text-sm font-mono break-all">
              {generatedCommand}
            </code>
          </div>
          <div className="mt-4 p-4 bg-blue-900/30 rounded-lg border border-blue-800">
            <p className="text-blue-300 text-sm">
              💡 <strong>طريقة الاستخدام:</strong> انسخ الأمر أعلاه والصقه في终端 (Terminal) على جهازك بعد تثبيت yt-dlp
            </p>
          </div>
        </div>
      )}

      {/* Installation Guide */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Info className="w-6 h-6 text-blue-600" />
          دليل التثبيت والاستخدام
        </h2>
        
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">1️⃣ تثبيت yt-dlp</h3>
            <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm">
              <p className="mb-2"># لنظام Windows (باستخدام Chocolatey):</p>
              <code className="block bg-white p-2 rounded mb-2">choco install yt-dlp</code>
              <p className="mb-2"># لنظام macOS (باستخدام Homebrew):</p>
              <code className="block bg-white p-2 rounded mb-2">brew install yt-dlp</code>
              <p className="mb-2"># لنظام Linux:</p>
              <code className="block bg-white p-2 rounded">sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp</code>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">2️⃣ طريقة الاستخدام</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>أدخل رابط الفيديو في الحقل المخصص</li>
              <li>اختر الجودة والخيارات المطلوبة</li>
              <li>اضغط على "توليد الأمر"</li>
              <li>انسخ الأمر المُولد</li>
              <li>الصق الأمر في Terminal على جهازك واضغط Enter</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">3️⃣ ملاحظات مهمة</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>يجب تثبيت Python على جهازك لاستخدام yt-dlp</li>
              <li>الأداة تعمل على Windows وmacOS وLinux</li>
              <li>يمكنك تعديل مجلد الحفظ حسب رغبتك</li>
              <li>بعض المواقع قد تتطلب تسجيل الدخول</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
