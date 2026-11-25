import { createHash, timingSafeEqual } from 'node:crypto';

export function matchesSecret(actual: string, expected: string): boolean
{
    const hash = (value: string) => createHash('sha256').update(value).digest();
    return timingSafeEqual(hash(actual), hash(expected));
}
