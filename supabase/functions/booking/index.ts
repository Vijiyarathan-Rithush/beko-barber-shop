import { matchesSecret, secretFingerprint } from '../_shared/authorization.ts';
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
    const received = request.headers.get('x-beko-backend-token') ?? '';
    if (received.length < 32 || received.length > 256)
    {
        return bookingJson({ error: 'Zugriff verweigert' }, 401);
    }

    try
    {
        const store = bookingDatabase();
        const expected = Deno.env.get('BOOKING_BACKEND_TOKEN');
        const authorized = expected
            ? matchesSecret(received, expected)
            : matchesSecret(secretFingerprint(received), await store.backendTokenFingerprint());
        if (!authorized)
        {
            return bookingJson({ error: 'Zugriff verweigert' }, 401);
        }

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
