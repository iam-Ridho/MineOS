# MineOS Dashboard — Minggu ke-1 Setup

Boilerplate Next.js 14 untuk project MineOS Dashboard (Gilang — Frontend Web).

---

## 🚀 Cara Mulai

```bash
# 1. Install dependencies
npm install

# 2. Salin env template dan isi nilainya
cp .env.local .env.local.backup
# Buka .env.local dan isi token dari Ridho + Cesium Ion

# 3. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan redirect ke `/dashboard`.

---

## 📁 Struktur Folder

```
src/
├── app/
│   ├── dashboard/       ✅ Must Have — W2
│   ├── agents/          ✅ Must Have — W2-W3 (koordinasi Arya)
│   ├── digital-twin/    ✅ Must Have — W3 (CesiumJS)
│   ├── analytics/       ✅ Must Have — W3 (koordinasi Arya)
│   └── llm-report/      ⚡ Should Have — W4
├── components/
│   ├── ui/              Komponen dasar (Button, Card, Badge)
│   ├── layout/          Sidebar, Navbar
│   ├── map/             CesiumJS wrapper
│   └── charts/          Recharts wrapper
├── lib/
│   ├── api/
│   │   ├── supabase.ts  Supabase client
│   │   └── mock-data.ts Data dummy untuk dev
│   ├── hooks/           Custom React hooks
│   └── utils/           Helper functions
└── styles/
    └── globals.css
```

---

## ⚠️ Hal Kritis W1

### 1. CesiumJS Setup
`next.config.js` sudah dikonfigurasi untuk copy Cesium assets ke `public/`.
Daftar Cesium Ion token di https://ion.cesium.com (free tier) dan isi ke `.env.local`.

### 2. Environment Variables dari Ridho
Minta segera di W1:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`

Sementara belum dapat, set `NEXT_PUBLIC_USE_MOCK_DATA=true` dan gunakan `mock-data.ts`.

### 3. Koordinasi dengan Arya
Halaman `/agents` dan `/analytics` dikerjakan bersama Arya.
Tentukan pembagian komponen sebelum mulai W2.

---

## 🗺️ Koordinat Simulasi Kideco
- **Lokasi**: Sangatta, Kaltim
- **Lat**: `0.5167`, **Lon**: `117.4167`
- Gunakan koordinat ini untuk demo CesiumJS di `/digital-twin`

---

## 📦 Tech Stack

| Library | Kegunaan |
|---------|---------|
| Next.js 14 | Framework (App Router) |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Supabase JS | Database client |
| CesiumJS + Resium | 3D map digital twin |
| Recharts | Chart produksi & analytics |
| Lucide React | Icons |
