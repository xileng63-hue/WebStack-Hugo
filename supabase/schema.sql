-- HJCM Navigation / Supabase schema
-- Run this file once in Supabase Dashboard -> SQL Editor.

create table if not exists public.categories (
  id text primary key,
  name text not null,
  emoji text not null default '新',
  order_index integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.links (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  url text not null,
  description text not null default '',
  icon_url text not null default '',
  accent text not null default '#6d5dfc',
  tags text[] not null default '{}',
  order_index integer not null default 0,
  is_visible boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id text primary key default 'main',
  title text not null default 'HJCM 灵感导航',
  subtitle text not null default '',
  announcement text not null default '',
  footer text not null default '',
  logo_text text not null default 'HJ',
  accent text not null default '#6d5dfc',
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.links enable row level security;
alter table public.site_settings enable row level security;

-- Public visitors may only read content that the front-end chooses to display.
create policy "public read categories" on public.categories for select using (true);
create policy "public read links" on public.links for select using (true);
create policy "public read settings" on public.site_settings for select using (true);

-- Only authenticated Supabase users can create, change, or delete content.
-- Keep public sign-up disabled in Supabase Auth and create the administrator manually.
create policy "admin manage categories" on public.categories for all to authenticated using (true) with check (true);
create policy "admin manage links" on public.links for all to authenticated using (true) with check (true);
create policy "admin manage settings" on public.site_settings for all to authenticated using (true) with check (true);

create index if not exists categories_order_idx on public.categories(order_index);
create index if not exists links_category_order_idx on public.links(category_id, order_index);

