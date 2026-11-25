CREATE TABLE public.beko_bookings (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    request_id uuid NOT NULL UNIQUE,
    request_hash text NOT NULL,
    service text NOT NULL,
    price_chf integer NOT NULL CHECK (price_chf >= 0),
    name text NOT NULL,
    email text NOT NULL,
    starts_at bigint NOT NULL,
    ends_at bigint NOT NULL CHECK (ends_at > starts_at),
    cancelled_at bigint,
    CONSTRAINT beko_bookings_no_overlap
        EXCLUDE USING gist (int8range(starts_at, ends_at, '[)') WITH &&)
        WHERE (cancelled_at IS NULL)
);

CREATE INDEX beko_bookings_upcoming ON public.beko_bookings (ends_at) WHERE cancelled_at IS NULL;

ALTER TABLE public.beko_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beko_bookings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.beko_bookings TO service_role;

CREATE FUNCTION public.beko_reserve_booking(
    p_request_id uuid,
    p_request_hash text,
    p_service text,
    p_price_chf integer,
    p_name text,
    p_email text,
    p_starts_at bigint,
    p_ends_at bigint
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    booking_id uuid;
BEGIN
    -- Reservations for the single barber are serialized across Edge Function instances.
    PERFORM pg_catalog.pg_advisory_xact_lock(907121, 1);

    IF p_starts_at > EXTRACT(EPOCH FROM pg_catalog.clock_timestamp()) * 1000 AND p_ends_at > p_starts_at THEN
        INSERT INTO public.beko_bookings (request_id, request_hash, service, price_chf, name, email, starts_at, ends_at)
        VALUES (p_request_id, p_request_hash, p_service, p_price_chf, p_name, p_email, p_starts_at, p_ends_at)
        ON CONFLICT DO NOTHING
        RETURNING id INTO booking_id;

        IF booking_id IS NOT NULL THEN
            RETURN booking_id;
        END IF;
    END IF;

    SELECT id INTO booking_id
    FROM public.beko_bookings
    WHERE request_id = p_request_id AND request_hash = p_request_hash AND cancelled_at IS NULL;

    RETURN booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.beko_reserve_booking(uuid, text, text, integer, text, text, bigint, bigint)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.beko_reserve_booking(uuid, text, text, integer, text, text, bigint, bigint)
TO service_role;
