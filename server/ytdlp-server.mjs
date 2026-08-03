/**
 * سيرفر محلي يشغّل yt-dlp فعليًا ويخدم الواجهة.
 * التشغيل: npm run server   (ثم افتح الموقع وسيتصل تلقائيًا)
 */
import { createServer } from 'node:http'
import { spawn, execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const PORT = Number(process.env.YTDLP_PORT ?? 8787)
const DOWNLOAD_ROOT = process.env.YTDLP_OUT
  ? path.resolve(process.env.YTDLP_OUT)
  : path.join(os.homedir(), 'Downloads', 'ytdlp-web')

/** الأوامر المحتملة لـ yt-dlp، أول واحد يعمل يُستخدم */
const CANDIDATES = [
  ['yt-dlp', []],
  ['yt-dlp.exe', []],
  ['python3', ['-m', 'yt_dlp']],
  ['python', ['-m', 'yt_dlp']],
]

let binary = null
/** @type {Map<string, any>} */
const jobs = new Map()

function run(cmd, args, { timeout = 25_000 } = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
      resolve({ ok: !err, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }),
    )
  })
}

async function resolveBinary() {
  if (binary) return binary
  for (const [cmd, prefix] of CANDIDATES) {
    const res = await run(cmd, [...prefix, '--version'], { timeout: 15_000 })
    if (res.ok && res.stdout.trim()) {
      binary = { cmd, prefix, version: res.stdout.trim() }
      return binary
    }
  }
  return null
}

async function hasFfmpeg() {
  const res = await run('ffmpeg', ['-version'], { timeout: 10_000 })
  return res.ok
}

/** بناء وسائط yt-dlp من خيارات الواجهة (مصفوفة، بدون shell = بدون ثغرات إدخال) */
const BROWSERS = ['chrome', 'firefox', 'edge', 'safari', 'brave', 'opera', 'chromium', 'vivaldi']

/** ملفات تعريف المتصفح تُستخدم لتجاوز "أثبت أنك لست روبوت" */
function cookieArgs(browser) {
  return browser && BROWSERS.includes(browser) ? ['--cookies-from-browser', browser] : []
}

/**
 * بناء وسائط yt-dlp. `ffmpeg` مطلوب للدمج/التحويل/التضمين، فلو مش موجود
 * نتجاهل الخيارات المعتمدة عليه بدل ما التحميل كله يفشل في مرحلة المعالجة.
 */
function buildArgs(opts, outDir, ffmpeg = true) {
  const args = ['--newline', '--no-warnings', '--ignore-config', ...cookieArgs(opts.cookiesBrowser)]
  const skipped = []

  if (opts.mode === 'audio') {
    if (ffmpeg) {
      args.push('-x', '--audio-format', opts.audioFormat || 'mp3', '--audio-quality', '0')
    } else {
      // بدون ffmpeg لا يمكن استخراج/تحويل الصوت، فنجيب أفضل مسار صوتي جاهز
      args.push('-f', 'ba/b')
      skipped.push('تحويل الصوت')
    }
  } else {
    const h = opts.quality
    // الدمج يحتاج ffmpeg، فبدونه نطلب ملفًا واحدًا مدموجًا مسبقًا
    const merged = h === 'best' ? 'bv*+ba/b' : `bv*[height<=${h}]+ba/b[height<=${h}]/wv*+ba/w`
    const single = h === 'best' ? 'b' : `b[height<=${h}]/w`
    args.push('-f', ffmpeg ? merged : single)

    if (opts.container && opts.container !== 'auto') {
      if (ffmpeg) args.push('--merge-output-format', opts.container)
      else skipped.push('تغيير الحاوية')
    }
  }

  if (opts.subtitles) {
    args.push('--write-subs', '--write-auto-subs', '--sub-langs', opts.subLangs || 'ar,en')
    if (opts.mode !== 'audio' && ffmpeg) args.push('--embed-subs')
  }
  if (opts.thumbnail) {
    if (ffmpeg) args.push('--embed-thumbnail')
    else {
      args.push('--write-thumbnail')
      skipped.push('تضمين الصورة المصغّرة')
    }
  }
  if (opts.metadata) {
    if (ffmpeg) args.push('--embed-metadata')
    else skipped.push('تضمين البيانات الوصفية')
  }
  if (opts.sponsorblock && opts.mode !== 'audio') {
    if (ffmpeg) args.push('--sponsorblock-remove', 'sponsor,selfpromo,interaction')
    else skipped.push('تخطّي الإعلانات')
  }
  if (opts.section?.trim()) {
    if (ffmpeg) args.push('--download-sections', `*${opts.section.trim()}`)
    else skipped.push('المقطع الزمني')
  }
  args.push(opts.playlist ? '--yes-playlist' : '--no-playlist')

  args.push(
    '--progress-template',
    'V0PROG|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_estimate_str)s',
  )
  args.push('-P', outDir, '-o', '%(title).150B.%(ext)s')
  args.push('--', opts.url)
  return { args, skipped }
}

