export type Opening = readonly [time: string, availableMinutes: number];

export interface BookingDay
{
    readonly id: string;
    readonly weekday: string;
    readonly shortDate: string;
    readonly fullDate: string;
    readonly openings: readonly Opening[];
}

const weekday = new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', weekday: 'short' });
const shortDate = new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const fullDate = new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', dateStyle: 'full' });

export function createBookingDay(date: Date, openings: readonly Opening[]): BookingDay
{
    return {
        id: date.toISOString().slice(0, 10),
        weekday: weekday.format(date).replace('.', ''),
        shortDate: shortDate.format(date),
        fullDate: fullDate.format(date),
        openings
    };
}
