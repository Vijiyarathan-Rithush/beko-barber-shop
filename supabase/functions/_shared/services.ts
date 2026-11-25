export const SERVICES = [
    { id: 'haircut', name: 'Haarschnitt', durationMinutes: 20, priceChf: 25 },
    { id: 'haircut-and-beard', name: 'Haarschnitt + Bart', durationMinutes: 30, priceChf: 40 },
    { id: 'kids-haircut', name: 'Kinderhaarschnitt bis 12 Jahre', durationMinutes: 20, priceChf: 20 },
    { id: 'beard', name: 'Bart', durationMinutes: 10, priceChf: 15 },
    { id: 'beard-color', name: 'Bart färben', durationMinutes: 15, priceChf: 10 },
    { id: 'eyebrows', name: 'Augenbrauen', durationMinutes: 10, priceChf: 10 }
] as const;

export type Service = (typeof SERVICES)[number];

export function findService(id: string | null): Service | undefined
{
    return SERVICES.find((service) => service.id === id);
}

export function formatPrice(priceChf: number): string
{
    return 'CHF ' + priceChf;
}
