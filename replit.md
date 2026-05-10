# Braw

Kullanıcılar arasında gerçek zamanlı mesajlaşma deneyimi sunan Türkçe bir sohbet uygulaması.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API sunucusunu çalıştır (port 8080)
- `pnpm --filter @workspace/mesaj-uygulamasi run dev` — Frontend'i çalıştır
- `pnpm run typecheck` — Tüm paketleri typecheck et
- `pnpm run build` — Tüm paketleri derle
- `pnpm --filter @workspace/db run push` — DB şemasını uygula (yalnızca geliştirme)
- Codegen sonrası: `echo "export * from './generated/api/api';" > lib/api-zod/src/index.ts`
- Gerekli env: `DATABASE_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API codegen: Orval (OpenAPI spec'ten)
- Build: esbuild (CJS bundle)
- E-posta: nodemailer + Gmail SMTP

## Where things live

- `lib/api-spec/openapi.yaml` — API sözleşmesi (kaynak gerçeği)
- `lib/db/src/schema/` — Drizzle tablo şemaları (users, conversations, messages, groups, groupMembers, groupMessages)
- `artifacts/api-server/src/routes/` — Express rota işleyicileri (auth, admin, users, groups, storage...)
- `artifacts/api-server/src/lib/` — Yardımcı servisler (mailer, objectStorage, websocket)
- `artifacts/mesaj-uygulamasi/src/pages/` — React sayfaları
- `artifacts/mesaj-uygulamasi/src/contexts/` — auth-context, call-context
- `lib/api-client-react/src/generated/` — Üretilen React Query hook'ları
- `lib/api-zod/src/generated/api/api.ts` — Üretilen Zod şemaları

## Architecture decisions

- Auth: OTP e-posta doğrulama (Gmail SMTP), localStorage'da userId saklanır
- Admin panel: /admin route, tickType (blue/black/orange), ban/unban, mesaj görüntüleme
- WebSocket: /api/ws path, userId→WebSocket map, mesaj broadcast ve çağrı sinyalleme
- Karanlık tema varsayılan, mor (primary) renk paleti
- Mobil öncelikli (max-w-md), masaüstünde ortada görünür

## Auth

- POST /api/auth/send-otp — e-posta ile OTP gönder
- POST /api/auth/verify-otp — OTP doğrula, kullanıcı döner
- GET /api/auth/me/:id — token yenileme / oturum doğrulama
- Demo kullanıcı e-postaları: ahmet@braw.app, zeynep@braw.app, mehmet@braw.app vb.

## Admin

- /admin — admin paneli (tickType, ban, mesaj görüntüleme)
- Sahip: barandamci@icloud.com
- Tick tipleri: blue (mavi), black (siyah), orange (turuncu)

## User preferences

- Uygulama Türkçe
- Karanlık mod varsayılan
- Uygulama adı: Braw

## Gotchas

- Codegen sonrası `lib/api-zod/src/index.ts` şunu içermeli: `export * from './generated/api/api';`
- api-server'da `zod` (v3 main export) kullanılıyor, NOT `zod/v4` (esbuild subpath sorunu)
- DB push interaktif — unique constraint için SQL ile direkt uygula: `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;`

## Pointers

- `pnpm-workspace` skill'i için workspace yapısı, TypeScript kurulumu ve paket detayları
