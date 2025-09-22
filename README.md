## MyReflection (SvelteKit)

Projekt oparty o SvelteKit, w fazie rozwijania UI dla aplikacji „MyReflection”. 
Frontend - Svelte 5, Tailwind 4, DaisyUI 5, Flowbite
Backend - Appwrite, Sanity CMS

## Technologie
- Svelte / SvelteKit
- Vite
- TypeScript
- Tailwind CSS + Flowbite / DaisyUI komponenty
- Vitest (testy jednostkowe) + Playwright (E2E)
- Adapter: Cloudflare (`@sveltejs/adapter-cloudflare`)

## Wymagania
- Node 20 (zalecane LTS)
- pnpm

## Import env
- $env/static/public (build‑time, tylko PUBLIC_*)
- $env/dynamic/public (runtime, tylko PUBLIC_*)
- $env/static/private (build‑time, tylko na serwerze)
- $env/dynamic/private (runtime, tylko na serwerze)

## Instalacja
```sh
pnpm install
```

## Testy
Testy jednostkowe:
```sh
pnpm test:unit
```
Pełen zestaw (unit + e2e):
```sh
pnpm test
```
Testy e2e osobno:
```sh
pnpm test:e2e
```

## Deploy (Cloudflare)
Projekt ma skonfigurowany adapter Cloudflare. Przykład (jeśli używasz Wrangler):
```sh
pnpm build
pnpm wrangler deploy
```
(Sprawdź ustawienia w `wrangler.toml`).

## Struktura
```
svelte/
  ├── e2e/
  ├── src/
  │   ├── lib/
  │   │   ├── api/
  │   │   │   |── sanity/
  │   │   │   └── appwrite/
  │   │   ├── components/
  │   │   └── images/
  │   ├── routes/
  │   ├── types/
  │   ├── app.html
  │   └── global.css
  ├── static/
  ├── .env.local  
  ├── svelte.config.js
  ├── vite.config.ts
  └── package.json

## Główne skrypty (package.json)
```
dev, build, preview, check, format, lint,
test:unit, test (łączy unit + e2e), test:e2e
```

## Security notes

- The project includes a sample server endpoint at `GET /api/users` that lists Appwrite users. This endpoint uses a server-side Appwrite API key (`APPWRITE_API_KEY`) and must remain server-only. Do NOT expose `APPWRITE_API_KEY` to the browser or commit it to version control.
- In production, protect this endpoint (for example, restrict access to admin-only routes, require authentication/authorization, or run it behind a separate trusted backend). Returning user lists should be available only to trusted server-side code.
