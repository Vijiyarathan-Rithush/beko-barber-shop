import { BOOKING_ID_PATTERN, type BookingRequest } from './booking.ts';
import { getCalendar, type TimeRange } from './calendar.ts';
import { findService } from './services.ts';

interface PublicBookingStore
{
    busyTimes(now: number): TimeRange[] | Promise<TimeRange[]>;
    book(request: BookingRequest): string | undefined | Promise<string | undefined>;
}

export function bookingJson(body: unknown, status = 200): Response
{
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function readBookingBody(request: Request): Promise<string | undefined>
{
    const reader = request.body?.getReader();
    if (!reader)
    {
        return undefined;
    }

    const decoder = new TextDecoder();
    let size = 0;
    let body = '';
    try
    {
        for (;;)
        {
            const { done, value } = await reader.read();
            if (done)
            {
                return body + decoder.decode();
            }

            size += value.byteLength;
            if (size > 4096)
            {
                await reader.cancel();
                return undefined;
            }

            body += decoder.decode(value, { stream: true });
        }
    }
    catch
    {
        return undefined;
    }
    finally
    {
        reader.releaseLock();
    }
}

export function hasJsonBody(request: Request): boolean
{
    return request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}

export async function readBookingJson(request: Request): Promise<Record<string, unknown> | undefined>
{
    const body = await readBookingBody(request);
    if (!body)
    {
        return undefined;
    }

    try
    {
        const parsed: unknown = JSON.parse(body);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
        {
            return parsed as Record<string, unknown>;
        }
    }
    catch
    {
        return undefined;
    }

    return undefined;
}

async function readBooking(request: Request): Promise<BookingRequest | undefined>
{
    const values = await readBookingJson(request);
    if (!values)
    {
        return undefined;
    }

    const { requestId, serviceId, date, time } = values;
    const name = typeof values.name === 'string' ? values.name.trim() : '';
    const email = typeof values.email === 'string' ? values.email.trim() : '';
    const service = typeof serviceId === 'string' ? findService(serviceId) : undefined;
    if (!service || !name || name.length > 100 || email.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || typeof requestId !== 'string' || !BOOKING_ID_PATTERN.test(requestId)
        || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
        || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time))
    {
        return undefined;
    }

    return { requestId, service, date, time, name, email };
}

export async function handleBookingRequest(request: Request, store: PublicBookingStore): Promise<Response>
{
    if (request.method === 'GET' || request.method === 'HEAD')
    {
        try
        {
            const now = Date.now();
            return bookingJson({ days: getCalendar(now, await store.busyTimes(now)) });
        }
        catch
        {
            return bookingJson({ error: 'Die Verfügbarkeit konnte nicht geladen werden.' }, 503);
        }
    }

    if (request.method !== 'POST')
    {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD, POST' } });
    }

    if (!hasJsonBody(request))
    {
        return bookingJson({ error: 'Ungültiges Datenformat.' }, 415);
    }

    const data = await readBooking(request);
    if (!data)
    {
        return bookingJson({ error: 'Prüfe deine Buchungs- und Kontaktdaten.' }, 400);
    }

    try
    {
        const id = await store.book(data);
        if (id)
        {
            return bookingJson({ id }, 201);
        }

        return bookingJson({ error: 'Dieser Termin ist inzwischen nicht mehr verfügbar.' }, 409);
    }
    catch
    {
        return bookingJson({ error: 'Die Buchung konnte gerade nicht abgeschlossen werden.' }, 503);
    }
}
