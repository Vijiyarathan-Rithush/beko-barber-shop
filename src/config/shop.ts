import { BOOKING_HOURS } from '../../supabase/functions/_shared/bookingHours';

function getReviewUrl(value: string | undefined): string | undefined
{
    if (!value)
    {
        return undefined;
    }

    try
    {
        const url = new URL(value);
        if (url.protocol === 'https:' && !url.username && !url.password)
        {
            return url.href;
        }
    }
    catch
    {
        return undefined;
    }

    return undefined;
}

const streetAddress = 'Rorschacherstrasse 52';
const locality = '9000 St. Gallen';
const address = [streetAddress, locality].join(', ');
const homePath = import.meta.env.BASE_URL.replace(/\/+$/, '') + '/';
const directionsUrl = new URL('https://www.google.com/maps/dir/');
directionsUrl.searchParams.set('api', '1');
directionsUrl.searchParams.set('destination', address);

export const routes = {
    home: homePath,
    booking: homePath + 'buchen/',
    staffLogin: homePath + 'verwaltung/anmelden/'
} as const;

interface ShopConfig
{
    readonly name: string;
    readonly barber: string;
    readonly streetAddress: string;
    readonly locality: string;
    readonly address: string;
    readonly directionsUrl: string;
    readonly reviewUrl: string | undefined;
    readonly logoPath: string;
    readonly openingHours: readonly { readonly day: string; readonly hours: string }[];
    readonly phone: string;
    readonly instagramUrl: string;
}

export const shop: ShopConfig = {
    name: 'Beko’s Barber Shop',
    barber: 'Bekim',
    streetAddress,
    locality,
    address,
    directionsUrl: directionsUrl.href,
    reviewUrl: getReviewUrl(import.meta.env.PUBLIC_REVIEW_URL),
    logoPath: homePath + 'beko-logo.png',
    openingHours: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
        .map((day, index) => {
            const periods = BOOKING_HOURS[index + 1] ?? [];
            const hours = periods.map(([opens, closes]) => opens + ' bis ' + closes).join(', ');
            return { day, hours: hours || 'Geschlossen' };
        }),
    phone: '',
    instagramUrl: ''
};
