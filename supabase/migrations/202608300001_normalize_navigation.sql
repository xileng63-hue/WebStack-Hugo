-- Normalize parent/child categories and add atomic batch editing + link health metadata.
begin;

create table if not exists public.category_groups (
  id text primary key,
  name text not null,
  order_index integer not null default 0,
  is_visible boolean not null default true,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories add column if not exists group_id text;
alter table public.categories add column if not exists is_pinned boolean not null default false;
alter table public.links add column if not exists is_pinned boolean not null default false;
alter table public.links add column if not exists health_status text not null default 'unchecked';
alter table public.links add column if not exists http_status integer;
alter table public.links add column if not exists last_checked_at timestamptz;
alter table public.links add column if not exists final_url text not null default '';
alter table public.links add column if not exists health_error text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'links_health_status_check'
  ) then
    alter table public.links add constraint links_health_status_check
      check (health_status in ('unchecked', 'healthy', 'redirected', 'broken'));
  end if;
end $$;

insert into public.category_groups (id, name, order_index, is_visible)
values
  ('nav-group-post', '后期', 0, true),
  ('nav-group-design', '设计', 1, true),
  ('nav-group-daily', '日常', 2, true),
  ('nav-group-code', '编程', 3, true),
  ('nav-group-assets', '素材', 4, true),
  ('nav-group-tools', '工具', 5, true),
  ('nav-group-language', '外语', 6, true),
  ('nav-group-other', '其他', 7, true)
on conflict (id) do nothing;

-- Preserve every edited/custom parent category from the legacy marker records.
insert into public.category_groups (id, name, order_index, is_visible)
select id, name, order_index, is_visible
from public.categories
where emoji = '__navigation_group__'
on conflict (id) do update set
  name = excluded.name,
  order_index = excluded.order_index,
  is_visible = excluded.is_visible,
  updated_at = now();

-- First resolve legacy values that already contain a group id or group name.
update public.categories c
set group_id = g.id
from public.category_groups g
where c.emoji <> '__navigation_group__'
  and c.group_id is null
  and (c.emoji = g.id or c.emoji = g.name);

-- Then resolve the original WebStack category names.
update public.categories
set group_id = case name
  when '常用推荐' then 'nav-group-daily'
  when '国产 AI' then 'nav-group-tools'
  when '国外 AI' then 'nav-group-tools'
  when '影音视频' then 'nav-group-post'
  when '游戏竞技' then 'nav-group-daily'
  when '办公学习' then 'nav-group-daily'
  when '网盘资源' then 'nav-group-tools'
  when '图标素材' then 'nav-group-assets'
  when '图标设计' then 'nav-group-design'
  when '平面素材' then 'nav-group-assets'
  when '音效资源' then 'nav-group-post'
  when '字体资源' then 'nav-group-assets'
  when '图形创意' then 'nav-group-design'
  when '界面设计' then 'nav-group-design'
  when '在线配色' then 'nav-group-design'
  when '在线工具' then 'nav-group-tools'
  when '浏览器插件' then 'nav-group-code'
  when '资讯书籍' then 'nav-group-language'
  when '博客论坛' then 'nav-group-other'
  when '设计规范' then 'nav-group-design'
  when '视频教程' then 'nav-group-post'
  else 'nav-group-other'
end
where emoji <> '__navigation_group__' and group_id is null;

-- Marker rows are no longer categories. They are now real category_groups rows.
delete from public.categories where emoji = '__navigation_group__';

update public.categories set group_id = 'nav-group-other' where group_id is null;
alter table public.categories alter column group_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_group_id_fkey'
  ) then
    alter table public.categories add constraint categories_group_id_fkey
      foreign key (group_id) references public.category_groups(id) on delete restrict;
  end if;
end $$;

alter table public.category_groups enable row level security;

drop policy if exists "public read category groups" on public.category_groups;
drop policy if exists "admin manage category groups" on public.category_groups;
create policy "public read category groups" on public.category_groups for select to anon using (is_visible = true);
create policy "admin manage category groups" on public.category_groups for all to authenticated using (true) with check (true);

