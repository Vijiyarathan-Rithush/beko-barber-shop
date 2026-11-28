import { createHash, timingSafeEqual } from 'node:crypto';

function hashSecret(value: string)
{
    return createHash('sha256').update(value).digest();
}

export function matchesSecret(actual: string, expected: string): boolean
{
    return timingSafeEqual(hashSecret(actual), hashSecret(expected));
}

export function secretFingerprint(value: string): string
{
    return hashSecret(value).toString('hex');
}
