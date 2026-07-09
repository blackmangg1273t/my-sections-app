# My Sections App

موقع React بسيط لك وللأصدقاء. كل برومبت أو فكرة جديدة يمكن تحويلها إلى قسم مستقل داخل الموقع.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## البناء للنشر

```bash
npm run build
```

ينتج الأمر ملفات النشر داخل مجلد `dist`.

## إضافة قسم جديد

افتح `src/data/sections.ts` وأضف عنصرًا جديدًا داخل مصفوفة `sections`:

```ts
export const sections: SiteSection[] = [
  {
    id: 'first-section',
    title: 'عنوان القسم',
    description: 'وصف مختصر للقسم',
    content: 'محتوى القسم أو تفاصيل الفكرة.',
    createdAt: '2026-07-09',
  },
]
```

## النشر

يمكن نشر المشروع على Vercel أو Netlify أو GitHub Pages. الإعدادات الشائعة:

- Build command: `npm run build`
- Output directory: `dist`
