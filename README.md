## MyReflection (SvelteKit)

Projekt oparty o SvelteKit, w fazie rozwijania UI dla aplikacji „MyReflection”. 
Frontend - Svelte 5, Tailwind 4, DaisyUI 5, FlowBite
Backend (w przygotowaniu) - Appwrite

## Technologie
- Svelte / SvelteKit
- Vite
- TypeScript
- Tailwind CSS + Flowbite / DaisyUI komponenty
- Vitest (testy jednostkowe) + Playwright (E2E)
- Adapter: Cloudflare (`@sveltejs/adapter-cloudflare`)

## Wymagania
- Node 18+ (zalecane LTS)
- pnpm / npm / yarn (przykłady używają pnpm)

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

## Struktura (skrót)
```
src/
	routes/       Strony i layouty SvelteKit
	lib/          Komponenty, logika kliencka, API client
static/         Pliki statyczne (favicon, obrazy)
e2e/            Testy Playwright
```

## Główne skrypty (package.json)
```
dev, build, preview, check, format, lint,
test:unit, test (łączy unit + e2e), test:e2e
```
