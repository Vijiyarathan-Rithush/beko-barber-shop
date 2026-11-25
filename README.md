# Beko’s Barber Shop

Responsive Astro-Website für Beko’s Barber Shop in St. Gallen. Die Startseite zeigt Leistungen, Preise, Bewertungen und Standort. Die Website unterstützt Bekims bestehende Onlinebuchung über Shore und eine Buchungsdemo für die Vorschau.

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

## Onlinebuchung

Für einen Build mit echter Terminbuchung `PUBLIC_BOOKING_URL` aus `.env.example` in der Build-Umgebung setzen. Die Buchungslinks und die Adresse `/buchen/` führen dann zu Bekims Shore-Kalender. Auswahl, Kundendaten und Terminbestätigung werden bei Shore verarbeitet.

Bei leerem `PUBLIC_BOOKING_URL` bleibt der Buchungsablauf eine Demo mit Testdaten und simulierten Zeiten in `Europe/Zurich`.