function isHttpUrl(value) {
  try {
    const u = new URL(String(value))
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > 1e6) throw new Error('body too large')
    chunks.push(c)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  })
  res.end(body)
}

/* ---------- المعلومات ---------- */

async function getInfo(url, cookiesBrowser) {
  const bin = await resolveBinary()
  if (!bin) throw new Error('yt-dlp غير مثبّت على الجهاز')

  const res = await run(
    bin.cmd,
    [
      ...bin.prefix,
      '-J',
      '--no-warnings',
      '--ignore-config',
      '--no-playlist',
      ...cookieArgs(cookiesBrowser),
      '--',
      url,
    ],
    { timeout: 90_000 },
  )
  if (!res.ok) {
    const reason = res.stderr.split('\n').filter(Boolean).pop() || 'تعذّر قراءة الرابط'
    throw new Error(reason.replace(/^ERROR:\s*/i, ''))
  }

  const info = JSON.parse(res.stdout)
  const heights = [
    ...new Set(
      (info.formats ?? [])
        .map((f) => f.height)
        .filter((h) => typeof h === 'number' && h > 0),
    ),
  ].sort((a, b) => b - a)

  return {
    id: info.id,
    title: info.title,
    uploader: info.uploader ?? info.channel ?? null,
    duration: info.duration ?? null,
    thumbnail: info.thumbnail ?? null,
    extractor: info.extractor_key ?? info.extractor ?? null,
    isLive: Boolean(info.is_live),
    heights,
  }
}

/* ---------- التحميل ---------- */

async function startJob(opts) {
  const bin = await resolveBinary()
  if (!bin) throw new Error('yt-dlp غير مثبّت على الجهاز')

  const id = randomUUID()
  const outDir = path.join(DOWNLOAD_ROOT, id)
  await fs.mkdir(outDir, { recursive: true })

  const ffmpeg = await hasFfmpeg()
  const { args, skipped } = buildArgs(opts, outDir, ffmpeg)

  const job = {
    id,
    outDir,
    status: 'running',
    percent: 0,
    speed: '',
    eta: '',
    total: '',
    stage: 'جاري التحضير…',
    error: null,
    notice: skipped.length ? `تم تجاهل (بدون ffmpeg): ${skipped.join('، ')}` : null,
    files: [],
    listeners: new Set(),
  }
  jobs.set(id, job)

  const child = spawn(bin.cmd, [...bin.prefix, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  job.child = child

  const emit = () => {
    const snapshot = JSON.stringify({
      percent: job.percent,
      speed: job.speed,
      eta: job.eta,
      total: job.total,
      stage: job.stage,
      status: job.status,
      error: job.error,
      notice: job.notice,
      files: job.files,
    })
    for (const res of job.listeners) res.write(`data: ${snapshot}\n\n`)
  }

  let buffer = ''
  const onChunk = (chunk) => {
    buffer += chunk.toString('utf8')
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('V0PROG|')) {
        const [, pct, speed, eta, total] = line.split('|')
        const value = Number.parseFloat(String(pct).replace('%', '').trim())
        if (Number.isFinite(value)) job.percent = value
        job.speed = (speed ?? '').trim()
        job.eta = (eta ?? '').trim()
        job.total = (total ?? '').trim()
        job.stage = 'جاري التحميل…'
      } else if (/\[Merger\]/.test(line)) {
        job.stage = 'دمج الفيديو والصوت…'
      } else if (/\[ExtractAudio\]/.test(line)) {
        job.stage = 'استخراج الصوت…'
      } else if (/\[EmbedSubtitle\]|\[Metadata\]|\[ThumbnailsConvertor\]/.test(line)) {
        job.stage = 'إضافة الترجمات والبيانات…'
      } else if (/^ERROR:/.test(line)) {
        job.error = line.replace(/^ERROR:\s*/, '')
      }
      emit()
    }
  }

  child.stdout.on('data', onChunk)
  child.stderr.on('data', onChunk)

  child.on('close', async (code) => {
    try {
      const entries = await fs.readdir(outDir, { withFileTypes: true })
      job.files = await Promise.all(
        entries
          .filter((e) => e.isFile())
          .map(async (e) => ({
            name: e.name,
            size: (await fs.stat(path.join(outDir, e.name))).size,
          })),
      )
    } catch {
      job.files = []
    }

    // لو الملف نزل فعليًا نعتبره ناجحًا حتى لو فشلت مرحلة المعالجة (ffmpeg مثلًا)
    if (job.files.length) {
      job.status = 'done'
      job.percent = 100
      job.stage = 'تم التحميل'
      if (code !== 0 && job.error) {
        job.notice = job.notice ? `${job.notice} · ${job.error}` : job.error
        job.error = null
      }
    } else {
      job.status = 'error'
      job.error = job.error ?? `توقف yt-dlp بالرمز ${code}`
      job.stage = 'فشل التحميل'
    }
    emit()
    for (const res of job.listeners) res.end()
    job.listeners.clear()
  })

  return id
}