create index if not exists category_groups_order_idx on public.category_groups(is_pinned desc, order_index);
create index if not exists categories_group_order_idx on public.categories(group_id, is_pinned desc, order_index);
create index if not exists links_category_pinned_order_idx on public.links(category_id, is_pinned desc, order_index);
create index if not exists links_health_status_idx on public.links(health_status, last_checked_at);

create or replace function public.save_navigation_batch(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.category_groups (id, name, order_index, is_visible, is_pinned, updated_at)
  select id, name, order_index, is_visible, is_pinned, now()
  from jsonb_to_recordset(coalesce(payload->'groups', '[]'::jsonb)) as x(
    id text, name text, order_index integer, is_visible boolean, is_pinned boolean
  )
  on conflict (id) do update set
    name = excluded.name,
    order_index = excluded.order_index,
    is_visible = excluded.is_visible,
    is_pinned = excluded.is_pinned,
    updated_at = now();

  insert into public.categories (id, name, group_id, order_index, is_visible, is_pinned, updated_at)
  select id, name, group_id, order_index, is_visible, is_pinned, now()
  from jsonb_to_recordset(coalesce(payload->'categories', '[]'::jsonb)) as x(
    id text, name text, group_id text, order_index integer, is_visible boolean, is_pinned boolean
  )
  on conflict (id) do update set
    name = excluded.name,
    group_id = excluded.group_id,
    order_index = excluded.order_index,
    is_visible = excluded.is_visible,
    is_pinned = excluded.is_pinned,
    updated_at = now();

  insert into public.links (
    id, category_id, name, url, description, icon_url, accent, tags, order_index,
    is_visible, is_featured, is_pinned, health_status, http_status,
    last_checked_at, final_url, health_error, updated_at
  )
  select
    id, category_id, name, url, description, icon_url, accent, tags, order_index,
    is_visible, is_featured, is_pinned, health_status, http_status,
    last_checked_at, final_url, health_error, now()
  from jsonb_to_recordset(coalesce(payload->'links', '[]'::jsonb)) as x(
    id text, category_id text, name text, url text, description text, icon_url text,
    accent text, tags text[], order_index integer, is_visible boolean,
    is_featured boolean, is_pinned boolean, health_status text, http_status integer,
    last_checked_at timestamptz, final_url text, health_error text
  )
  on conflict (id) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    url = excluded.url,
    description = excluded.description,
    icon_url = excluded.icon_url,
    accent = excluded.accent,
    tags = excluded.tags,
    order_index = excluded.order_index,
    is_visible = excluded.is_visible,
    is_featured = excluded.is_featured,
    is_pinned = excluded.is_pinned,
    health_status = excluded.health_status,
    http_status = excluded.http_status,
    last_checked_at = excluded.last_checked_at,
    final_url = excluded.final_url,
    health_error = excluded.health_error,
    updated_at = now();

  insert into public.site_settings (id, title, subtitle, announcement, footer, logo_text, accent, updated_at)
  select id, title, subtitle, announcement, footer, logo_text, accent, now()
  from jsonb_to_record(payload->'settings') as x(
    id text, title text, subtitle text, announcement text, footer text, logo_text text, accent text
  )
  on conflict (id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    announcement = excluded.announcement,
    footer = excluded.footer,
    logo_text = excluded.logo_text,
    accent = excluded.accent,
    updated_at = now();

  delete from public.links
  where id in (select jsonb_array_elements_text(coalesce(payload #> '{deleted,linkIds}', '[]'::jsonb)));

  delete from public.categories
  where id in (select jsonb_array_elements_text(coalesce(payload #> '{deleted,categoryIds}', '[]'::jsonb)));

  delete from public.category_groups
  where id in (select jsonb_array_elements_text(coalesce(payload #> '{deleted,groupIds}', '[]'::jsonb)));
end;
$$;

revoke all on function public.save_navigation_batch(jsonb) from public;
grant execute on function public.save_navigation_batch(jsonb) to authenticated;

commit;
