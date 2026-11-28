ALTER TABLE public.beko_bookings ADD COLUMN phone text CHECK (phone ~ '^\+?[0-9]{7,15}$');

CREATE FUNCTION public.beko_reserve_booking(
    p_request_id uuid,
    p_request_hash text,
    p_service text,
    p_price_chf integer,
    p_name text,
    p_email text,
    p_starts_at bigint,
    p_ends_at bigint,
    p_phone text
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
        INSERT INTO public.beko_bookings (request_id, request_hash, service, price_chf, name, email, phone, starts_at, ends_at)
        VALUES (p_request_id, p_request_hash, p_service, p_price_chf, p_name, p_email, p_phone, p_starts_at, p_ends_at)
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

REVOKE ALL ON FUNCTION public.beko_reserve_booking(uuid, text, text, integer, text, text, bigint, bigint, text)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.beko_reserve_booking(uuid, text, text, integer, text, text, bigint, bigint, text)
TO service_role;
