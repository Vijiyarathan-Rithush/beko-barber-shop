import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import websiteConfig from './astro.config.mjs';
import bookingRoutes from './astro.booking-routes.mjs';
import staffRoutes from './astro.staff-routes.mjs';

const bookingEnabled = Boolean(process.env.BOOKING_BACKEND_URL && process.env.BOOKING_BACKEND_TOKEN);
const staffEnabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
const integrations = [];
if (bookingEnabled)
{
    integrations.push(bookingRoutes('supabaseEndpoint.ts', false));
}
if (staffEnabled)
{
    integrations.push(staffRoutes());
}

export default defineConfig({
    ...websiteConfig,
    adapter: vercel(),
    vite: {
        define: {
            __BEKO_LIVE_BOOKING__: String(bookingEnabled),
            __BEKO_STAFF_LOGIN__: String(staffEnabled)
        }
    },
    integrations
});
