import type { APIRoute } from 'astro';
import { bookingJson, hasJsonBody, readBookingBody } from '../../../../supabase/functions/_shared/bookingHttp';
import { callBookingBackend } from './supabaseGateway';

async function forwardBooking(body?: string): Promise<Response>
{
    try
    {
        const response = await callBookingBackend({ body });
        if ([200, 201, 400, 409, 415, 503].includes(response.status)
            && response.headers.get('Content-Type')?.startsWith('application/json'))
        {
            return new Response(response.body, {
                status: response.status,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }
    }
    catch
    {
        // The same response covers platform and configuration failures.
    }

    return bookingJson({ error: 'Das Buchungssystem ist vorübergehend nicht verfügbar.' }, 503);
}

export const GET: APIRoute = () => forwardBooking();

export const POST: APIRoute = async ({ request, url }) =>
{
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin)
    {
        return bookingJson({ error: 'Diese Buchung muss über die Website erfolgen.' }, 403);
    }

    if (!hasJsonBody(request))
    {
        return bookingJson({ error: 'Ungültiges Datenformat.' }, 415);
    }

    const body = await readBookingBody(request);
    if (!body)
    {
        return bookingJson({ error: 'Prüfe deine Buchungs- und Kontaktdaten.' }, 400);
    }

    return forwardBooking(body);
};
