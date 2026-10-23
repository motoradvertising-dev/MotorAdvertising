-- ============================================================================
-- Propuestas generadas con IA — Motor Advertising
-- ----------------------------------------------------------------------------
-- EJECUTAR UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- (Requiere haber ejecutado antes setup-profiles.sql. Es idempotente.)
--
-- Una propuesta vive en public.propuestas (su contenido vigente, en JSON) y
-- se publica en /paginas/propuesta/?p=<slug>. Cada día en que se modifica
-- queda UNA versión en public.propuesta_versiones: las correcciones hechas el
-- mismo día sobrescriben la versión de ese día (no son versiones distintas);
-- un cambio otro día crea una versión nueva. Día = hora de Colombia.
--
-- Acceso:
--   - Solo el superadmin crea, lee, corrige, publica y borra (RLS + RPC).
--   - El público (sin sesión) solo puede leer el contenido de una propuesta
--     PUBLICADA y únicamente por su slug, vía propuesta_publica(slug); no
--     puede listar las propuestas ni ver borradores ni versiones.
-- ============================================================================

-- ── 1. Tablas ───────────────────────────────────────────────────────────────
create table if not exists public.propuestas (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  cliente      text not null check (char_length(cliente) between 1 and 140),
  titulo       text not null default '',
  tipo         text not null default 'otro'
               check (tipo in ('web', 'marketing', 'automatizacion', 'comercial', 'mixta', 'otro')),
  idioma       text not null default 'es' check (idioma in ('es', 'en')),
  estado       text not null default 'borrador'
               check (estado in ('borrador', 'publicada', 'archivada')),
  contenido    jsonb not null,                       -- versión vigente (lo que se publica)
  entrada      jsonb not null default '{}'::jsonb,   -- lo escrito en el formulario (precios, apuntes…)
  referencias  text[] not null default '{}',         -- slugs de propuestas usadas como referencia
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.propuesta_versiones (
  id            uuid primary key default gen_random_uuid(),
  propuesta_id  uuid not null references public.propuestas(id) on delete cascade,
  dia           date not null,                  -- fecha (Colombia) de esa versión
  numero        integer not null,               -- 1, 2, 3… en orden de creación
  contenido     jsonb not null,
  cambios       text[] not null default '{}',   -- correcciones pedidas ese día
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (propuesta_id, dia),
  unique (propuesta_id, numero)
);

create index if not exists propuesta_versiones_propuesta_idx
  on public.propuesta_versiones (propuesta_id, numero desc);

-- updated_at automático (reutiliza la función de setup-profiles.sql)
drop trigger if exists propuestas_touch on public.propuestas;
create trigger propuestas_touch
  before update on public.propuestas
  for each row execute function public.profiles_touch();

drop trigger if exists propuesta_versiones_touch on public.propuesta_versiones;
create trigger propuesta_versiones_touch
  before update on public.propuesta_versiones
  for each row execute function public.profiles_touch();

-- ── 2. RLS: solo superadmin ─────────────────────────────────────────────────
alter table public.propuestas enable row level security;
alter table public.propuesta_versiones enable row level security;

drop policy if exists "superadmin administra propuestas" on public.propuestas;
create policy "superadmin administra propuestas" on public.propuestas
  for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "superadmin administra versiones" on public.propuesta_versiones;
create policy "superadmin administra versiones" on public.propuesta_versiones
  for all using (public.is_superadmin()) with check (public.is_superadmin());

revoke all on public.propuestas from anon;
revoke all on public.propuesta_versiones from anon;
revoke all on public.propuestas from authenticated;
revoke all on public.propuesta_versiones from authenticated;
grant select, delete on public.propuestas to authenticated;
grant update (slug, cliente, titulo, tipo, idioma, estado, entrada, referencias) on public.propuestas to authenticated;
grant select on public.propuesta_versiones to authenticated;
-- (insertar y cambiar el contenido se hace solo por las funciones de abajo,
--  que aplican la regla de una versión por día)

-- ── 3. Día de Colombia ──────────────────────────────────────────────────────
create or replace function public.dia_colombia() returns date
language sql stable as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- ── 4. Crear una propuesta (fila + versión 1) ───────────────────────────────
create or replace function public.crear_propuesta(
  p_slug text, p_cliente text, p_tipo text, p_idioma text,
  p_contenido jsonb, p_entrada jsonb default '{}'::jsonb, p_referencias text[] default '{}'
) returns public.propuestas
language plpgsql security definer set search_path = public as $$
declare
  fila public.propuestas;
begin
  if not public.is_superadmin() then
    raise exception 'No autorizado: solo Motor Advertising puede crear propuestas.';
  end if;
  insert into public.propuestas (slug, cliente, titulo, tipo, idioma, contenido, entrada, referencias, created_by)
  values (
    lower(trim(p_slug)), trim(p_cliente), coalesce(p_contenido->>'titulo_pagina', ''),
    coalesce(p_tipo, 'otro'), coalesce(p_idioma, 'es'), p_contenido, coalesce(p_entrada, '{}'::jsonb),
    coalesce(p_referencias, '{}'), auth.uid()
  )
  returning * into fila;
  insert into public.propuesta_versiones (propuesta_id, dia, numero, contenido, cambios)
  values (fila.id, public.dia_colombia(), 1, p_contenido, '{}');
  return fila;
end $$;

-- ── 5. Guardar una corrección (regla de una versión por día) ────────────────
create or replace function public.guardar_propuesta(p_id uuid, p_contenido jsonb, p_cambio text default null)
returns public.propuesta_versiones
language plpgsql security definer set search_path = public as $$
declare
  hoy date := public.dia_colombia();
  v   public.propuesta_versiones;
  n   integer;
begin
  if not public.is_superadmin() then
    raise exception 'No autorizado: solo Motor Advertising puede modificar propuestas.';
  end if;
  update public.propuestas
     set contenido = p_contenido,
         titulo    = coalesce(p_contenido->>'titulo_pagina', titulo)
   where id = p_id;
  if not found then
    raise exception 'La propuesta no existe.';
  end if;

  select * into v from public.propuesta_versiones where propuesta_id = p_id and dia = hoy;
  if found then
    -- Mismo día: se sobrescribe la versión de hoy, no se crea otra.
    update public.propuesta_versiones
       set contenido = p_contenido,
           cambios   = case when p_cambio is null or trim(p_cambio) = '' then cambios
                            else array_append(cambios, left(trim(p_cambio), 300)) end
     where id = v.id
     returning * into v;
  else
    select coalesce(max(numero), 0) + 1 into n from public.propuesta_versiones where propuesta_id = p_id;
    insert into public.propuesta_versiones (propuesta_id, dia, numero, contenido, cambios)
    values (p_id, hoy, n, p_contenido,
            case when p_cambio is null or trim(p_cambio) = '' then '{}'::text[]
                 else array[left(trim(p_cambio), 300)] end)
    returning * into v;
  end if;
  return v;
end $$;

-- ── 6. Lectura pública por slug (solo publicadas) ───────────────────────────
create or replace function public.propuesta_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select contenido
    from public.propuestas
   where slug = lower(trim(p_slug)) and estado = 'publicada'
   limit 1;
$$;

-- ── 7. Permisos de ejecución ────────────────────────────────────────────────
-- (Supabase concede EXECUTE a anon/authenticated por defecto: se revoca explícito.)
revoke all on function public.dia_colombia() from public, anon;
revoke all on function public.crear_propuesta(text, text, text, text, jsonb, jsonb, text[]) from public, anon;
revoke all on function public.guardar_propuesta(uuid, jsonb, text) from public, anon;
revoke all on function public.propuesta_publica(text) from public;
grant execute on function public.dia_colombia() to authenticated;
grant execute on function public.crear_propuesta(text, text, text, text, jsonb, jsonb, text[]) to authenticated;
grant execute on function public.guardar_propuesta(uuid, jsonb, text) to authenticated;
grant execute on function public.propuesta_publica(text) to anon, authenticated;
