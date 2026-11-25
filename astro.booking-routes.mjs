export default function bookingRoutes(endpoint)
{
    const directory = new URL('./src/features/booking/server/', import.meta.url);
    return {
        name: 'beko-booking-routes',
        hooks: {
            'astro:config:setup': ({ injectRoute }) =>
            {
                injectRoute({
                    pattern: '/api/bookings',
                    entrypoint: new URL(endpoint, directory),
                    prerender: false
                });
                injectRoute({
                    pattern: '/verwaltung/',
                    entrypoint: new URL('Management.astro', directory),
                    prerender: false
                });
            }
        }
    };
}
