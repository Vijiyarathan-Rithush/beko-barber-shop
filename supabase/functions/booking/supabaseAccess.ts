import { staffAccount, type StaffAccount } from '../_shared/staffAccount.ts';

function projectUrl(): string
{
    const project = Deno.env.get('SUPABASE_URL');
    if (!project)
    {
        throw new Error('The Supabase project is not configured.');
    }

    return project;
}

function defaultKey(environmentName: string): string | undefined
{
    const keys = JSON.parse(Deno.env.get(environmentName) || '{}') as Record<string, string>;
    return keys.default;
}

export function supabaseService(): { project: string; headers: Headers }
{
    const modern = defaultKey('SUPABASE_SECRET_KEYS');
    const key = modern || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!key)
    {
        throw new Error('The Supabase service key is not configured.');
    }

    const headers = new Headers({ apikey: key, 'Content-Type': 'application/json' });
    if (!modern)
    {
        headers.set('Authorization', 'Bearer ' + key);
    }

    return { project: projectUrl(), headers };
}

export async function authenticateStaff(request: Request): Promise<StaffAccount | undefined>
{
    const bearer = request.headers.get('authorization');
    if (!bearer?.startsWith('Bearer ') || bearer.length > 16_384)
    {
        return undefined;
    }

    const key = defaultKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
    if (!key)
    {
        throw new Error('The Supabase publishable key is not configured.');
    }

    const response = await fetch(new URL('/auth/v1/user', projectUrl()), {
        headers: { apikey: key, Authorization: bearer },
        redirect: 'error',
        signal: AbortSignal.timeout(5_000)
    });
    if (response.status === 401 || response.status === 403)
    {
        return undefined;
    }
    if (!response.ok)
    {
        throw new Error('Supabase Auth did not verify the session.');
    }

    return staffAccount(await response.json());
}

export async function staffAccounts(): Promise<StaffAccount[]>
{
    const { project, headers } = supabaseService();
    const url = new URL('/auth/v1/admin/users', project);
    url.searchParams.set('per_page', '1000');
    const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(5_000) });
    if (!response.ok)
    {
        throw new Error('Supabase Auth did not return the accounts.');
    }

    const { users } = await response.json() as { users: Parameters<typeof staffAccount>[0][] };
    return users.map(staffAccount).filter(account => account !== undefined);
}
