export function contactPhone(value: string): string | undefined
{
    if (value.length > 40 || !/^\+?[0-9 ().-]+$/.test(value))
    {
        return undefined;
    }

    const phone = value.replace(/[ ().-]/g, '');
    return /^\+?\d{7,15}$/.test(phone) ? phone : undefined;
}
