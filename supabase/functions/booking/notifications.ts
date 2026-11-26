import type { BookingRequest } from '../_shared/booking.ts';
import { staffAccounts } from './supabaseAccess.ts';

const appointmentUrl = 'https://bekos-barbershop.ch/verwaltung/';

function escapeHtml(value: string): string
{
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

type Appointment = Pick<BookingRequest, 'name' | 'email' | 'phone' | 'date' | 'time'> & {
    service: Pick<BookingRequest['service'], 'name' | 'durationMinutes' | 'priceChf'>;
};

function bookingMessage(booking: Appointment, title: string): { text: string; html: string }
{
    const date = new Intl.DateTimeFormat('de-CH', { dateStyle: 'full', timeZone: 'Europe/Zurich' })
        .format(new Date(booking.date + 'T12:00:00Z'));
    const rows = [
        ['Termin', `${date}, ${booking.time} Uhr`],
        ['Leistung', booking.service.name],
        ['Dauer', `${booking.service.durationMinutes} Minuten`],
        ['Preis', `CHF ${booking.service.priceChf}`],
        ['Kunde', booking.name],
        ['E-Mail', booking.email]
    ];
    if (booking.phone)
    {
        rows.push(['Telefon', booking.phone]);
    }

    const details = rows.map(([label, value]) => `<tr><th align="left" scope="row" style="padding:8px;color:#555;font-weight:normal">${label}</th><td style="padding:8px;color:#171717;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join('');
    const text = ['Beko’s Barber Shop', title, '', ...rows.map(([label, value]) => `${label}: ${value}`), '', `Terminverwaltung: ${appointmentUrl}`].join('\n');
    const html = `<div lang="de-CH" style="background:#f4f2ef;padding:20px 10px;font-family:Arial,sans-serif;color:#171717">
        <div style="max-width:540px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">
            <div style="background:#171717;border-bottom:4px solid #f47721;padding:22px;color:#fff;font-size:18px;font-weight:bold">Beko’s Barber Shop</div>
            <div style="padding:22px">
                <h1 style="font-size:24px;margin:0 0 14px">${title}</h1>
                <table style="width:100%;border-collapse:collapse;font-size:15px">${details}</table>
                <p style="margin:22px 0 0"><a href="${appointmentUrl}" style="display:inline-block;background:#f47721;color:#171717;border-radius:6px;padding:12px 16px;text-decoration:none;font-weight:bold">Terminverwaltung öffnen</a></p>
            </div>
        </div>
    </div>`;
    return { text, html };
}

export function notifyStaff(id: string, booking: Appointment, event: 'booking' | 'cancellation' = 'booking'): void
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
        const title = event === 'booking' ? 'Neuer Termin' : 'Termin storniert';
        const message = bookingMessage(booking, title);

        const results = await Promise.allSettled(recipients.map(async (to) => {
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(to));
            const recipient = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + key,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': `${event}/${id}/${recipient}`
                },
                body: JSON.stringify({ from, to, subject: title + ' bei Beko’s Barber Shop', ...message }),
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
