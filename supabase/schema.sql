-- Run once in the Supabase SQL editor.
-- The app talks to Supabase only from server routes using the service role key,
-- so RLS is enabled with no public policies (nothing is readable from the browser).

create table if not exists candidates (
  id uuid primary key,
  created_at timestamptz not null default now(),
  role text not null check (role in ('PM', 'SPM')),
  file_name text not null,
  name text not null,
  email text,
  phone text,
  redacted_text text not null,
  redactions int not null default 0,
  status text not null,
  error text,
  analysis jsonb,
  drafts jsonb,
  decision text check (decision in ('advance', 'pass', 'hold')),
  decision_note text,
  decided_at timestamptz,
  email_status text,
  email_sent_at timestamptz,
  email_error text
);

create table if not exists hires (
  id uuid primary key,
  joined_on int not null default 0,
  name text not null,
  role text not null,
  joined text not null,
  rating text not null,
  still_at_kargo boolean not null default true,
  notes text not null default ''
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

alter table candidates enable row level security;
alter table hires enable row level security;
alter table settings enable row level security;
