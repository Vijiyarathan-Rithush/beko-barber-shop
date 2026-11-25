import { hashBooking, type BookingRequest, type BookingRow } from '../_shared/booking.ts';
import { getBookingTime, type TimeRange } from '../_shared/calendar.ts';

export function bookingDatabase()
{
    const project = Deno.env.get('SUPABASE_URL');
    const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}') as Record<string, string>;
    const key = secretKeys.default || legacy;
    if (!project || !key)
    {
        throw new Error('The Supabase Data API is not configured.');
    }

    const headers = new Headers({ apikey: key, 'Content-Type': 'application/json' });
    if (!secretKeys.default)
    {
        headers.set('Authorization', 'Bearer ' + key);
    }

    async function dataRequest(resource: string, parameters: Record<string, string>, init?: RequestInit): Promise<Response>
    {
        const url = new URL('/rest/v1/' + resource, project);
        url.search = new URLSearchParams(parameters).toString();
        const response = await fetch(url, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(6_000) });
        if (!response.ok)
        {
            throw new Error('The Supabase Data API request failed.');
        }

        return response;
    }

    return {
        async busyTimes(now: number): Promise<TimeRange[]>
        {
            const response = await dataRequest('beko_bookings', {
                select: 'startsAt:starts_at,endsAt:ends_at',
                cancelled_at: 'is.null',
                ends_at: 'gt.' + now,
                order: 'starts_at.asc'
            });
            return await response.json() as TimeRange[];
        },

        async book(request: BookingRequest): Promise<string | undefined>
        {
            const { requestId, service, date, time, name, email } = request;
            const range = getBookingTime(date, time, service.durationMinutes, Date.now());
            const response = await dataRequest('rpc/beko_reserve_booking', {}, {
                method: 'POST',
                body: JSON.stringify({
                    p_request_id: requestId,
                    p_request_hash: hashBooking(request),
                    p_service: service.name,
                    p_price_chf: service.priceChf,
                    p_name: name,
                    p_email: email,
                    p_starts_at: range?.startsAt ?? null,
                    p_ends_at: range?.endsAt ?? null
                })
            });
            const id: unknown = await response.json();
            return typeof id === 'string' ? id : undefined;
        },

        async upcomingBookings(): Promise<BookingRow[]>
        {
            const response = await dataRequest('beko_bookings', {
                select: 'id,service,priceChf:price_chf,name,email,startsAt:starts_at,endsAt:ends_at',
                cancelled_at: 'is.null',
                ends_at: 'gt.' + Date.now(),
                order: 'starts_at.asc'
            });
            return await response.json() as BookingRow[];
        },

        async cancelBooking(id: string): Promise<void>
        {
            await dataRequest('beko_bookings', { id: 'eq.' + id, cancelled_at: 'is.null' }, {
                method: 'PATCH',
                body: JSON.stringify({ cancelled_at: Date.now() })
            });
        }
    };
}
