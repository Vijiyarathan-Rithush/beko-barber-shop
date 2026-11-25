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
const directionsUrl = new URL('https://www.google.com/maps/dir/');
directionsUrl.searchParams.set('api', '1');
directionsUrl.searchParams.set('destination', address);

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
    reviewUrl: getReviewUrl(import.meta.env.PUBLIC_REVIEW_URL),
    logoPath: '',
    openingHours: [],
    phone: '',
    instagramUrl: ''
};
