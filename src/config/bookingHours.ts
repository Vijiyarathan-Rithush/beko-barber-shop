type OpeningHours = readonly [opensAt: string, closesAt: string];

const exampleWorkday: readonly OpeningHours[] = [
    ['09:00', '12:00'],
    ['13:00', '18:00']
];

// Beispielzeiten für die lokale Abnahme. Montag hat den Wert 1.
export const BOOKING_HOURS: Readonly<Partial<Record<number, readonly OpeningHours[]>>> = {
    1: exampleWorkday,
    2: exampleWorkday,
    3: exampleWorkday,
    4: exampleWorkday,
    5: exampleWorkday,
    6: exampleWorkday
};

export const CLOSED_DATES: ReadonlySet<string> = new Set();
