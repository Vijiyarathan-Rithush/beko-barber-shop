import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashBooking, type BookingRequest, type BookingRow } from '../../../../supabase/functions/_shared/booking';
import { getBookingTime, type TimeRange } from '../../../../supabase/functions/_shared/calendar';

let connection: DatabaseSync | undefined;

function database(): DatabaseSync
{
    if (connection)
    {
        return connection;
    }

    const path = resolve(process.env.BOOKING_DB_PATH || 'data/bookings.sqlite');
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(path);
    try
    {
        db.exec(`
            PRAGMA busy_timeout = 5000;
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                request_id TEXT UNIQUE NOT NULL,
                request_hash TEXT NOT NULL,
                service TEXT NOT NULL,
                price_chf INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                starts_at INTEGER NOT NULL,
                ends_at INTEGER NOT NULL CHECK (ends_at > starts_at),
                cancelled_at INTEGER
            ) STRICT;
            CREATE INDEX IF NOT EXISTS booked_starts
                ON bookings(starts_at) WHERE cancelled_at IS NULL;
        `);
    }
    catch (error)
    {
        db.close();
        throw error;
    }

    connection = db;
    return db;
}

export function busyTimes(now: number): TimeRange[]
{
    return database().prepare(`
        SELECT starts_at AS startsAt, ends_at AS endsAt
        FROM bookings WHERE cancelled_at IS NULL AND ends_at > ?
        ORDER BY starts_at
    `).all(now) as unknown as TimeRange[];
}

export function book(request: BookingRequest): string | undefined
{
    const db = database();
    const requestHash = hashBooking(request);
    db.exec('BEGIN IMMEDIATE');
    try
    {
        const previous = db.prepare('SELECT id, request_hash, cancelled_at FROM bookings WHERE request_id = ?')
            .get(request.requestId);
        let bookingId: string | undefined;
        if (previous)
        {
            if (previous.request_hash === requestHash && previous.cancelled_at === null)
            {
                bookingId = String(previous.id);
            }
        }
        else
        {
            const range = getBookingTime(request.date, request.time, request.service.durationMinutes, Date.now());
            if (range && !db.prepare(`
                SELECT 1 FROM bookings
                WHERE cancelled_at IS NULL AND starts_at < ? AND ends_at > ?
                LIMIT 1
            `).get(range.endsAt, range.startsAt))
            {
                bookingId = randomUUID();
                db.prepare(`
                    INSERT INTO bookings
                        (id, request_id, request_hash, service, price_chf, name, email, starts_at, ends_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(bookingId, request.requestId, requestHash, request.service.name, request.service.priceChf,
                    request.name, request.email, range.startsAt, range.endsAt);
            }
        }

        db.exec('COMMIT');
        return bookingId;
    }
    catch (error)
    {
        db.exec('ROLLBACK');
        throw error;
    }
}

export function upcomingBookings(): BookingRow[]
{
    return database().prepare(`
        SELECT id, service, price_chf AS priceChf, name, email, starts_at AS startsAt, ends_at AS endsAt
        FROM bookings WHERE cancelled_at IS NULL AND ends_at > ?
        ORDER BY starts_at
    `).all(Date.now()) as unknown as BookingRow[];
}

export function cancelBooking(id: string): void
{
    database().prepare('UPDATE bookings SET cancelled_at = ? WHERE id = ? AND cancelled_at IS NULL')
        .run(Date.now(), id);
}
