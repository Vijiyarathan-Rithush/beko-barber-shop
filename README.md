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
| Preise und Dauer | Den gemeinsamen Katalog in `src/features/booking/domain/services.ts` pflegen. |
| Fotos | Das generierte Werkzeugmotiv und die gekennzeichnete Kartenillustration liegen in `src/assets/`. Link und Adresse für «Route planen» kommen aus den Shopdaten. |

## Buchungsdemo

Die Buchung simuliert fünf Werktage und richtet die angezeigten Daten an `Europe/Zurich` aus. Ein Tag ist absichtlich ausgebucht. Die Leistung bestimmt, welche Zeitfenster lang genug sind. Test-Kontaktdaten bleiben im Formular und werden nach der Demo-Bestätigung geleert. Für Livebuchungen sind der aktive Anbieter und seine Schnittstelle sowie Bekims Verfügbarkeit zu bestätigen.