/* ---------- التوجيه ---------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const route = url.pathname

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    return res.end()
  }

  try {
    if (route === '/api/health') {
      const bin = await resolveBinary()
      return json(res, 200, {
        ok: Boolean(bin),
        ytDlp: bin?.version ?? null,
        ffmpeg: await hasFfmpeg(),
        downloadRoot: DOWNLOAD_ROOT,
      })
    }

    if (route === '/api/info' && req.method === 'POST') {
      const body = await readBody(req)
      if (!isHttpUrl(body.url)) return json(res, 400, { error: 'رابط غير صالح' })
      return json(res, 200, await getInfo(body.url, body.cookiesBrowser))
    }

    if (route === '/api/download' && req.method === 'POST') {
      const body = await readBody(req)
      if (!isHttpUrl(body.url)) return json(res, 400, { error: 'رابط غير صالح' })
      return json(res, 200, { jobId: await startJob(body) })
    }

    if (route === '/api/progress') {
      const job = jobs.get(url.searchParams.get('id'))
      if (!job) return json(res, 404, { error: 'المهمة غير موجودة' })

      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
        'access-control-allow-origin': '*',
      })
      res.write(
        `data: ${JSON.stringify({
          percent: job.percent,
          speed: job.speed,
          eta: job.eta,
          total: job.total,
          stage: job.stage,
          status: job.status,
          error: job.error,
          files: job.files,
        })}\n\n`,
      )
      if (job.status === 'running') {
        job.listeners.add(res)
        req.on('close', () => job.listeners.delete(res))
      } else {
        res.end()
      }
      return
    }

    if (route === '/api/cancel' && req.method === 'POST') {
      const body = await readBody(req)
      const job = jobs.get(body.jobId)
      job?.child?.kill('SIGKILL')
      return json(res, 200, { ok: true })
    }

    if (route === '/api/file') {
      const job = jobs.get(url.searchParams.get('id'))
      const name = url.searchParams.get('name')
      if (!job || !name) return json(res, 404, { error: 'الملف غير موجود' })

      const target = path.join(job.outDir, path.basename(name))
      if (!target.startsWith(job.outDir)) return json(res, 400, { error: 'مسار غير مسموح' })

      const stat = await fs.stat(target).catch(() => null)
      if (!stat) return json(res, 404, { error: 'الملف غير موجود' })

      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': stat.size,
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(name))}`,
        'access-control-allow-origin': '*',
      })
      return createReadStream(target).pipe(res)
    }

    return json(res, 404, { error: 'مسار غير معروف' })
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : 'خطأ غير متوقع' })
  }
})

server.listen(PORT, () => {
  console.log(`[yt-dlp server] يعمل على http://localhost:${PORT}`)
  console.log(`[yt-dlp server] مجلد التحميل: ${DOWNLOAD_ROOT}`)
  resolveBinary().then((bin) => {
    console.log(bin ? `[yt-dlp server] yt-dlp ${bin.version}` : '[yt-dlp server] تحذير: yt-dlp غير مثبّت')
  })
})
