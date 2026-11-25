function getHttpsUrl(value: string | undefined): string | undefined
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
const configuredBookingUrl = import.meta.env.PUBLIC_BOOKING_URL;
const bookingUrl = getHttpsUrl(configuredBookingUrl);

if (configuredBookingUrl && !bookingUrl)
{
    throw new Error('PUBLIC_BOOKING_URL must be a valid HTTPS URL without credentials.');
}

const directionsUrl = new URL('https://www.google.com/maps/dir/');
directionsUrl.searchParams.set('api', '1');
directionsUrl.searchParams.set('destination', address);

export const routes = {
    home: homePath,
    booking: homePath + 'buchen/'
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
    readonly bookingUrl: string | undefined;
    readonly logoPath: string;
    readonly openingHours: readonly string[];
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
    reviewUrl: getHttpsUrl(import.meta.env.PUBLIC_REVIEW_URL),
    bookingUrl,
    logoPath: homePath + 'beko-logo.png',
    openingHours: [],
    phone: '',
    instagramUrl: ''
};
