import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import websiteConfig from './astro.config.mjs';
import bookingRoutes from './astro.booking-routes.mjs';

const bookingEnabled = Boolean(process.env.BOOKING_BACKEND_URL && process.env.BOOKING_BACKEND_TOKEN);

export default defineConfig({
    ...websiteConfig,
    adapter: vercel(),
    vite: {
        define: {
            __BEKO_LIVE_BOOKING__: String(bookingEnabled),
            __BEKO_SUPABASE_BACKEND__: 'true'
        }
    },
    integrations: bookingEnabled ? [bookingRoutes('supabaseEndpoint.ts')] : []
});
