# Plan Aplikacji MyReflection

Dokument opisuje pełny plan implementacji webowej aplikacji terapeuty (MPA) opartej o SvelteKit (Svelte 5) + Appwrite (transakcyjne dane i auth) + Sanity (CMS treści), hostowanej na Cloudflare (adapter cloudflare). Celem jest połączenie części informacyjnej (oferta, blog, kontakt) z funkcjonalnym modułem rezerwacji wizyt i zarządzania kalendarzem pracy terapeuty.

---
## 1. Cele Biznesowe
1. Zwiększenie widoczności terapeuty (SEO, blog, oferta).
2. Umożliwienie klientom samodzielnej rezerwacji wizyt online w dostępnych terminach.
3. Redukcja kosztu operacyjnego (automatyzacja potwierdzeń, przypomnień, zarządzania grafikiem).
4. Bezpieczne zarządzanie danymi wizyt i notatkami (RODO / prywatność).
5. Fundament pod skalowanie (potencjalnie wielu terapeutów w przyszłości) i integracje płatności.

### KPI (przykłady)
- Konwersja: (liczba rezerwacji) / (unikalni odwiedzający stronę /umow-wizyte) ≥ 5%.
- Redukcja „no-show”: < 10% (po wdrożeniu przypomnień).
- Czas generacji dostępności (API): p95 < 250 ms (bez pierwszego cold startu / po cache).
- Błąd konfliktu slotu < 1% prób rezerwacji.

---
## 2. Zakres Funkcjonalny (Wysoki Poziom)
1. Strona publiczna (MPA):
	- Strona główna / o mnie / kwalifikacje / oferta / kontakt.
	- Blog (lista + wpis + kategorie / tagi).
2. System rezerwacji:
	- Podstrona /umow-wizyte z interaktywnym kalendarzem dostępności.
	- Wybór typu spotkania (czas trwania, cena) → wybór terminu → formularz danych klienta → (opcjonalna płatność) → utworzenie wizyty.
3. Panel administracyjny (przez Sanity Studio + dedykowane endpointy):
	- Zarządzanie ofertą (typy sesji, opisy, ceny, aktywność).
	- Blog (CRUD wpisów, kategorie, SEO). 
	- Grafiki pracy: presety (siatki godzin), przypisywanie presetów do miesięcy.
	- Blokady (wyjątki: urlopy, jednorazowe wyłączenia slotów).
	- Wizyty: lista / filtracja / szczegóły / akcje (potwierdź, anuluj, przesuń, archiwizuj, oznacz płatność, notatki, historia zmian).
4. Powiadomienia (MVP: e-mail; przyszłość: SMS).
5. Przypomnienia wizyt (job CRON / delayed functions w Appwrite) – po optymalizacji.
6. Eksport / feed ICS (read-only) – przyszły etap.

---
## 3. Architektura Ogólna

### 3.1 Podział Ról Systemów (Powrót do wariantu z Custom Tool w Sanity)
- Sanity (Content Dataset + Studio): treści informacyjne (blog, oferta, strony) ORAZ osadzony panel administracyjny (custom tool) do operacyjnych akcji: wizyty, grafiki, blokady, notatki, przestawianie statusów.
- Appwrite: baza operacyjna (wizyty, grafiki, blokady, notatki, historia, typy sesji) + Functions + (opcjonalnie e-mail). Brak wieloużytkownikowego auth na MVP (zastępuje go tajny token panelu admina), ale modele projektowane z myślą o przyszłym multi-admin.
- SvelteKit (Public): strony marketingowe + rezerwacja (availability, booking) – wyłącznie publiczne endpoints.
- SvelteKit (API Admin): REST `/api/admin/*` konsumowane przez custom tool w Sanity – zabezpieczone nagłówkiem `X-ADMIN-TOKEN` (statyczny sekret środowiskowy) + dodatkowe sprawdzenia IP / rate-limit.
- Cloudflare: hosting edge (public SSR + API). Studio Sanity hostowane osobno (np. Vercel / Sanity Managed) – custom tool budowany razem ze schematami.

### 3.2 Warstwa Logiki Dostępności (Availability Service)
Aktualizacja pod wymagania (sloty 30m, buffer 9m, hold 10 min, zależność od typu sesji):
1. Pobierz przypisany preset do miesiąca (jeśli brak → miesiąc niedostępny / wyszarzony). Booking horizon = zbiór miesięcy, które mają assignment.
2. Wygeneruj kandydaty startów co 30 minut w ramach interwałów pracy dnia (start slotu musi mieścić się w interwale). Ostatni start może skutkować końcem wizyty poza godziną końca interwału (dozwolone), ale nie przekraczamy północy.
3. Dla wybranego typu sesji sprawdź długość wizyty + globalny buffer 9 min do poprzedniej i następnej wizyty/holda: (start ≥ end_poprz + 9m) i (start_nast ≥ end_plan + 9m). Buffer nie wydłuża wizyty — to odstęp pomiędzy.
4. Usuń kandydaty nachodzące na BlockedPeriod (global lub specyficzny dla sessionType). Blokada specyficzna nadpisuje normalną dostępność.
5. Odfiltruj kolidujące z Appointment (status != canceled/archived) oraz aktywne BookingHold (niewygasłe, 10 min TTL).
6. Waliduj lead time (z presetu lub global default) i brak przeszłości.
7. Cache: per (therapistId, month, sessionType) ETag = hash(presetRev + assignmentsRev + blockedRev + sessionTypeRev + minuteBucketHold). minuteBucketHold = floor(now / 30s) żeby odświeżać widok w kontekście holdów.
8. Endpoint wymaga parametru sessionType, bo długość/buffer może zmieniać dostępność.
9. UI: zawsze wybór typu sesji przed pobraniem dostępności.

