import type { APIRoute } from 'astro';
import { findService } from '../domain/services';
import { book, busyTimes, type BookingRequest } from './bookingStore';
import { getCalendar } from './calendar';

const MAX_BODY_BYTES = 4096;

function json(body: unknown, status = 200): Response
{
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBooking(request: Request): Promise<BookingRequest | undefined>
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
                body += decoder.decode();
                break;
            }

            size += value.byteLength;
            if (size > MAX_BODY_BYTES)
            {
                await reader.cancel();
                return undefined;
            }

            body += decoder.decode(value, { stream: true });
        }

        const data: unknown = JSON.parse(body);
        if (typeof data !== 'object' || data === null)
        {
            return undefined;
        }

        const values = data as Record<string, unknown>;
        const { requestId, serviceId, date, time } = values;
        const name = typeof values.name === 'string' ? values.name.trim() : '';
        const email = typeof values.email === 'string' ? values.email.trim() : '';
        const service = typeof serviceId === 'string' ? findService(serviceId) : undefined;
        if (!service || !name || name.length > 100 || email.length > 254
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            || typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId)
            || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
            || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time))
        {
            return undefined;
        }

        return { requestId, service, date, time, name, email };
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

export const GET: APIRoute = () =>
{
    try
    {
        const now = Date.now();
        return json({ days: getCalendar(now, busyTimes(now)) });
    }
    catch
    {
        return json({ error: 'Die Verfügbarkeit konnte nicht geladen werden.' }, 503);
    }
};

export const POST: APIRoute = async ({ request, url }) =>
{
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin)
    {
        return json({ error: 'Diese Buchung muss über die Website erfolgen.' }, 403);
    }

    if (request.headers.get('content-type')?.split(';', 1)[0] !== 'application/json')
    {
        return json({ error: 'Ungültiges Datenformat.' }, 415);
    }

    const data = await readBooking(request);
    if (!data)
    {
        return json({ error: 'Prüfe deine Buchungs- und Kontaktdaten.' }, 400);
    }

    try
    {
        const id = book(data);
        if (id)
        {
            return json({ id }, 201);
        }

        return json({ error: 'Dieser Termin ist inzwischen nicht mehr verfügbar.' }, 409);
    }
    catch
    {
        return json({ error: 'Die Buchung konnte gerade nicht abgeschlossen werden.' }, 503);
    }
};
