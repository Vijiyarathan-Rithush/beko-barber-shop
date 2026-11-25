import { shop } from '../../config/shop';
import { BookingSelection } from './application/BookingSelection';
import { findService, formatPrice } from './domain/services';
import { createDemoCalendar } from './infrastructure/demoCalendar';

const view = document.querySelector<HTMLElement>('[data-booking]');

if (view)
{
    enableBooking(view);
}

function element<T extends HTMLElement>(container: HTMLElement, selector: string): T
{
    const match = container.querySelector<T>(selector);
    if (!match)
    {
        throw new Error('Booking element is missing: ' + selector);
    }

    return match;
}

function enableBooking(view: HTMLElement): void
{
    const selection = new BookingSelection(createDemoCalendar());
    const dayOptions = element(view, '[data-days]');
    const timeOptions = element(view, '[data-times]');
    const scheduleStatus = element(view, '[data-schedule-status]');
    const nextDayButton = element<HTMLButtonElement>(view, '[data-next-day]');
    const summary = element(view, '[data-summary]');
    const summaryService = element(view, '[data-summary-service]');
    const summaryDate = element(view, '[data-summary-date]');
    const summaryTime = element(view, '[data-summary-time]');
    const summaryPrice = element(view, '[data-summary-price]');
    const nextButton = element<HTMLButtonElement>(view, '[data-next]');
    const selectionStep = element(view, '[data-step="selection"]');
    const contactStep = element(view, '[data-step="contact"]');
    const confirmationStep = element(view, '[data-step="confirmation"]');
    const form = element<HTMLFormElement>(contactStep, 'form');
    const contactFields = element<HTMLFieldSetElement>(form, 'fieldset');
    const nameInput = element<HTMLInputElement>(form, '#demo-name');
    const emailInput = element<HTMLInputElement>(form, '#demo-email');
    const nameError = element(form, '#demo-name-error');
    const emailError = element(form, '#demo-email-error');
    const serviceRadios = view.querySelectorAll<HTMLInputElement>('[name="service"]');

    for (const day of selection.days)
    {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.day = day.id;
        button.className = 'day-option';
        button.setAttribute('aria-label', day.fullDate);
        const label = document.createElement('strong');
        label.textContent = day.weekday;
        const date = document.createElement('span');
        date.textContent = day.shortDate;
        button.append(label, date);
        dayOptions.append(button);
    }

    const preferredService = findService(new URLSearchParams(window.location.search).get('service'));
    if (preferredService)
    {
        selection.selectService(preferredService);
    }

    for (const radio of serviceRadios)
    {
        radio.checked = radio.value === preferredService?.id;
        radio.disabled = false;
    }

    const dockObserver = new ResizeObserver(([entry]) =>
    {
        if (entry && !summary.hidden)
        {
            document.body.style.setProperty('--booking-dock-height', summary.offsetHeight + 'px');
        }
    });
    dockObserver.observe(summary);
    document.body.classList.add('has-booking-dock');
    contactFields.disabled = false;
    renderSchedule();

    selectionStep.addEventListener('change', (event) =>
    {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.name !== 'service')
        {
            return;
        }

        const service = findService(input.value);
        if (service)
        {
            selection.selectService(service);
            renderSchedule();
        }
    });

    dayOptions.addEventListener('click', (event) =>
    {
        const button = clickedOption(event, '[data-day]');
        if (button?.dataset.day)
        {
            selection.selectDay(button.dataset.day);
            renderSchedule();
        }
    });

    timeOptions.addEventListener('click', (event) =>
    {
        const button = clickedOption(event, '[data-time]');
        if (button?.dataset.time)
        {
            selection.selectTime(button.dataset.time);
            updateSelection();
        }
    });

    nextDayButton.addEventListener('click', () =>
    {
        const day = selection.nextAvailableDay();
        if (day)
        {
            selection.selectDay(day.id);
            renderSchedule();
            const active = dayOptions.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
            active?.focus();
        }
    });

    nextButton.addEventListener('click', () =>
    {
        if (selection.appointment)
        {
            showStep(contactStep);
        }
    });

    element(contactStep, '[data-back]').addEventListener('click', () =>
    {
        showStep(selectionStep);
        const timeButton = timeOptions.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
        timeButton?.focus();
    });

    nameInput.addEventListener('input', () => updateError(nameInput, nameError, ''));
    emailInput.addEventListener('input', () => updateError(emailInput, emailError, ''));

    form.addEventListener('submit', (event) =>
    {
        event.preventDefault();
        const appointment = selection.appointment;
        if (!appointment)
        {
            showStep(selectionStep);
            return;
        }

        let nameMessage = '';
        let emailMessage = '';
        if (!nameInput.value.trim())
        {
            nameMessage = 'Gib einen Testnamen ein.';
        }

        emailInput.value = emailInput.value.trim();
        if (!emailInput.value)
        {
            emailMessage = 'Gib eine Test-E-Mail-Adresse ein.';
        }
        else if (!emailInput.validity.valid)
        {
            emailMessage = 'Prüfe die Schreibweise der E-Mail-Adresse.';
        }

        updateError(nameInput, nameError, nameMessage);
        updateError(emailInput, emailError, emailMessage);
        if (nameMessage)
        {
            nameInput.focus();
            return;
        }

        if (emailMessage)
        {
            emailInput.focus();
            return;
        }

        element(confirmationStep, '[data-confirm-service]').textContent = appointment.service.name;
        element(confirmationStep, '[data-confirm-date]').textContent = appointment.day.fullDate;
        element(confirmationStep, '[data-confirm-time]').textContent = appointment.time;
        element(confirmationStep, '[data-confirm-price]').textContent = formatPrice(appointment.service.priceChf);
        element(confirmationStep, '[data-confirm-barber]').textContent = 'Bei ' + shop.barber;
        form.reset();
        showStep(confirmationStep);
    });

    function renderSchedule(): void
    {
        timeOptions.replaceChildren();
        const times = selection.availableTimes();

        for (const time of times)
        {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'time-option';
            button.dataset.time = time;
            button.textContent = time;
            timeOptions.append(button);
        }

        nextDayButton.hidden = true;
        scheduleStatus.hidden = times.length > 0;

        if (!selection.service)
        {
            scheduleStatus.textContent = 'Wähle zuerst eine Leistung.';
        }
        else if (!selection.day)
        {
            scheduleStatus.textContent = 'Wähle einen Tag.';
        }
        else if (!times.length)
        {
            scheduleStatus.textContent = 'An diesem Tag sind alle Demo-Termine vergeben.';
            const nextDay = selection.nextAvailableDay();
            if (nextDay)
            {
                nextDayButton.textContent = 'Nächster freier Tag: ' + nextDay.shortDate;
                nextDayButton.hidden = false;
            }
        }

        updateSelection();
    }

    function updateSelection(): void
    {
        for (const button of dayOptions.querySelectorAll<HTMLButtonElement>('[data-day]'))
        {
            button.disabled = !selection.service;
            button.setAttribute('aria-pressed', String(button.dataset.day === selection.day?.id));
        }

        for (const button of timeOptions.querySelectorAll<HTMLButtonElement>('[data-time]'))
        {
            button.setAttribute('aria-pressed', String(button.dataset.time === selection.time));
        }

        summaryService.textContent = selection.service?.name ?? 'Leistung wählen';
        summaryDate.textContent = selection.day?.shortDate ?? 'Tag wählen';
        summaryTime.textContent = selection.time ?? 'Zeit wählen';
        summaryPrice.textContent = '';

        if (selection.service)
        {
            summaryPrice.textContent = formatPrice(selection.service.priceChf);
        }

        nextButton.disabled = !selection.appointment;
    }

    function showStep(step: HTMLElement): void
    {
        selectionStep.hidden = step !== selectionStep;
        contactStep.hidden = step !== contactStep;
        confirmationStep.hidden = step !== confirmationStep;
        summary.hidden = step === confirmationStep;
        nextButton.hidden = step !== selectionStep;
        document.body.classList.toggle('has-booking-dock', !summary.hidden);

        if (step !== selectionStep)
        {
            step.querySelector<HTMLElement>('h2')?.focus();
        }
    }
}

function clickedOption(event: Event, selector: string): HTMLButtonElement | null
{
    if (event.target instanceof Element)
    {
        return event.target.closest<HTMLButtonElement>(selector);
    }

    return null;
}

function updateError(input: HTMLInputElement, error: HTMLElement, message: string): void
{
    error.textContent = message;
    error.hidden = !message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
}
