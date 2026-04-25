-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.event_judges (
  event_id integer NOT NULL,
  judge_id integer NOT NULL,
  CONSTRAINT event_judges_pkey PRIMARY KEY (event_id, judge_id),
  CONSTRAINT event_judges_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_judges_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.users(id)
);
CREATE TABLE public.events (
  id integer NOT NULL DEFAULT nextval('events_id_seq'::regclass),
  name character varying NOT NULL,
  event_date date,
  admin_id integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  description text,
  deadline date,
  max_score integer NOT NULL DEFAULT 10,
  start_time time without time zone,
  end_time time without time zone,
  judge_password character varying,
  status character varying DEFAULT 'not_started'::character varying CHECK (status::text = ANY (ARRAY['not_started'::character varying, 'active'::character varying, 'ended'::character varying]::text[])),
  current_participant_id integer,
  current_round_start_time timestamp without time zone,
  started_at timestamp without time zone,
  number_of_judges integer NOT NULL DEFAULT 5,
  judges_order jsonb DEFAULT '[]'::jsonb,
  current_judge_index integer DEFAULT 0,
  turn_duration_seconds integer DEFAULT 60,
  turn_start_time timestamp without time zone,
  expires_at timestamp without time zone,
  event_code character varying UNIQUE,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id),
  CONSTRAINT events_current_participant_id_fkey FOREIGN KEY (current_participant_id) REFERENCES public.participants(id)
);
CREATE TABLE public.guest_judges (
  id integer NOT NULL DEFAULT nextval('guest_judges_id_seq'::regclass),
  event_id integer NOT NULL,
  name character varying NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT guest_judges_pkey PRIMARY KEY (id),
  CONSTRAINT guest_judges_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.participants (
  id integer NOT NULL DEFAULT nextval('participants_id_seq'::regclass),
  event_id integer NOT NULL,
  name character varying NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT participants_pkey PRIMARY KEY (id),
  CONSTRAINT participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.scores (
  id integer NOT NULL DEFAULT nextval('scores_id_seq'::regclass),
  event_id integer NOT NULL,
  participant_id integer NOT NULL,
  judge_id integer,
  score integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  guest_judge_id integer,
  CONSTRAINT scores_pkey PRIMARY KEY (id),
  CONSTRAINT scores_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT scores_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id),
  CONSTRAINT scores_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.users(id),
  CONSTRAINT scores_guest_judge_id_fkey FOREIGN KEY (guest_judge_id) REFERENCES public.guest_judges(id)
);
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  firebase_uid character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['judge'::character varying, 'admin'::character varying]::text[])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);