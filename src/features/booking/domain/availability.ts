export type Opening = readonly [time: string, availableMinutes: number];

export interface BookingDay
{
    readonly id: string;
    readonly weekday: string;
    readonly shortDate: string;
    readonly fullDate: string;
    readonly openings: readonly Opening[];
}
