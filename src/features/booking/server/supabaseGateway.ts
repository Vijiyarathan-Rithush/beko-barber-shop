import type { BookingRow } from '../../../../supabase/functions/_shared/booking';

interface BackendRequest
{
    readonly body?: string;
    readonly management?: boolean;
}

export async function callBookingBackend({ body, management }: BackendRequest = {}): Promise<Response>
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

    if (management)
    {
        url.searchParams.set('action', 'management');
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

export async function upcomingBookings(): Promise<BookingRow[]>
{
    const response = await callBookingBackend({ management: true });
    if (!response.ok)
    {
        throw new Error('Could not load bookings.');
    }

    return await response.json() as BookingRow[];
}

export async function cancelBooking(id: string): Promise<void>
{
    const response = await callBookingBackend({ management: true, body: JSON.stringify({ id }) });
    if (!response.ok)
    {
        throw new Error('Could not cancel the booking.');
    }
}