Strategia optymalizacji później: prekomputacja list startów (ignorując wizyty/holdy) + szybka filtracja.

### 3.3 Komunikacja / Integracje
- Webhook Sanity → endpoint rewalidujący strony /data (rebuild cache / tag-based invalidation).
- (Przyszłość) Webhook płatności (np. Stripe) → aktualizacja PaymentRecord + zmiana statusu płatności wizyty.
- E-mail (np. Resend / Mailersend / Postmark) – trigger w Appwrite Function lub SvelteKit server action.

### 3.4 Diagram (opis słowny)
User (przeglądarka) → SvelteKit (SSR + endpoints) → (Sanity CDN dla treści, Appwrite SDK server-side dla danych) → Response. Dla rezerwacji: POST /api/booking → walidacja / concurrency → zapis w Appwrite → invalidacja cache dostępności → e-mail.

### 3.5 Panel Admina – Architektura (Custom Tool w Sanity Studio)
Cele: centralizacja zarządzania zarówno treściami marketingowymi, jak i danymi operacyjnymi w jednym interfejsie (Studio). Szybka iteracja UI dzięki React + ekosystem Sanity.

Składniki:
1. Custom Tool (np. `structureTool` + dedykowany plugin) dodający sekcję „Rezerwacje” / „Kalendarz” / „Grafik” w lewym panelu Studio.
2. UI: React + TanStack Query + minimalny design system (komponenty Studio) – komunikacja z backendem przez fetch do `/api/admin/*` (JSON).
3. Autoryzacja: Nagłówek `X-ADMIN-TOKEN: <sekret>` wstrzyknięty na etapie build (ENV) lub ręcznie wpisany przy pierwszym uruchomieniu (local storage). Brak tokenu → UI wymaga wprowadzenia hasła (sekret nie zapisywany w kodzie źródłowym repo).
4. Backend w SvelteKit: każdy `/api/admin/*` endpoint:
	- Weryfikuje stały sekret czasowo w pamięci (`process.env.ADMIN_TOKEN`).
	- (Opcjonalnie) whitelista IP (np. stały zakres biura / VPN) – do rozważenia.
	- Rate limit niskiej czułości (np. 100 req / 5 min) – ochrona przed brute-force zgadywania sekretu.
5. Brak sesji / cookies – wyłącznie explicite header → minimalizacja powierzchni CSRF (preflight + custom header).
6. Uprawnienia: Poziom 1 (MVP) – jeden token = pełne prawa. Poziom 2 – rotacja tokenu + logowanie użycia; Poziom 3 (future) – migracja do Appwrite Auth (role) i rezygnacja z sekretu statycznego.

Ewolucja (przyszłość):
- Migracja na Appwrite Auth (wielu adminów) → endpoint wymaga Bearer JWT zamiast statycznego tokenu.
- Granularne role: `content_editor` (tylko Sanity), `scheduler_manager`, `therapist_notes`.
- SSO (Google / Azure AD) jeśli konieczne.

Trade-off (MVP): statyczny sekret = prostota kosztem fine-grained audytu. Aby częściowo zredukować ryzyko dodajemy: (a) rotację ręczną co X miesięcy, (b) logowanie IP i user-agent w logach każdej operacji admin.

---
## 4. Modele Danych (Appwrite Collections) – Zaktualizowane

Konwencja: UTC ISO 8601; rev (int) dla concurrency. Multi-terapeuta wspierany przez therapistId (obecnie jeden domyślny). Granularność slotów globalna 30m; buffer globalny 9m (ew. przyszłe rozszerzenia per typ sesji).

1. Therapist
	- id, name, publicSlug (unique), emailContact, active:boolean, createdAt, updatedAt
2. SessionType
	- id, therapistId, slug(unique per therapist), title, descriptionShort, descriptionLong?, durationMinutes, basePriceCents, currency, active:boolean, bufferBeforeMinutes?, bufferAfterMinutes?, rev, createdAt, updatedAt
3. SchedulePreset
	- id, therapistId, name, weekPattern(JSON), granularMinutes=30, minLeadMinutes?, active:boolean, rev, createdAt, updatedAt
