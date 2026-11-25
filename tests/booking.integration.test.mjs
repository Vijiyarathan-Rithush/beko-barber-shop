import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout } from 'node:timers/promises';
import test from 'node:test';

async function choosePort()
{
    const server = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    await new Promise((resolve, reject) => server.close((error) =>
    {
        if (error)
        {
            reject(error);
            return;
        }

        resolve();
    }));
    return port;
}

async function waitForCalendar(server)
{
    for (let attempt = 0; attempt < 50; attempt++)
    {
        if (server.child.exitCode !== null)
        {
            break;
        }

        try
        {
            const response = await fetch(server.url + '/api/bookings');
            if (response.ok)
            {
                return await response.json();
            }
        }
        catch
        {
            // The process can still be starting.
        }

        await setTimeout(100);
    }

    throw new Error('The booking server did not start. ' + server.logs.join(''));
}

async function stop(server)
{
    if (server.child.exitCode === null && server.child.signalCode === null)
    {
        const exited = once(server.child, 'exit');
        server.child.kill();
        await exited;
    }
}

function book(server, details)
{
    return fetch(server.url + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
    });
}

function minute(label)
{
    const [hours, minutes] = label.split(':').map(Number);
    return hours * 60 + minutes;
}

test('stores, rejects overlapping bookings, and reopens cancelled slots', { timeout: 25000 }, async () =>
{
    const directory = mkdtempSync(join(tmpdir(), 'beko-booking-test-'));
    const dbPath = join(directory, 'bookings.sqlite');
    const password = randomBytes(24).toString('hex');
    const auth = 'Basic ' + Buffer.from('bekim:' + password).toString('base64');
    const servers = [];

    async function start()
    {
        const port = await choosePort();
        const logs = [];
        const child = spawn(process.execPath, ['dist-booking/server/entry.mjs'], {
            env: {
                ...process.env,
                HOST: '127.0.0.1',
                PORT: String(port),
                BOOKING_DB_PATH: dbPath,
                BOOKING_ADMIN_PASSWORD: password
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        child.stdout.on('data', (chunk) => logs.push(chunk.toString()));
        child.stderr.on('data', (chunk) => logs.push(chunk.toString()));
        const server = { child, url: 'http://127.0.0.1:' + port, logs };
        servers.push(server);
        await waitForCalendar(server);
        return server;
    }

    try
    {
        const first = await start();
        const second = await start();
        const home = await fetch(first.url + '/buchen/');
        assert.equal(home.status, 200);
        const bookingPage = await home.text();
        assert.match(bookingPage, /data-booking-api="\/api\/bookings"/);
        assert.doesNotMatch(bookingPage, />Demo abschliessen</);

        const { days } = await waitForCalendar(first);
        const day = days.find((entry) => entry.openings.some(([label, free], index) =>
            free >= 20 && entry.openings[index + 1]?.[1] >= 20
                && minute(entry.openings[index + 1][0]) - minute(label) === 10
        ));
        assert.ok(day);
        const index = day.openings.findIndex(([label, free], index) =>
            free >= 20 && day.openings[index + 1]?.[1] >= 20
                && minute(day.openings[index + 1][0]) - minute(label) === 10
        );
        const times = [day.openings[index][0], day.openings[index + 1][0]];
        const requests = times.map((time, index) => ({
            requestId: randomUUID(),
            date: day.id,
            time,
            serviceId: 'haircut',
            name: 'Testkunde ' + index,
            email: 'test' + index + '@example.test'
        }));

        const responses = await Promise.all([book(first, requests[0]), book(second, requests[1])]);
        assert.deepEqual(responses.map(({ status }) => status).sort(), [201, 409]);
        const winner = responses.findIndex(({ status }) => status === 201);
        const { id } = await responses[winner].json();
        assert.ok(id);
        const db = new DatabaseSync(dbPath, { readOnly: true });
        try
        {
            assert.equal(db.prepare('SELECT COUNT(*) AS count FROM bookings').get().count, 1);
        }
        finally
        {
            db.close();
        }

        const replay = await book(second, requests[winner]);
        assert.equal(replay.status, 201);
        assert.equal((await replay.json()).id, id);
        const otherRequest = await book(second, { ...requests[winner], email: 'andere@example.test' });
        assert.equal(otherRequest.status, 409);

        const updatedCalendar = await waitForCalendar(second);
        assert.doesNotMatch(JSON.stringify(updatedCalendar), /example\.test/);
        const blocked = updatedCalendar.days.find((entry) => entry.id === day.id);
        assert.equal(blocked.openings.some(([time]) => time === times[winner]), false);

        const denied = await fetch(second.url + '/verwaltung/');
        assert.equal(denied.status, 401);
        const administration = await fetch(second.url + '/verwaltung/', { headers: { Authorization: auth } });
        assert.equal(administration.status, 200);
        assert.match(await administration.text(), /Testkunde/);

        await stop(first);
        const restarted = await start();
        const afterRestart = await waitForCalendar(restarted);
        assert.equal(afterRestart.days.find((entry) => entry.id === day.id).openings
            .some(([time]) => time === times[winner]), false);

        const crossSite = await fetch(restarted.url + '/verwaltung/', {
            method: 'POST',
            headers: { Authorization: auth, Origin: 'https://example.test' },
            body: new URLSearchParams({ id })
        });
        assert.equal(crossSite.status, 403);

        const cancel = await fetch(restarted.url + '/verwaltung/', {
            method: 'POST',
            redirect: 'manual',
            headers: { Authorization: auth, Origin: restarted.url },
            body: new URLSearchParams({ id })
        });
        assert.equal(cancel.status, 303, await cancel.text());
        const reopened = await waitForCalendar(second);
        assert.ok(reopened.days.find((entry) => entry.id === day.id).openings
            .some(([time, free]) => time === times[winner] && free >= 20));
    }
    finally
    {
        await Promise.all(servers.map(stop));
        rmSync(directory, { recursive: true, force: true });
    }
});
