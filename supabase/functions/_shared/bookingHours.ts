type OpeningHours = readonly [opensAt: string, closesAt: string];

const workday: readonly OpeningHours[] = [
    ['09:00', '18:30']
];

// Montag hat den Wert 1.
export const BOOKING_HOURS: Readonly<Partial<Record<number, readonly OpeningHours[]>>> = {
    1: workday,
    2: workday,
    3: workday,
    4: workday,
    5: workday,
    6: [['09:00', '17:30']]
};

export const CLOSED_DATES: ReadonlySet<string> = new Set();
