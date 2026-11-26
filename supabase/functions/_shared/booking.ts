import { createHash } from 'node:crypto';
import type { TimeRange } from './calendar.ts';
import type { Service } from './services.ts';

export interface BookingRequest
{
    readonly requestId: string;
    readonly service: Service;
    readonly date: string;
    readonly time: string;
    readonly name: string;
    readonly email: string;
    readonly phone?: string;
}

export interface BookingRow extends TimeRange
{
    readonly id: string;
    readonly service: string;
    readonly priceChf: number;
    readonly name: string;
    readonly email: string;
    readonly phone?: string | null;
}

export interface BookingHistoryRow extends Pick<BookingRow, 'id' | 'service' | 'name' | 'startsAt'>
{
    readonly cancelledAt: number | null;
}

export interface BookingOverview
{
    readonly upcoming: BookingRow[];
    readonly history: BookingHistoryRow[];
}

export const BOOKING_HISTORY_LIMIT = 30;

export const BOOKING_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function hashBooking({ service, date, time, name, email, phone }: BookingRequest): string
{
    return createHash('sha256').update(JSON.stringify([service.id, date, time, name, email, ...(phone ? [phone] : [])])).digest('hex');
}
