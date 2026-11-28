import { notifyStaff } from './notifications.ts';
import { BOOKING_HISTORY_LIMIT, hashBooking, type BookingHistoryRow, type BookingRequest, type BookingRow } from '../_shared/booking.ts';
import { getBookingTime, type TimeRange } from '../_shared/calendar.ts';
import { supabaseService } from './supabaseAccess.ts';

export function bookingDatabase()
{
    const { project, headers } = supabaseService();

    async function dataRequest(resource: string, parameters: Record<string, string>, init?: RequestInit): Promise<Response>
    {
        const url = new URL('/rest/v1/' + resource, project);
        url.search = new URLSearchParams(parameters).toString();
        const requestHeaders = new Headers(headers);
        new Headers(init?.headers).forEach((value, key) => requestHeaders.set(key, value));
        const response = await fetch(url, { ...init, headers: requestHeaders, redirect: 'error', signal: AbortSignal.timeout(6_000) });
        if (!response.ok)
        {
            throw new Error('The Supabase Data API request failed.');
        }

        return response;
    }

    return {
        async backendTokenFingerprint(): Promise<string>
        {
            const response = await dataRequest('beko_backend_access', { select: 'token_sha256', singleton: 'eq.true' });
            const [access] = await response.json() as Array<{ token_sha256: string }>;
            return access?.token_sha256 ?? '';
        },

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
            const { requestId, service, date, time, name, email, phone } = request;
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
                    p_phone: phone ?? null,
                    p_starts_at: range?.startsAt ?? null,
                    p_ends_at: range?.endsAt ?? null
                })
            });
            const id: unknown = await response.json();
            if (typeof id === 'string')
            {
                notifyStaff(id, request);
                return id;
            }
            return undefined;
        },

        async upcomingBookings(now = Date.now()): Promise<BookingRow[]>
        {
            const response = await dataRequest('beko_bookings', {
                select: 'id,service,priceChf:price_chf,name,email,phone,startsAt:starts_at,endsAt:ends_at',
                cancelled_at: 'is.null',
                ends_at: 'gt.' + now,
                order: 'starts_at.asc'
            });
            return await response.json() as BookingRow[];
        },

        async bookingHistory(now: number): Promise<BookingHistoryRow[]>
        {
            const response = await dataRequest('beko_bookings', {
                select: 'id,service,name,startsAt:starts_at,cancelledAt:cancelled_at',
                or: `(cancelled_at.not.is.null,ends_at.lte.${now})`,
                order: 'starts_at.desc,id.desc',
                limit: String(BOOKING_HISTORY_LIMIT)
            });
            return await response.json() as BookingHistoryRow[];
        },

        async cancelBooking(id: string): Promise<void>
        {
            const response = await dataRequest('beko_bookings', {
                id: 'eq.' + id,
                cancelled_at: 'is.null',
                select: 'id,service,priceChf:price_chf,name,email,phone,startsAt:starts_at,endsAt:ends_at'
            }, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ cancelled_at: Date.now() })
            });
            const [appointment] = await response.json() as BookingRow[];
            if (appointment)
            {
                const starts = new Date(appointment.startsAt);
                const timeZone = 'Europe/Zurich';
                const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
                    .formatToParts(starts);
                const part = (type: string) => parts.find(value => value.type === type)?.value;
                notifyStaff(id, {
                    date: [part('year'), part('month'), part('day')].join('-'),
                    time: new Intl.DateTimeFormat('de-CH', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(starts),
                    name: appointment.name,
                    email: appointment.email,
                    phone: appointment.phone ?? undefined,
                    service: {
                        name: appointment.service,
                        priceChf: appointment.priceChf,
                        durationMinutes: (appointment.endsAt - appointment.startsAt) / 60_000
                    }
                }, 'cancellation');
            }
        }
    };
}
