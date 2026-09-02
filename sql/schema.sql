-- Schema do app de arrecadacao - Projeto de Expansao Igreja United Bela Vista
-- Rode isso no SQL Editor do Supabase (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  target_amount numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  amount numeric(10,2) not null,
  payer_name text,
  status text not null default 'pending',
  payment_method text,
  mp_payment_id text,
  mp_preference_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contributions_item_id on contributions(item_id);
create index if not exists idx_contributions_status on contributions(status);

-- Este projeto usa a Service Role Key do Supabase apenas dentro das Netlify
-- Functions (nunca no navegador), entao o Row Level Security pode ficar
-- desativado por padrao. Se preferir reforcar, habilite RLS e crie policies
-- que bloqueiem tudo para o anon key (a service role sempre ignora RLS):
-- alter table items enable row level security;
-- alter table contributions enable row level security;
