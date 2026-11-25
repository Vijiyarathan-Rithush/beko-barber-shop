# Beko’s Barber Shop

Responsive Astro-Website für Beko’s Barber Shop in St. Gallen. Die Startseite zeigt Leistungen, Preise, Bewertungen und Standort. Auf `/buchen` lässt sich eine Buchung bei Bekim mit Testdaten durchspielen.

## Lokal starten

Node.js ab 22.23.4 und npm verwenden.

~~~sh
npm ci
npm run dev
~~~

Die Terminalausgabe zeigt die lokale Adresse. `npm run check` prüft Astro und TypeScript. `npm run build` erzeugt die statische Website in `dist/`. `npm run preview` zeigt den Produktionsbuild lokal.

## GitHub Pages

`npm run build:pages` baut die statische Demo mit den Pfaden für das Pages-Repo und schreibt sie nach `dist-pages/`. Der Branch `main` im Pages-Repo enthält den Inhalt dieses Ordners. [Pages-Repo](https://github.com/Vijiyarathan-Rithush/beko-barber-shop-pages)

## Shopdaten pflegen

| Angabe | Einrichtung |
|---|---|
| Bewertungsformular | `.env.example` als `.env` kopieren und `PUBLIC_REVIEW_URL` auf Bekims bestätigten HTTPS-Link setzen. Astro liest den Wert beim Start oder Build. |
| Original-Logo | Die Datei liegt in `public/beko-logo.png`. `logoPath` in `src/config/shop.ts` verweist darauf. |
| Öffnungszeiten und Kontakt | `openingHours`, `phone` und `instagramUrl` in `src/config/shop.ts` ergänzen. |
| Preise und Dauer | Den gemeinsamen Katalog in `supabase/functions/_shared/services.ts` pflegen. |
| Fotos | Das generierte Werkzeugmotiv und die gekennzeichnete Kartenillustration liegen in `src/assets/`. Link und Adresse für «Route planen» kommen aus den Shopdaten. |

## Buchungsdemo

Die Buchung simuliert fünf Werktage und richtet die angezeigten Daten an `Europe/Zurich` aus. Ein Tag ist absichtlich ausgebucht. Die Leistung bestimmt, welche Zeitfenster lang genug sind. Test-Kontaktdaten bleiben im Formular und werden nach der Demo-Bestätigung geleert.

## Lokale Buchung mit SQLite

Die Node-Variante ergänzt die Website um einen Kalender mit gespeicherten Buchungen. Das Hosting muss Node.js und einen persistenten Speicher für SQLite bereitstellen. Die beiden statischen Builds dienen weiterhin der Demo.

~~~sh
npm ci
npm run build:booking
npm run start:booking
~~~

Öffne `/buchen/` an der im Terminal angezeigten Adresse. Der Server reserviert die Zeit in der lokalen SQLite-Datei und zeigt eine Buchungsnummer an. Die Dauer und der Preis kommen aus dem Leistungskatalog. Eine erneute Anfrage nach einem Verbindungsabbruch verwendet dieselbe Buchungskennung.

`/verwaltung/` zeigt Bekim kommende Termine und ermöglicht die Stornierung. Für die Anmeldung das Passwort `BOOKING_ADMIN_PASSWORD` in einer lokalen `.env` setzen und den Benutzernamen `bekim` verwenden. `BOOKING_DB_PATH` legt den Speicherort fest. Ohne Angabe wird `data/bookings.sqlite` verwendet.

Die Öffnungszeiten und Sperrtage stehen in `supabase/functions/_shared/bookingHours.ts`. Die dort eingetragenen Zeiten sind Beispiele für die lokale Abnahme. Für einen öffentlichen Betrieb werden Bekims bestätigte Zeiten, HTTPS und ein dauerhaftes Datenverzeichnis gebraucht. Die HTTPS-Adresse der Website wird in der Build-Umgebung als `BOOKING_SITE_URL` gesetzt.

`npm run test:booking` prüft überlappende Reservierungen, wiederholte Anfragen und Stornierungen mit zwei lokalen Serverprozessen.

## Supabase und Vercel

Die Supabase Edge Function `booking` verwendet PostgreSQL für Termine und sperrt überlappende Reservierungen auf Datenbankebene. Vercel liefert die Astro-Website aus und leitet `/api/bookings` sowie die geschützte Terminverwaltung an die Funktion weiter. Der Browser verwendet weiterhin die URLs der Website.

1. Lege ein Supabase-Projekt an und verknüpfe es mit der Supabase CLI.

   ```sh
   supabase link --project-ref <projekt-ref>
   supabase db push
   supabase functions deploy booking --use-api
   ```

2. Setze in Supabase unter **Edge Functions > Secrets** einen zufälligen `BOOKING_BACKEND_TOKEN` mit mindestens 32 Zeichen. Die Function prüft diesen Token bei jedem Aufruf. Die Supabase-Datenbankschlüssel stehen ihr direkt in Supabase zur Verfügung.
3. Importiere dieses GitHub-Repository in Vercel. Vercel verwendet `npm run build:vercel` aus `vercel.json`. Setze die Variablen für die gewünschte Umgebung und löse einen neuen Build aus.

| Vercel-Variable | Wert |
| --- | --- |
| `BOOKING_BACKEND_URL` | Die HTTPS-URL der bereitgestellten Function `booking` |
| `BOOKING_BACKEND_TOKEN` | Derselbe geheime Wert wie in Supabase |
| `BOOKING_ADMIN_PASSWORD` | Ein eigenes Passwort für die Anmeldung als `bekim` |

Bei einer Einrichtung ohne Zugriff auf die Supabase-Secrets kann ein zufälliger Token mit 32 Byte in Vercel gespeichert werden. Trage den SHA-256-Fingerabdruck als 64 Hex-Zeichen in `public.beko_backend_access.token_sha256` ein. Die Function nutzt den Eintrag, wenn in Supabase kein `BOOKING_BACKEND_TOKEN` gesetzt ist.

Die Website läuft als Demo, solange `BOOKING_BACKEND_URL` oder `BOOKING_BACKEND_TOKEN` im Vercel-Build fehlen. Verwende für die Abnahme eine separate Supabase-Umgebung mit Testdaten. Trage vor dem Aktivieren der Produktionsvariablen Bekims Öffnungszeiten in `supabase/functions/_shared/bookingHours.ts` ein und stelle die Funktion neu bereit. Die Migration legt eine neue Buchungstabelle an. Bestehende produktive SQLite-Termine müssten bei einem späteren Umzug separat übertragen werden.
