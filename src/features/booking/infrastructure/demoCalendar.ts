import { createBookingDay, type BookingDay, type Opening } from '../../../../supabase/functions/_shared/availability';

const OPENINGS: readonly (readonly Opening[])[] = [
    [['09:30', 20], ['10:10', 40], ['10:50', 20], ['11:30', 35], ['13:00', 30]],
    [['09:10', 15], ['10:30', 30], ['11:20', 20], ['14:00', 40], ['15:30', 30]],
    [],
    [['09:30', 40], ['10:10', 30], ['13:10', 20], ['14:00', 35], ['16:00', 30]],
    [['09:00', 20], ['10:30', 40], ['11:50', 15], ['14:00', 30], ['15:10', 30]]
];

const zurichDate = new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
});

export function createDemoCalendar(now = new Date()): readonly BookingDay[]
{
    const parts = Object.fromEntries(zurichDate.formatToParts(now).map(({ type, value }) => [type, value]));
    const cursor = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    const days: BookingDay[] = [];

    for (const openings of OPENINGS)
    {
        do
        {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6);

        days.push(createBookingDay(cursor, openings));
    }

    return days;
}
