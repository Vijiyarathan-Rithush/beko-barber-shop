import { Temporal } from '@js-temporal/polyfill';
import { BOOKING_HOURS, CLOSED_DATES } from '../../../config/bookingHours';
import { createBookingDay, type BookingDay, type Opening } from '../domain/availability';

export interface TimeRange
{
    readonly startsAt: number;
    readonly endsAt: number;
}

const TIME_ZONE = 'Europe/Zurich';
const BOOKING_DAYS = 14;
const SLOT_MINUTES = 10;
const MINUTE = 60_000;

function localDate(now: number): Temporal.PlainDate
{
    return Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(TIME_ZONE).toPlainDate();
}

function zonedTime(date: Temporal.PlainDate, time: string): number | undefined
{
    try
    {
        return date.toPlainDateTime(time)
            .toZonedDateTime(TIME_ZONE, { disambiguation: 'reject' }).epochMilliseconds;
    }
    catch
    {
        return undefined;
    }
}

const timeLabel = new Intl.DateTimeFormat('de-CH', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
});

interface OpeningSlot
{
    readonly label: string;
    readonly startsAt: number;
    readonly freeMinutes: number;
}

function openingSlots(date: Temporal.PlainDate, now: number, busy: readonly TimeRange[]): OpeningSlot[]
{
    const slots: OpeningSlot[] = [];
    if (CLOSED_DATES.has(date.toString()))
    {
        return slots;
    }

    for (const [opensAt, closesAt] of BOOKING_HOURS[date.dayOfWeek] ?? [])
    {
        const start = zonedTime(date, opensAt);
        const end = zonedTime(date, closesAt);
        if (start === undefined || end === undefined || end <= start)
        {
            continue;
        }

        for (let begins = start; begins < end; begins += SLOT_MINUTES * MINUTE)
        {
            if (begins <= now || busy.some((period) => period.startsAt <= begins && period.endsAt > begins))
            {
                continue;
            }

            let freeUntil = end;
            for (const period of busy)
            {
                if (period.startsAt > begins && period.startsAt < freeUntil)
                {
                    freeUntil = period.startsAt;
                }
            }

            const label = timeLabel.format(begins);
            if (zonedTime(date, label) === begins)
            {
                slots.push({ label, startsAt: begins, freeMinutes: Math.floor((freeUntil - begins) / MINUTE) });
            }
        }
    }

    return slots;
}

export function getCalendar(now: number, busy: readonly TimeRange[]): BookingDay[]
{
    const firstDay = localDate(now);
    const days: BookingDay[] = [];

    for (let index = 0; index < BOOKING_DAYS; index++)
    {
        const day = firstDay.add({ days: index });
        const openings: Opening[] = openingSlots(day, now, busy).map((slot) => [slot.label, slot.freeMinutes]);
        days.push(createBookingDay(new Date(day.toString() + 'T00:00:00Z'), openings));
    }

    return days;
}

export function getBookingTime(dateId: string, time: string, duration: number, now: number): TimeRange | undefined
{
    let date: Temporal.PlainDate;
    try
    {
        date = Temporal.PlainDate.from(dateId);
    }
    catch
    {
        return undefined;
    }

    const firstDay = localDate(now);
    if (Temporal.PlainDate.compare(date, firstDay) < 0
        || Temporal.PlainDate.compare(date, firstDay.add({ days: BOOKING_DAYS })) >= 0)
    {
        return undefined;
    }

    const slot = openingSlots(date, now, []).find((value) => value.label === time);
    if (!slot || slot.freeMinutes < duration)
    {
        return undefined;
    }

    return { startsAt: slot.startsAt, endsAt: slot.startsAt + duration * MINUTE };
}
