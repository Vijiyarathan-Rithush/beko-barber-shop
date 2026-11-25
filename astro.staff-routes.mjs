const routes = {
    '/verwaltung/': 'Appointments.astro',
    '/verwaltung/anmelden/': 'Login.astro',
    '/verwaltung/passwort-waehlen/': 'SetupPassword.astro',
    '/verwaltung/admin/': 'Admin.astro'
};

export default function staffRoutes()
{
    const directory = new URL('./src/features/staff/server/', import.meta.url);
    return {
        name: 'beko-staff-routes',
        hooks: {
            'astro:config:setup': ({ injectRoute }) =>
            {
                for (const [pattern, page] of Object.entries(routes))
                {
                    injectRoute({ pattern, entrypoint: new URL(page, directory), prerender: false });
                }
            }
        }
    };
}
