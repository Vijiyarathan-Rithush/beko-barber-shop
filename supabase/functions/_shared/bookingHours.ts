type OpeningHours = readonly [opensAt: string, closesAt: string];

const shortDay: readonly OpeningHours[] = [['09:00', '18:00']];
const longDay: readonly OpeningHours[] = [['09:00', '19:00']];

// Montag hat den Wert 1.
export const BOOKING_HOURS: Readonly<Partial<Record<number, readonly OpeningHours[]>>> = {
    1: shortDay,
    2: longDay,
    3: longDay,
    4: longDay,
    5: longDay,
    6: shortDay
};

export const CLOSED_DATES: ReadonlySet<string> = new Set();
