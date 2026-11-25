import type { BookingDay } from '../domain/availability';
import type { Service } from '../domain/services';

interface Appointment
{
    readonly service: Service;
    readonly day: BookingDay;
    readonly time: string;
}

export class BookingSelection
{
    private selectedService: Service | undefined;
    private selectedDay: BookingDay | undefined;
    private selectedTime: string | undefined;

    public constructor(public readonly days: readonly BookingDay[])
    {
    }

    public get service(): Service | undefined
    {
        return this.selectedService;
    }

    public get day(): BookingDay | undefined
    {
        return this.selectedDay;
    }

    public get time(): string | undefined
    {
        return this.selectedTime;
    }

    public get appointment(): Appointment | undefined
    {
        if (!this.selectedService || !this.selectedDay || !this.selectedTime)
        {
            return undefined;
        }

        return { service: this.selectedService, day: this.selectedDay, time: this.selectedTime };
    }

    public selectService(service: Service): void
    {
        this.selectedService = service;
        this.selectedDay ??= this.days.find((day) => this.availableTimes(day).length > 0);

        if (this.selectedTime && !this.availableTimes().includes(this.selectedTime))
        {
            this.selectedTime = undefined;
        }
    }

    public selectDay(id: string): void
    {
        const day = this.days.find((candidate) => candidate.id === id);
        if (day && this.selectedDay !== day)
        {
            this.selectedDay = day;
            this.selectedTime = undefined;
        }
    }

    public selectTime(time: string): void
    {
        if (this.availableTimes().includes(time))
        {
            this.selectedTime = time;
        }
    }

    public availableTimes(day = this.selectedDay): readonly string[]
    {
        if (!this.selectedService || !day)
        {
            return [];
        }

        const durationMinutes = this.selectedService.durationMinutes;
        return day.openings
            .filter((opening) => opening[1] >= durationMinutes)
            .map((opening) => opening[0]);
    }

    public nextAvailableDay(): BookingDay | undefined
    {
        const selectedDay = this.selectedDay;
        if (!selectedDay)
        {
            return undefined;
        }

        return this.days.find((day) => day.id > selectedDay.id && this.availableTimes(day).length > 0);
    }
}
