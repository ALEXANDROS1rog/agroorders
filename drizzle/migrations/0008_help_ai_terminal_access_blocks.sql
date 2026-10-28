CREATE TABLE public.help_ai_access_blocks (id text PRIMARY KEY, status integer NOT NULL, message text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.help_ai_access_blocks TO service_role;
ALTER TABLE public.help_ai_access_blocks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.help_ai_access_blocks IS 'Persistent provider access denials; only privileged server code can read or clear after access is restored.';