4. MonthlyScheduleAssignment
	- id, therapistId, year, month(1-12), presetId, rev, createdAt, updatedAt (unique therapistId+year+month)
5. BlockedPeriod
	- id, therapistId, startDateTimeUTC, endDateTimeUTC, reason(enum), note?, appliesToSessionTypeId?, startDayKey, endDayKey, rev, createdAt, updatedAt
6. BookingHold
	- id, therapistId, sessionTypeId, startDateTimeUTC, endDateTimeUTC, expiresAtUTC, token, createdFromIP?, createdAt
7. Appointment
	- id, therapistId, sessionTypeId, startDateTimeUTC, endDateTimeUTC, dayKey, status(enum), paymentStatus(enum), clientFirstName, clientLastName, clientEmail, userRemarks (<=200 słów), userRemarksWordCount, privacyAcceptedAt, priceCentsOriginal, discountCents, priceCentsFinal, discountReason?, isFirstSessionDiscountApplied:boolean, meetingLink?, notesCount, rev, rescheduleOfAppointmentId?, holdId?, createdAt, updatedAt
8. AppointmentHistory
	- id, appointmentId, eventType, payload(JSON), actorLabel, revOfAppointment, createdAt
9. AppointmentNote (notatki terapeuty – edytowalne)
	- id, appointmentId, therapistId, content, editedAt?, redacted:boolean, createdAt, updatedAt
10. PaymentRecord (manual/paypal link – przyszłościowe)
	- id, appointmentId, provider?, providerReference?, amountCents, currency, status, createdAt, updatedAt

Rabat -50%: logika aplikacyjna – przy tworzeniu pierwszej wizyty (brak istniejących pending/confirmed/completed z discount flag). Alternatywnie można opóźnić do completed (otwarte pytanie w sekcji 22).

Sanity Schemas (wysoki poziom):
 - blogPost (title, slug, body (Portable Text), excerpt, tags[], heroImage, publishedAt, seoMeta)
 - blogCategory, blogTag
 - pageFragment / landingSection (opcjonalnie modular content)
 - sessionTypeContent (powiązanie z sessionType.slug dla opisów marketingowych)
 - siteSettings (ogólne: dane kontaktowe, social, meta default)

---
## 5. Przepływy (Flows)

### 5.1 Rezerwacja Nowej Wizyty (Happy Path – Zaktualizowane)
1. Wejście na /umow-wizyte → UI pobiera GET /api/availability?month=YYYY-MM&sessionType=... (typ wymagany).
2. Kliknięcie slotu → POST /api/booking/hold (sessionTypeId, start). Jeśli sukces → token + expiresAt.
3. UI pokazuje formularz; użytkownik ma 10 min. (Odliczanie, odświeżenie holdu tylko przy finalizacji — brak przedłużeń.)
4. Finalizacja: POST /api/booking { holdToken, clientFirstName, clientLastName, clientEmail, userRemarks?, privacyAccepted:true }.
5. Serwer: walidacja + sprawdzenie holda + konfliktów (Appointments + inne holdy) + rabat pierwszej wizyty + zapis Appointment + usunięcie holda.
6. E-mail potwierdzający (z linkiem do płatności PayPal manualnej) + ewentualny meetingLink.
7. Availability niewidoczny slot natychmiast (bo hold) lub definitywnie (bo appointment).

### 5.2 Zmiana Statusu Wizyty (Admin)
1. PATCH /api/appointment/:id { action: "confirm" | "cancel" | "reschedule" | ... }
2. Walidacja przejścia w state machine.
3. Aktualizacja Appointment, wpis do AppointmentHistory.
4. Invalidate availability cache jeśli zmienia dostępność (cancel/reschedule).
5. Powiadomienie e-mail do klienta.

### 5.3 Reschedule
1. Admin wybiera nowy slot → API rewaliduje jak w tworzeniu.
2. Zapis: Appointment (update start/end + status=rescheduled?) + history event.

### 5.4 Dodanie Notatki
POST /api/appointment/:id/note → tworzy AppointmentNote + event history.

### 5.5 Zarządzanie Grafikiem
1. Admin w Sanity tworzy/edytuje preset? (ALTERNATYWA: Presety trzymać w Appwrite – rekomendowane, bo to dane operacyjne). => W planie trzymamy w Appwrite.
2. POST /api/schedule/preset, PUT /api/schedule/preset/:id
3. POST /api/schedule/assignment (year, month, presetId)
4. POST /api/schedule/block (blocked period)
5. Każda zmiana → invalidacja cache.

### 5.6 Blog Publish
Sanity publish → Webhook → SvelteKit endpoint -> tag-based revalidate (Cloudflare cache purge) + regeneracja sitemap.

---
## 6. API (Zaktualizowane – powrót do REST + Custom Tool)

