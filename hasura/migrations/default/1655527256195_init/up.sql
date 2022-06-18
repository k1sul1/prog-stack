SET check_function_bodies = false;
CREATE FUNCTION public."set_current_timestamp_updatedAt"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updatedAt" = NOW();
  RETURN _new;
END;
$$;
CREATE TABLE public.notes (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "user" uuid NOT NULL
);
CREATE TABLE public.users (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    fname text,
    lname text,
    email text NOT NULL,
    passhash text NOT NULL,
    role integer DEFAULT 0 NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    meta jsonb
);
ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (uuid);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uuid);
CREATE TRIGGER "set_public_notes_updatedAt" BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public."set_current_timestamp_updatedAt"();
COMMENT ON TRIGGER "set_public_notes_updatedAt" ON public.notes IS 'trigger to set value of column "updatedAt" to current timestamp on row update';
ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_fkey FOREIGN KEY ("user") REFERENCES public.users(uuid) ON UPDATE CASCADE ON DELETE CASCADE;
