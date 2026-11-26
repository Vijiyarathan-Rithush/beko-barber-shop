import { staffAccount, type StaffAccount, type StaffDirectoryEntry } from '../_shared/staffAccount.ts';

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

type AuthUser = Parameters<typeof staffAccount>[0] & {
    id: string;
    app_metadata?: Record<string, unknown>;
};

async function adminAuth(path: string, method = 'GET', body?: object): Promise<Response>
{
    const { project, headers } = supabaseService();
    return fetch(new URL('/auth/v1/admin/' + path, project), {
        method, headers, body: body && JSON.stringify(body),
        redirect: 'error', signal: AbortSignal.timeout(5_000)
    });
}

export async function staffAccounts(): Promise<StaffDirectoryEntry[]>
{
    const response = await adminAuth('users?per_page=1000');
    if (!response.ok)
    {
        throw new Error('Supabase Auth did not return the accounts.');
    }

    const { users } = await response.json() as { users: AuthUser[] };
    return users.flatMap(user => {
        const account = staffAccount(user);
        const { beko_notification_email, beko_notification_phone } = user.app_metadata ?? {};
        return account ? [{
            ...account, id: user.id,
            notificationEmail: typeof beko_notification_email === 'string' ? beko_notification_email : '',
            notificationPhone: typeof beko_notification_phone === 'string' ? beko_notification_phone : ''
        }] : [];
    });
}

export async function createStaff(email: string): Promise<boolean>
{
    const response = await adminAuth('users', 'POST', { email, app_metadata: { beko_role: 'staff' } });
    return response.ok;
}

export async function saveStaffContact(id: string, email: string, phone: string): Promise<boolean>
{
    const response = await adminAuth('users/' + id);
    if (!response.ok)
    {
        return false;
    }
    const payload = await response.json() as AuthUser | { user: AuthUser };
    const user = 'user' in payload ? payload.user : payload;
    if (staffAccount(user)?.role !== 'staff')
    {
        return false;
    }
    const updated = await adminAuth('users/' + id, 'PUT', {
        app_metadata: { beko_notification_email: email, beko_notification_phone: phone }
    });
    return updated.ok;
}

export async function staffSetupToken(email: string): Promise<string | undefined>
{
    const account = (await staffAccounts()).find(user => user.role === 'staff' && user.email === email);
    if (!account)
    {
        return undefined;
    }
    const response = await adminAuth('generate_link', 'POST', { type: 'recovery', email });
    if (!response.ok)
    {
        return undefined;
    }
    const data = await response.json() as { hashed_token?: string };
    return data.hashed_token;
}