MVP – Public:
- GET /availability?month=YYYY-MM&sessionType=slug
- POST /booking/hold { sessionTypeId, startDateTimeUTC }
- POST /booking { holdToken, clientFirstName, clientLastName, clientEmail, userRemarks?, privacyAccepted }

MVP – Admin (wywoływane z Sanity Studio custom tool; wszystkie wymagają nagłówka `X-ADMIN-TOKEN`):
- GET   /api/admin/appointments?status=&from=&to=&page=
- GET   /api/admin/appointments/:id
- POST  /api/admin/appointments/:id/status { action }
- POST  /api/admin/appointments/:id/note { content }
- GET   /api/admin/presets
- POST  /api/admin/presets
- PUT   /api/admin/presets/:id
- GET   /api/admin/assignments?year=YYYY&month=MM
- POST  /api/admin/assignments
- POST  /api/admin/blocks
- DELETE /api/admin/blocks/:id
- POST  /api/admin/holds/:id/release (force release)

Konwencja odpowiedzi admin: `{ success:boolean, data? , error? }` + kody HTTP.

System / Webhook (Future):
- POST /webhooks/sanity (odświeżenie treści – invalidacja edge/blog cache)
- POST /webhooks/payments (płatności w przyszłości)

Statusy HTTP: 200/201, 204, 400, 401 (brak/niepoprawny token), 403 (IP denied – opcjonalnie), 404, 409, 410 (hold wygasł), 422, 429 (rate limit), 500.

---
## 7. Walidacja i Reguły Biznesowe (Zaktualizowane / MVP potwierdzone)
Kluczowe reguły:
- Slot (start) musi należeć do interwału pracy danego dnia (z presetu). Koniec może wyjść poza interwał (ostatni slot), ale nie poza dzień.
- Lead time: now() + (preset.minLeadMinutes || defaultLead) ≤ start.
- Booking horizon: dzień ma assignment (jeśli brak – niedostępny).
- Kolizje: brak zachodzenia [start,end) z inną wizytą aktywną (pending, confirmed, completed, rescheduled-cel) + buffer 9m przed/po.
- Hold: traktowany jak wizyta przy kolizjach dopóki nie wygaśnie.
- Hold expiry = 10 min → po wygaśnięciu 410 przy finalizacji.
- Rabat -50%: STOSOWANY przy tworzeniu pierwszej wizyty (pending). Jeśli użytkownik anuluje – kolejna rezerwacja z tym samym emailem NIE dostaje ponownie zniżki. (Flag `isFirstSessionDiscountApplied` pozostaje true nawet po anulacji.)
- userRemarks max 200 słów (tokenizacja po whitespace). Brak edycji po stworzeniu.
- AppointmentNote edytowalne, przy edycji event history (note_added lub note_updated).
- Reschedule: nowy start ≠ stary, ponowna walidacja buffera + conflict check.
- BlockedPeriod: start < end; nie dzielimy – jeśli częściowe pokrycie slotu startu → slot usuwamy.
- Payment manual: paymentStatus aktualizowany ręcznie (akcja admin) – brak automatyki.

