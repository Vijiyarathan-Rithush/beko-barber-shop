CREATE TABLE public.beko_backend_access (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    token_sha256 text NOT NULL CHECK (token_sha256 ~ '^[a-f0-9]{64}$')
);

ALTER TABLE public.beko_backend_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beko_backend_access FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.beko_backend_access TO service_role;
