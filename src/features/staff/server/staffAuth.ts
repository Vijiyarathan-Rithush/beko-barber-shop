import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { APIContext } from 'astro';
import { staffAccount, type StaffAccount } from '../../../../supabase/functions/_shared/staffAccount';

type StaffContext = Pick<APIContext, 'cookies' | 'request' | 'url'>;

export function staffAuth(context: StaffContext)
{
    const project = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!project || !key)
    {
        throw new Error('Supabase Auth is not configured.');
    }

    return createServerClient(project, key, {
        cookieOptions: {
            name: 'beko-staff',
            path: '/verwaltung',
            httpOnly: true,
            sameSite: 'lax',
            secure: context.url.protocol === 'https:' || process.env.VERCEL === '1'
        },
        cookies: {
            getAll()
            {
                return parseCookieHeader(context.request.headers.get('cookie') ?? '')
                    .flatMap(({ name, value }) => typeof value === 'string' ? [{ name, value }] : []);
            },
            setAll(cookies)
            {
                for (const { name, value, options } of cookies)
                {
                    context.cookies.set(name, value, options);
                }
            }
        }
    });
}

export async function staffSession(client: ReturnType<typeof staffAuth>): Promise<{ account: StaffAccount; accessToken: string } | undefined>
{
    const { data: { user } } = await client.auth.getUser();
    const account = staffAccount(user);
    if (!account)
    {
        return undefined;
    }

    const { data: { session } } = await client.auth.getSession();
    return session?.access_token ? { account, accessToken: session.access_token } : undefined;
}

export function sameOrigin(request: Request, url: URL): boolean
{
    return request.headers.get('origin') === url.origin;
}