---
## 8. Bezpieczeństwo i Prywatność (Wersja z Custom Tool + X-ADMIN-TOKEN)
 - Public: brak auth (availability + booking/hold/finalize) – standardowe rate limits.
 - Admin: statyczny sekret `X-ADMIN-TOKEN` wymagany przy każdym `/api/admin/*`. Brak przechowywania w cookie (minimalizuje CSRF). Sekret dostarczany jako ENV do build Sanity lub wprowadzany manualnie (local storage) – preferowane ENV przy deploy.
 - Rotacja sekretu: manualna (np. kwartalnie) – po rotacji rebuild Studio lub wymuszenie ponownego wpisania.
 - Hardening dodatkowy (opcjonalny): whitelista IP, minimalna długość sekretu ≥ 48 znaków, brak logów ujawniających fragment sekretu.
 - Backend używa serwerowego Appwrite API Key (ukryty) – tylko server-side.
 - Dostęp do wrażliwych pól (AppointmentNote) – backend filtruje odpowiedź listy (notatki tylko w dedykowanym GET detail / notatki endpoint, nie w masowej liście wizyt).
 - Sekrety tylko w `$env/dynamic/private`; sanity plugin NIE commitować z wstrzykniętym jawnie tokenem.
 - Rate limiting:
	- GET /availability: 60 / min / IP
	- POST /booking/hold: 20 / 10 min / IP
	- POST /booking: 5 / 10 min / IP + honeypot (np. ukryte pole)
	- /api/admin/*: 100 / 5 min / IP (dodatkowo ban na 15 min po >5 błędnych tokenach)
 - Logging: każda akcja admin zawiera: ts, action, resourceId, ipHash (sha256 skrót IP + salt), uaHash, success.
 - RODO: export danych klienta = filtr Appointment + usunięcie notatek (manual redact). Mechanizm żądania usunięcia → anonimizacja nazwiska + email hash.
 - Szyfrowanie: TLS; notatki plaintext (MVP) – plan: optional libsodium sealed box.
 - Enumeracja: brak list endpointów bez tokenu; brak odmiennych czasów odpowiedzi sugerujących istnienie ID (stałe czasy przy 404 vs 403 różnica minimalna).
 - CSRF: niemożliwa bez posiadania sekretu (custom header). Dodaj kontrolę Origin/Referer jako dodatkową warstwę.
 - Brute force tokenu: bardzo mało prawdopodobny przy długości 48+ znaków; wykrywanie przez anomalię 401.

---
## 9. Obsługa Czasu i Stref (Timezones)
- Baza i logika w UTC.
- Frontend konwertuje do lokalnej strefy użytkownika (Intl.DateTimeFormat / Temporal w przyszłości).
- Testy DST – daty graniczne (ostatnia niedziela marca/października). 
- Unikanie przechowywania lokalnych dat bez offsetu.

---
## 10. Cache i Wydajność (Dostosowane do Custom Tool)
MVP strategia: najprostszy możliwy mechanizm, łatwy w debugowaniu.

### 10.0 Różnica: Docelowo vs MVP
- Docelowo: ETag, fine-grained invalidation, częściowe mikro-invalidate.
- MVP: Brak ETag, brak warstw edge dla availability, brak hashed kluczy.

### 10.1 Availability Cache (JEDNA warstwa in-memory)
- Struktura: `const availabilityCache = new Map<string, { expiresAt:number, data:SlotsPayload }>()`.
- Klucz: `avail:${therapistId}:${year}-${month}:${sessionTypeId}`.
- TTL: 60s.
- GET: jeśli w Map i (Date.now() < expiresAt) → zwróć; inaczej wygeneruj, zapisz, zwróć.
- Inwalidacja: prosta `availabilityCache.clear()` po KAŻDEJ operacji mutującej (create/update/cancel/reschedule/hold create/hold expire/block change/preset change). Overkill ale bardzo bezpieczne.
- Hold: po stworzeniu holda NIE regenerujemy – rely on ponowne pobranie po 60s; ewentualnie w przyszłości mikro-invalidate.

### 10.2 Panel Admin (Custom Tool) Cache
- TanStack Query staleTime minimalne (30–60s wizyty) lub 0 z manual refresh; brak agresywnego refetch.
- Przyciski odświeżenia – komponent wspólny wewnątrz pluginu.

### 10.3 Odrzucone w MVP
- ETag, If-None-Match, timeBucket dla holdów, edge caching availability.
- Precomputing slotów.

### 10.4 Future Upgrade Path (Check-list)
- Zamiana global clear() na selektywną invalidację (klucze dotknięte danym dniem / typem).
- Wprowadzenie ETag (hash config + count holdów) → conditional GET.
- Mikro-invalidation pojedynczego slotu przy tworzeniu holda.

### 10.1 Warstwy Cache
1. Edge / HTTP (Cloudflare):
	- Treści marketingowe (blog, oferta) – cache z tagami; revalidate via webhook.
	- Availability – brak długiego edge cache (holdy) – ewentualnie 5–10s.
2. Serwer (SvelteKit):
	- Map (therapistId, month, sessionType) TTL 60s (availability).
3. Sanity Studio Custom Tool (React Query):
	- SessionTypes: staleTime 600s.
	- Presets / Assignments / BlockedPeriods: 180s / 120s.
	- Appointments list: 30–60s (manual refresh dominujący).
	- History / Notes: on-demand.
4. Appwrite: brak dodatkowego cache.

### 10.2 Strategie Inwalidacji
- Event Bus (prosty): w kodzie po każdej operacji mutującej wywołanie funkcji invalidate([...keys]).
- Klucze logiczne: `avail:{therapistId}:{year}-{month}:{sessionTypeId}`.
- Admin manual refresh: przycisk „Odśwież” → `queryClient.invalidateQueries(prefix)`.
- Soft-stale: UI pokazuje dane natychmiast (cached) + ikona, że wersja X sekundy temu; po ręcznym odświeżeniu spinner + update.
- ETag w /availability: klient wysyła If-None-Match, serwer 304 jeśli brak zmian (redukcja transferu).

### 10.3 TTL / Parametry (wstępne wartości; można stroić)
| Warstwa | Zasób | TTL / staleTime | Uzasadnienie |
|--------|-------|----------------|--------------|
| Memory server | availability | 60s | Zbalansowanie odświeżeń vs hold bucket 30s |
| React Query | sessionTypes | 600s staleTime | Rzadkie zmiany |
| React Query | presets/assignments | 180s | Zmiany sporadyczne |
| React Query | blockedPeriods | 120s | Częstsze korekty możliwe |
| React Query | appointments list | 30-60s | Semi-real-time wystarczy, manual refresh dostępny |
| React Query | history/notes | 0 (on-demand) | Oszczędność zapytań |
| Edge | blog pages | 5m + SWR | SEO + szybkość |
| Edge | sitemap.xml | 1h | Mała dynamika |

### 10.4 Dostępność a Holdy (MVP)
- Brak specjalnej obsługi: hold może spowodować, że przez maks 60s slot jeszcze widnieje w cache jeśli wygenerowano przed holdem. Po kliknięciu finalizacji i tak nastąpi konflikt (409) – akceptowalny kompromis.
- Jeżeli UX pokaże potrzebę – pierwsza optymalizacja: manualne usuwanie slotu z obiektu przed zapisaniem w cache (łatwe do dopisania).

### 10.5 Optymalizacje Sieci w Custom Tool
- Zbiorcze endpointy (batch) dla initial load (sessionTypes + presets + assignments + blockedPeriods w jednym zapytaniu).
- ETag / Last-Modified dla list statyczniejszych (sessionTypes). 
- Kompresja JSON (gzip / brotli – zależnie od platformy hostingowej Cloudflare default).

### 10.6 Zapobieganie Nadmiernym Refetchom
- Wyłącz `refetchOnWindowFocus` dla ciężkich list (appointments) – user ma przycisk.
- Debounce filtrów (np. szukaj po emailu) 300–500 ms.
- Paginate appointments (limit 50) + infinite scroll.

### 10.7 Wskaźniki Monitoringu Cache (future)
- (Future) availability_cache_hit_ratio
- (Future) admin_query_volume
- (Future) stale_data_reported
MVP: brak formalnych metryk – log debug przy miss/hit jeśli `NODE_ENV=development`.

### 10.8 Ryzyko Stale Data – Strategia
Admin decyduje: jeżeli wątpliwość → klik „Odśwież”. UI pokazuje label np. „Ostatnia synchronizacja: 42s temu”.

### 10.9 Przycisk Ręcznego Odświeżenia (UX)
- Uniwersalny komponent `<RefreshButton resourceKey="appointments" />` → wywołuje invalidację + ikonę progress.
- Blokada spam: minimum 2s pomiędzy kolejnymi invalidacjami tego samego klucza (lokalny throttling).

### 10.10 Potencjalne Przyszłe Rozszerzenia Cache
- Durable Object / KV do współdzielenia availability między instancjami (jeśli skalowanie horyzontalne) – obecnie overkill.
- Precomputing slotów nocą dla kolejnych 2 miesięcy (jeśli generacja zacznie być kosztowna).
- Invalidation: event-driven – nowa wizyta, anulacja, blokada, zmiana przypisania, zmiana presetu.
- Treści Sanity: ISR (on-demand revalidate) + HTTP cache (stale-while-revalidate) na Cloudflare.
- Ograniczenie payloadu availability (zwraca tylko dni + sloty + meta; brak wrażliwych szczegółów).
- Pagination dla listy wizyt (limit + cursor). Indexy po startDateTimeUTC.

---
## 11. UI / UX Kalendarza
- Widok miesiąc z highlight dni posiadających dostępne sloty.
- Po kliknięciu dzień → lista slotów (grupowanie wg pory dnia: rano / popołudnie / wieczór – opcjonalnie).
- Oznaczenia: disabled (przeszłość / brak slotów / lead time), selected, hovered, focus states (a11y).
- Prefetch danych sąsiednich miesięcy przy nawigacji.
- Fallback: skeleton loading.
- Komunikaty błędów (kolizja, utrata slotu) – natychmiastowe odświeżenie listy.

---
## 12. Testy (Aktualizacja scenariuszy – dostosowane do uproszczeń)
### 12.1 Jednostkowe (Vitest)
- Generowanie slotów z presetów (różne konfiguracje, edge: brak preset, overlapping intervals, buffer).
- State machine + rabat (pierwsza vs druga rezerwacja) + wygaśnięcie holda.
- Walidacja reguł lead time / horizon.
### 12.2 Testy Property-based (opcjonalnie w późniejszej fazie)
- Losowe grafiki → brak nakładających się slotów.
### 12.3 Integracyjne
- POST /booking/hold → finalizacja (konflikt test jeśli drugi użytkownik spróbuje finalize bez holda).
- Expired hold → 410.
- Reschedule → availability aktualizuje się.
### 12.4 E2E (Playwright)
- Flow z holdem + expiry.
- Admin potwierdza i dodaje notatkę.
- Anulowanie i ponowna rezerwacja tego samego slotu.
### 12.5 Testy DST
- Generacja slotów w tygodniu zmiany czasu – liczba slotów powinna być poprawna.
### 12.6 Performance (manual + automaty) 
- Pomiar p95 czasu endpointu /availability i /booking.

---
## 13. Observability
- Logi strukturalne (JSON: level, ts, traceId, userId, action, durationMs).
- Metryki (możliwe przez dedykowaną usługę lub lightweight endpoint): bookings_per_day, conflicts, availability_cache_hits/misses.
- Alerty (próg błędów 5xx, spike w conflicts).

---
## 14. Migrowanie i Wersjonowanie Schematów
- Appwrite: trzymanie skryptów migracyjnych (folder `scripts/migrations`) – definicja zmian (np. JSON + TS runner korzystający z Appwrite admin SDK).
- Sanity: schematy wersjonowane w repo; przy zmianach content model – migracje (sanity dataset export + transform + import).
- Numeracja migracji: YYYYMMDDHHmm-nazwa.

---
## 15. Roadmap (Iteracje)
### Faza 0 – Podstawy
- Konfiguracja środowiska (env, adapter cloudflare, Sanity projekt, Appwrite projekt / kolekcje wstępne).
- Strony marketingowe statyczne (placeholdery) + layout.
### Faza 1 – CMS Treści
- Schematy Sanity (blogPost, sessionTypeContent, siteSettings) + integracja w SvelteKit (zapytania GROQ).
- Blog listing + SEO meta + sitemap, RSS (opcjonalnie) /robots.txt.
### Faza 2 – Modele Rezerwacji (Back)
- Kolekcje Appwrite: SessionType, SchedulePreset, MonthlyScheduleAssignment, BlockedPeriod, Appointment.
- Endpoint /availability (bazowy) + generowanie slotów bez cache.
- Podstawowy custom tool (read-only) w Sanity Studio wyświetlający listę wizyt.
### Faza 3 – Rezerwacja MVP
- POST /booking (bez płatności), walidacje bazowe, e-mail potwierdzenia (stub).
- UI kalendarza (miesięczny → wybór slotu → formularz).
- Rozszerzenie custom tool: akcje podstawowe (confirm / cancel) przy użyciu X-ADMIN-TOKEN.
### Faza 4 – Admin Wizyt
- Endpointy statusów + historia (AppointmentHistory), notatki.
- Cache dostępności + invalidacja.
- Custom tool: zarządzanie grafikami (preset, assignment, block), reschedule UI.
### Faza 5 – Ulepszenia
- PaymentRecord integracja (Stripe test mode), webhook.
- Powiadomienia przypominające (24h / 2h przed).
- ICS feed.
### Faza 6 – Optymalizacja i Hardening
- Rate limiting, property-based tests, performance tuning, audyt bezpieczeństwa.

---
## 16. Ryzyka i Mitigacje (Aktualizacja po powrocie do custom tool)
| Id | Ryzyko | Opis | Prawdop. | Wpływ | Mitigacja | Detekcja |
|----|--------|------|----------|-------|-----------|----------|
| R1 | Kolizje rezerwacji | Dwie finalizacje tego samego slotu | M | H | Hold + walidacja konfliktu | 409 rate |
| R2 | Hold leak | Hold nie wygasa | L | M | Cleanup job + TTL | Liczba hold > próg |
| R3 | Discount abuse | Wielokrotny rabat | L | M | Flaga email first-discount | Event >1/email |
| R4 | Stale cache availability | Slot zajęty, a pokazany wolny | M | M | Krótki TTL 60s + klarowny error | Konflikty po finalize |
| R5 | Token wyciek (X-ADMIN-TOKEN) | Przejęcie pełnej kontroli admin | L | H | Długi (48+), rotacja, brak logowania w konsoli, whitelista IP | 401 spike / log analiza |
| R6 | Nadmierne requesty availability | Flood endpointu | M | M | Rate limit IP | p95 latency wzrost |
| R7 | DST błąd | Złe sloty | L | H | Testy DST | Test fail |
| R8 | Sekret wyciek | API Key ujawniony | L | H | Serwer-only usage, grep CI | Scan alerts |
| R9 | Historia storage rośnie | Koszt | M | L | Retencja > 18m (future) | Trend rozmiaru |
| R10 | Meeting link brak | Brak linku w mailu | L | L | Check before send | Raport support |
| R11 | Brak logów | Trudne debugowanie | M | M | console + struktura minimalna | Ręczne przeszukiwanie |
| R12 | UI blokady niejasne | Błędne decyzje admina | M | M | Wyraźne oznaczenia kolorystyczne | Feedback admin |
| R13 | Brak multi-terapeuta skalowania | Refactor później drogi | L | M | therapistId już obecny | - |
| R14 | Zbyt prosta invalidacja (clear all) | Straty wydajności | M | L | Future: selektywna invalidacja | Częstość regeneracji |
| R15 | Brak fine-grained audytu użytkowników | Trudny tracing błędów | M | M | Log IP hash + event types | Brak korelacji zdarzeń |
| R16 | Próby brute-force tokenu | Nadmierne 401 + koszt CPU | L | M | Rate limit + exponential backoff ban | Wzorzec 401 |

Usunięto ryzyka związane z custom Sanity tool i edge caching (nie dotyczy MVP).

Legenda: Prawdop. (L/M/H), Wpływ (L/M/H).

Proces zarządzania ryzykiem: kwartalny przegląd R-listy + aktualizacja progów alertów (p95 latency, conflict rate, hold leak rate).

---
## 17. A11y i SEO
- Semantyczne znaczniki (nav, main, article, header, footer, h1-h2 hierarchia).
- ARIA dla kalendarza (grid, aria-selected, aria-disabled, role="gridcell").
- Klawiatura: Tab / Enter / Strzałki.
- JSON-LD: Person / LocalBusiness, Article.
- Meta tags per page (OpenGraph, Twitter). 
- Lighthouse (performance, a11y, SEO) > 90.

---
## 18. Jakość Kodu / Narzędzia
- ESLint + Prettier + TypeScript strict.
- Zod (lub Valibot) do walidacji wejść API.
- Konwencja paths: `src/lib/api/...` dla klientów SDK, `src/routes/api/...` dla endpoints.
- Testy: minimum coverage krytycznych ścieżek (availability, booking, status transitions).

---
## 19. Przykładowa Macierz Przejść Statusów (Appointment) (aktualizacja – bez zmian merytorycznych)
| Current → Next | pending | confirmed | completed | canceled_* | rescheduled | archived |
|----------------|---------|----------|----------|------------|-------------|----------|
| pending        | -       | ✔        | -        | ✔          | ✔ (zmiana slotu) | - |
| confirmed      | -       | -        | ✔        | ✔          | ✔            | - |
| completed      | -       | -        | -        | -          | -            | ✔ |
| canceled_*     | -       | -        | -        | -          | -            | ✔ |
| rescheduled    | -       | ✔ (po potwierdzeniu nowego slotu) | - | ✔ | ✔ (kolejna zmiana) | - |

Zasada: archived jest stanem terminalnym. canceled_client i canceled_admin traktowane jako canceled_*. Rabat oznaczany przy pierwszym pending (domyślne podejście – można zmienić na completed w przyszłości).

---
## 20. Przykład Etykiet Zdarzeń Historycznych (Rozszerzone)
- created
- status_change:{from,to}
- rescheduled:{fromStart,toStart}
- note_added:{noteId}
- payment_update:{from,to}
- hold_created
- hold_released (expire lub finalize)
- discount_applied:{percent}

Payload: minimalna porcja danych potrzebna do rekonstrukcji timeline (bez wrażliwych treści notatki – tylko reference).

---
## 21. Elementy Opcjonalne (Po MVP)
- Konto klienta (logowanie → wgląd w historię, anulacje samodzielne do X h przed wizytą).
- Double opt-in dla newslettera.
- Dark mode (prefers-color-scheme).
- Wielojęzyczność (pl/en) – Sanity lokalizacje.
- Generative AI podpowiedzi do notatek (tylko lokalnie / on-demand – kwestia zgodności prywatności!).

---
## 22. Otwarte Pytania Do Ustalenia (Zredukowane)
1. Czy w kolejnej fazie wprowadzamy ETag dla /availability czy dopiero po mierzalnym problemie wydajności?
2. Kiedy dodać 2FA dla konta admin (próg ruchu / danych)?
3. Czy discount_applied event pozostaje (tak) – czy potrzebna druga metryka revenue utraconego przez rabat (future)?
4. Priorytet future: selektywna invalidacja cache czy integracja płatności?

---
## 23. Następne Kroki Teraz (Po powrocie do custom tool)
1. Dodanie sekcji custom tool w Sanity (plugin skeleton) + UI autoryzacji tokenem (pole + local storage persist).
2. Implementacja REST `/api/admin/*` (appointments listing, details, status mutate, notes) + middleware weryfikujący `X-ADMIN-TOKEN` + rate limit.
3. Utworzenie kolekcji w Appwrite (SessionType, SchedulePreset, MonthlyScheduleAssignment, BlockedPeriod, Appointment, BookingHold, AppointmentHistory, AppointmentNote).
4. In-memory cache availability (Map + clear()) + log hit/miss (dev mode).
5. Endpointy /booking/hold i /booking (walidacja, rabat, hold expiry) + testy jednostkowe.
6. Rozszerzenie custom tool: lista wizyt (paginacja + filtr status), szczegóły (history + notatki), akcje (confirm/cancel/reschedule), edycja meetingLink.
7. Logger strukturalny (console JSON) + logowanie IP hash i action dla admin endpoints.
8. Testy slot generatora (buffer 9m, lead time, brak cross-midnight) + test przepływu hold finalize.
9. E-mail stub (console) → adapter pod późniejszą integrację (Resend / Postmark).

---
## 24. Słownik Skrótów
- DST – zmiana czasu (Daylight Saving Time)
- MPA – Multi Page Application
- UTC – Czas uniwersalny koordynowany
- RBAC – Role Based Access Control
- ISR – Incremental Static Regeneration (tu: on-demand revalidate)
- ETag – Nagłówek identyfikujący wersję zasobu do cache
- P95 – 95 percentyl czasu odpowiedzi

---
Koniec dokumentu.

