import type { BookingRequest } from '../_shared/booking.ts';
import { staffAccounts } from './supabaseAccess.ts';

export function notifyStaff(id: string, booking: BookingRequest): void
{
    const key = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('BOOKING_NOTIFICATION_FROM');
    const runtime = (globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil(task: Promise<unknown>): void };
    }).EdgeRuntime;
    if (!key || !from || !runtime)
    {
        return;
    }

    runtime.waitUntil(send().catch(() => console.error('Booking notification failed for booking', id)));

    async function send(): Promise<void>
    {
        const recipients = [...new Set((await staffAccounts())
            .filter(account => account.role === 'staff' && account.notificationEmail)
            .map(account => account.notificationEmail))].sort();
        const message = [
            'Ein neuer Termin wurde gebucht.',
            `${booking.date} um ${booking.time} Uhr`,
            booking.service.name,
            booking.name,
            booking.email,
            booking.phone
        ].filter(Boolean).join('\n');

        const results = await Promise.allSettled(recipients.map(async (to) => {
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(to));
            const recipient = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + key,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': `booking/${id}/${recipient}`
                },
                body: JSON.stringify({ from, to, subject: 'Neuer Termin bei Beko’s Barber Shop', text: message }),
                signal: AbortSignal.timeout(5_000),
                redirect: 'error'
            });
            if (!response.ok)
            {
                throw new Error('Resend did not accept the booking notification.');
            }
        }));
        if (results.some(result => result.status === 'rejected'))
        {
            throw new Error('At least one booking notification failed.');
        }
    }
}
