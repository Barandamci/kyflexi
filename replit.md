# Mesaj Uygulaması

Kullanıcılar arasında gerçek zamanlı mesajlaşma deneyimi sunan Türkçe bir sohbet uygulaması.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API sunucusunu çalıştır (port 8080)
- `pnpm --filter @workspace/mesaj-uygulamasi run dev` — Frontend'i çalıştır
- `pnpm run typecheck` — Tüm paketleri typecheck et
- `pnpm run build` — Tüm paketleri derle
- `pnpm --filter @workspace/db run push` — DB şemasını uygula (yalnızca geliştirme)
- Codegen sonrası: `echo "export * from './generated/api';" > lib/api-zod/src/index.ts`
- Gerekli env: `DATABASE_URL` — Postgres bağlantı dizisi

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API codegen: Orval (OpenAPI spec'ten)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API sözleşmesi (kaynak gerçeği)
- `lib/db/src/schema/` — Drizzle tablo şemaları (users, conversations, messages)
- `artifacts/api-server/src/routes/` — Express rota işleyicileri
- `artifacts/mesaj-uygulamasi/src/pages/` — React sayfaları (home, chat, users)
- `lib/api-client-react/src/generated/` — Üretilen React Query hook'ları
- `lib/api-zod/src/generated/api.ts` — Üretilen Zod şemaları

## Architecture decisions

- Demo kullanıcısı: userId=1 (Ahmet Yılmaz) — tüm mesajlaşma bu kullanıcı üzerinden çalışır
- Orval codegen sonrası `lib/api-zod/src/index.ts` dosyası elle düzeltilmeli (sadece `generated/api` export etmeli)
- Karanlık tema varsayılan, mor (primary) renk paleti
- Mobil öncelikli (max-w-md), masaüstünde ortada görünür

## Product

- Konuşma listesi: Tüm sohbetler, son mesaj önizlemesi, okunmamış badge
- Sohbet ekranı: Mesaj balonları (gönderilen sağda mor, alınan solda koyu), gerçek zamanlı mesaj gönderme
- Kişiler sayfası: Tüm kullanıcılar, tek tıkla yeni sohbet başlatma
- Çevrimiçi durum göstergesi (online/away/offline)

## User preferences

- Uygulama Türkçe
- Karanlık mod varsayılan

## Gotchas

- Codegen sonrası `lib/api-zod/src/index.ts` şunu içermeli: `export * from './generated/api';`
- Orval zod client'ı `mode: "single"` ile tek dosyaya çıktı üretiyor
- `pnpm --filter @workspace/api-spec exec orval --config ./orval.config.ts` ile sadece orval çalıştırılabilir

## Pointers

- `pnpm-workspace` skill'i için workspace yapısı, TypeScript kurulumu ve paket detayları
