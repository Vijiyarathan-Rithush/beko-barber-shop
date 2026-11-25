import node from '@astrojs/node';
import { defineConfig } from 'astro/config';
import websiteConfig from './astro.config.mjs';

const allowedDomains = [
    { hostname: 'localhost', protocol: 'http' },
    { hostname: '127.0.0.1', protocol: 'http' }
];
const site = process.env.BOOKING_SITE_URL;

if (site)
{
    const url = new URL(site);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password)
    {
        throw new Error('BOOKING_SITE_URL must be the HTTPS origin of the booking site.');
    }

    allowedDomains.push({ hostname: url.hostname, protocol: 'https', port: url.port || undefined });
}

export default defineConfig({
    ...websiteConfig,
    site,
    security: { allowedDomains },
    outDir: './dist-booking',
    adapter: node({ mode: 'standalone' }),
    vite: {
        define: { __BEKO_LIVE_BOOKING__: 'true' }
    },
    integrations: [{
        name: 'beko-booking-routes',
        hooks: {
            'astro:config:setup': ({ injectRoute }) =>
            {
                injectRoute({
                    pattern: '/api/bookings',
                    entrypoint: new URL('./src/features/booking/server/bookingEndpoint.ts', import.meta.url),
                    prerender: false
                });
                injectRoute({
                    pattern: '/verwaltung/',
                    entrypoint: new URL('./src/features/booking/server/Management.astro', import.meta.url),
                    prerender: false
                });
            }
        }
    }]
});
