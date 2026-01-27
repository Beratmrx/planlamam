-- Supabase (Postgres) şeması (TABLOLAR HALİNDE)
-- Supabase Dashboard > SQL Editor içine yapıştırıp çalıştırın.
-- Bu şema backend'in /api/storage endpoint'inin gönderdiği "tek payload"ı
-- ayrı tablolara yazar ve okur (frontend'i değiştirmeden).

-- Entities (her satır: id + json data)
create table if not exists public.users (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.rentals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- App-level settings (whatsAppEnabled, phoneNumber, auditOptions, savedAt, etc.)
create table if not exists public.app_settings (
  key text primary key,
  json jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists users_updated_at_idx on public.users (updated_at desc);
create index if not exists categories_updated_at_idx on public.categories (updated_at desc);
create index if not exists tasks_updated_at_idx on public.tasks (updated_at desc);
create index if not exists rentals_updated_at_idx on public.rentals (updated_at desc);
create index if not exists assets_updated_at_idx on public.assets (updated_at desc);
create index if not exists app_settings_updated_at_idx on public.app_settings (updated_at desc);

-- Returns the payload shape the frontend expects
create or replace function public.get_storage()
returns jsonb
language sql
stable
as $$
  with settings as (
    select json as s
    from public.app_settings
    where key = 'settings'
  ),
  base as (
    select jsonb_build_object(
      'version', 1,
      'savedAt', coalesce((select (s->>'savedAt')::bigint from settings), 0),
      'users', coalesce((select jsonb_agg(u.data) from public.users u), '[]'::jsonb),
      'categories', coalesce((select jsonb_agg(c.data) from public.categories c), '[]'::jsonb),
      'tasks', coalesce((select jsonb_agg(t.data) from public.tasks t), '[]'::jsonb),
      'rentals', coalesce((select jsonb_agg(r.data) from public.rentals r), '[]'::jsonb),
      'assets', coalesce((select jsonb_agg(a.data) from public.assets a), '[]'::jsonb)
    ) as b
  )
  select
    (select b from base)
    ||
    coalesce((select s - 'savedAt' from settings), '{}'::jsonb);
$$;

-- Applies a full payload (transactional)
create or replace function public.apply_storage(p jsonb)
returns jsonb
language plpgsql
as $$
declare
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  -- USERS
  if jsonb_typeof(p->'users') = 'array' then
    insert into public.users (id, data, updated_at)
    select (u->>'id')::text, u, now()
    from jsonb_array_elements(p->'users') as u
    on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

    delete from public.users
    where id not in (
      select (u->>'id')::text from jsonb_array_elements(p->'users') as u
    );
  end if;

  -- CATEGORIES
  if jsonb_typeof(p->'categories') = 'array' then
    insert into public.categories (id, data, updated_at)
    select (c->>'id')::text, c, now()
    from jsonb_array_elements(p->'categories') as c
    on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

    delete from public.categories
    where id not in (
      select (c->>'id')::text from jsonb_array_elements(p->'categories') as c
    );
  end if;

  -- TASKS
  if jsonb_typeof(p->'tasks') = 'array' then
    insert into public.tasks (id, data, updated_at)
    select (t->>'id')::text, t, now()
    from jsonb_array_elements(p->'tasks') as t
    on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

    delete from public.tasks
    where id not in (
      select (t->>'id')::text from jsonb_array_elements(p->'tasks') as t
    );
  end if;

  -- RENTALS
  if jsonb_typeof(p->'rentals') = 'array' then
    insert into public.rentals (id, data, updated_at)
    select (r->>'id')::text, r, now()
    from jsonb_array_elements(p->'rentals') as r
    on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

    delete from public.rentals
    where id not in (
      select (r->>'id')::text from jsonb_array_elements(p->'rentals') as r
    );
  end if;

  -- ASSETS
  if jsonb_typeof(p->'assets') = 'array' then
    insert into public.assets (id, data, updated_at)
    select (a->>'id')::text, a, now()
    from jsonb_array_elements(p->'assets') as a
    on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at;

    delete from public.assets
    where id not in (
      select (a->>'id')::text from jsonb_array_elements(p->'assets') as a
    );
  end if;

  -- SETTINGS (merge + savedAt)
  insert into public.app_settings (key, json, updated_at)
  values (
    'settings',
    jsonb_build_object(
      'savedAt', now_ms,
      'whatsAppEnabled', coalesce(p->'whatsAppEnabled', 'false'::jsonb),
      'phoneNumber', coalesce(p->'phoneNumber', '""'::jsonb),
      'secondPhoneNumber', coalesce(p->'secondPhoneNumber', '""'::jsonb),
      'auditOptions', coalesce(p->'auditOptions', '[]'::jsonb)
    ),
    now()
  )
  on conflict (key) do update set json = excluded.json, updated_at = excluded.updated_at;

  return jsonb_build_object('success', true, 'savedAt', now_ms);
end;
$$;

