import { matchesSecret } from '../_shared/authorization.ts';
import { BOOKING_ID_PATTERN } from '../_shared/booking.ts';
import { bookingJson, handleBookingRequest, readBookingJson } from '../_shared/bookingHttp.ts';
import { bookingDatabase } from './store.ts';

async function handleManagement(request: Request, store: ReturnType<typeof bookingDatabase>): Promise<Response>
{
    if (request.method === 'GET')
    {
        return bookingJson(await store.upcomingBookings());
    }

    if (request.method !== 'POST')
    {
        return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
    }

    const data = await readBookingJson(request);
    if (typeof data?.id !== 'string' || !BOOKING_ID_PATTERN.test(data.id))
    {
        return bookingJson({ error: 'Ungültiger Termin' }, 400);
    }

    await store.cancelBooking(data.id);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

Deno.serve(async (request) =>
{
    const expected = Deno.env.get('BOOKING_BACKEND_TOKEN');
    const received = request.headers.get('x-beko-backend-token') ?? '';
    if (!expected || expected.length < 32 || !matchesSecret(received, expected))
    {
        return bookingJson({ error: 'Zugriff verweigert' }, 401);
    }

    try
    {
        const store = bookingDatabase();
        if (new URL(request.url).searchParams.get('action') === 'management')
        {
            return await handleManagement(request, store);
        }

        return await handleBookingRequest(request, store);
    }
    catch
    {
        return bookingJson({ error: 'Das Buchungssystem ist vorübergehend nicht verfügbar.' }, 503);
    }
});
