export async function callBookingBackend({ body }: { body?: string } = {}): Promise<Response>
{
    const token = process.env.BOOKING_BACKEND_TOKEN;
    const address = process.env.BOOKING_BACKEND_URL;
    if (!token || !address)
    {
        throw new Error('The booking backend is not configured.');
    }

    const url = new URL(address);
    const local = url.protocol === 'http:' && url.hostname === '127.0.0.1';
    if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash)
    {
        throw new Error('Invalid booking backend address.');
    }

    const headers = new Headers({ 'x-beko-backend-token': token });
    if (body !== undefined)
    {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
        headers,
        method: body === undefined ? 'GET' : 'POST',
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(8_000)
    });
}
