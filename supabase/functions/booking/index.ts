import { contactPhone } from '../_shared/contact.ts';
import { matchesSecret, secretFingerprint } from '../_shared/authorization.ts';
import { BOOKING_ID_PATTERN } from '../_shared/booking.ts';
import { bookingJson, handleBookingRequest, readBookingJson } from '../_shared/bookingHttp.ts';
import { authenticateStaff, createStaff, saveStaffContact, staffAccounts, staffSetupToken } from './supabaseAccess.ts';
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

async function handleStaff(request: Request, action: string): Promise<Response>
{
    const account = await authenticateStaff(request);
    if (!account)
    {
        return bookingJson({ error: 'Zugriff verweigert' }, 401);
    }

    if (action === 'management')
    {
        return handleManagement(request, bookingDatabase());
    }

    if (action === 'appointment-overview')
    {
        if (request.method !== 'GET')
        {
            return new Response(null, { status: 405, headers: { Allow: 'GET' } });
        }

        const store = bookingDatabase();
        const now = Date.now();
        const [upcoming, history] = await Promise.all([store.upcomingBookings(now), store.bookingHistory(now)]);
        const historyIds = new Set(history.map(({ id }) => id));
        return bookingJson({ upcoming: upcoming.filter(({ id }) => !historyIds.has(id)), history });
    }

    if (account.role !== 'admin')
    {
        return bookingJson({ error: 'Zugriff verweigert' }, 403);
    }
    if (request.method === 'POST')
    {
        const data = await readBookingJson(request);
        const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
        const validEmail = email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (data?.operation === 'create' && validEmail)
        {
            return await createStaff(email) ? bookingJson({}, 201) : bookingJson({}, 409);
        }
        if (data?.operation === 'setup' && validEmail)
        {
            const token = await staffSetupToken(email);
            return token ? bookingJson({ token }) : bookingJson({}, 400);
        }
        if (data?.operation === 'contact' && typeof data.id === 'string' && BOOKING_ID_PATTERN.test(data.id))
        {
            const rawPhone = typeof data.phone === 'string' ? data.phone.trim() : '';
            const phone = rawPhone ? contactPhone(rawPhone) : '';
            if ((!email || validEmail) && phone !== undefined && await saveStaffContact(data.id, email, phone))
            {
                return bookingJson({});
            }
        }

        return bookingJson({}, 400);
    }
    if (request.method !== 'GET')
    {
        return new Response(null, { status: 405, headers: { Allow: 'GET' } });
    }

    return bookingJson(await staffAccounts());
}

Deno.serve(async (request) =>
{
    try
    {
        const action = new URL(request.url).searchParams.get('action');
        if (action === 'management' || action === 'appointment-overview' || action === 'staff-accounts')
        {
            return await handleStaff(request, action);
        }

        const received = request.headers.get('x-beko-backend-token') ?? '';
        if (received.length < 32 || received.length > 256)
        {
            return bookingJson({ error: 'Zugriff verweigert' }, 401);
        }

        const store = bookingDatabase();
        const expected = Deno.env.get('BOOKING_BACKEND_TOKEN');
        const authorized = expected
            ? matchesSecret(received, expected)
            : matchesSecret(secretFingerprint(received), await store.backendTokenFingerprint());
        if (!authorized)
        {
            return bookingJson({ error: 'Zugriff verweigert' }, 401);
        }

        return await handleBookingRequest(request, store);
    }
    catch
    {
        return bookingJson({ error: 'Das Buchungssystem ist vorübergehend nicht verfügbar.' }, 503);
    }
});
