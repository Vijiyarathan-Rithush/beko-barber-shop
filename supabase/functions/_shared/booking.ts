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
}

export interface BookingRow extends TimeRange
{
    readonly id: string;
    readonly service: string;
    readonly priceChf: number;
    readonly name: string;
    readonly email: string;
}

export const BOOKING_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function hashBooking({ service, date, time, name, email }: BookingRequest): string
{
    return createHash('sha256').update(JSON.stringify([service.id, date, time, name, email])).digest('hex');
}
