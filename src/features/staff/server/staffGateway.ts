export async function callStaffBackend(accessToken: string, action: 'management' | 'staff-accounts', id?: string): Promise<Response>
{
    const project = process.env.SUPABASE_URL;
    if (!project)
    {
        throw new Error('Supabase Auth is not configured.');
    }

    const url = new URL('/functions/v1/booking', project);
    url.searchParams.set('action', action);
    const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
    if (id)
    {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        headers,
        method: id ? 'POST' : 'GET',
        body: id ? JSON.stringify({ id }) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok)
    {
        throw new Error('The booking administration request failed.');
    }

    return response;
}
