export type StaffRole = 'staff' | 'admin';

export interface StaffAccount
{
    readonly email: string;
    readonly role: StaffRole;
}

export function staffAccount(user: {
    email?: string;
    app_metadata?: unknown;
} | null): StaffAccount | undefined
{
    const metadata = user?.app_metadata;
    const role = typeof metadata === 'object' && metadata !== null && 'beko_role' in metadata ? metadata.beko_role : undefined;
    if (typeof user?.email === 'string' && (role === 'staff' || role === 'admin'))
    {
        return { email: user.email, role };
    }

    return undefined;
}

export interface StaffDirectoryEntry extends StaffAccount
{
    readonly id: string;
    readonly notificationEmail: string;
    readonly notificationPhone: string;
}
