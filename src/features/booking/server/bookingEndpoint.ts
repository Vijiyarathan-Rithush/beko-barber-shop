import type { APIRoute } from 'astro';
import { bookingJson, handleBookingRequest } from '../../../../supabase/functions/_shared/bookingHttp';
import { book, busyTimes } from './bookingStore';

const store = { book, busyTimes };

export const GET: APIRoute = ({ request }) => handleBookingRequest(request, store);

export const POST: APIRoute = ({ request, url }) =>
{
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin)
    {
        return bookingJson({ error: 'Diese Buchung muss über die Website erfolgen.' }, 403);
    }

    return handleBookingRequest(request, store);
};
