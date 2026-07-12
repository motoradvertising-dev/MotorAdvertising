-- ============================================================================
-- Perfiles y roles de Motor Advertising
-- ----------------------------------------------------------------------------
-- EJECUTAR UNA VEZ en: Supabase Dashboard → SQL Editor → New query → pegar → Run
-- (Es idempotente: se puede volver a ejecutar sin romper nada.)
--
-- Qué crea:
--   - Tabla public.profiles: un perfil por usuario registrado.
--   - Trigger que crea el perfil automáticamente al registrarse (email o Google).
--     El correo de Motor (motoradvertisingservice@gmail.com) queda como superadmin;
--     todos los demás quedan en rol 'pendiente' hasta que el superadmin los apruebe.
--   - Políticas RLS: cada usuario solo ve su propio perfil; el superadmin ve y
--     edita todos. Un usuario normal NO puede cambiarse el rol ni el plan
--     (bloqueado por trigger de guardia + permisos de columna).
-- ============================================================================

-- ── 1. Tabla ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  full_name      text not null default '',
  requested_role text check (requested_role in ('empresa', 'empleado')),
  role           text not null default 'pendiente'
                 check (role in ('pendiente', 'superadmin', 'empresa', 'empleado')),
  plan           text check (plan in ('webs_inicial', 'webs_crecimiento', 'webs_elite',
                                      'mkt_inicial', 'mkt_crecimiento', 'mkt_elite')),
  plan_status    text not null default 'sin_plan'
                 check (plan_status in ('sin_plan', 'activo', 'pausado', 'cancelado')),
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Un solo perfil por correo: impide que alguien cree una fila "duplicada"
-- con el correo de Motor para intentar colarse como superadmin.
create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

-- ── 2. updated_at automático ────────────────────────────────────────────────
create or replace function public.profiles_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.profiles_touch();

-- ── 3. Crear perfil al registrarse ──────────────────────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, requested_role, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    case when new.raw_user_meta_data->>'requested_role' in ('empresa', 'empleado')
         then new.raw_user_meta_data->>'requested_role' end,
    -- Superadmin SOLO si el correo es el de Motor Y entró por Google (que
    -- verifica la propiedad del correo). Así nadie puede reclamar el rol
    -- registrándose con ese correo por email/contraseña.
    case when lower(coalesce(new.email, '')) = 'motoradvertisingservice@gmail.com'
              and coalesce(new.raw_app_meta_data->>'provider', '') = 'google'
         then 'superadmin' else 'pendiente' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 4. Backfill: usuarios que ya existían antes de esta tabla ───────────────
insert into public.profiles (id, email, full_name, requested_role, role)
select u.id,
       coalesce(u.email, ''),
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
       case when u.raw_user_meta_data->>'requested_role' in ('empresa', 'empleado')
            then u.raw_user_meta_data->>'requested_role' end,
       case when lower(coalesce(u.email, '')) = 'motoradvertisingservice@gmail.com'
                 and coalesce(u.raw_app_meta_data->>'provider', '') = 'google'
            then 'superadmin' else 'pendiente' end
from auth.users u
on conflict (id) do nothing;

-- Asegurar el superadmin aunque la cuenta ya existiera (solo la cuenta de
-- Google real de Motor, verificada por el proveedor).
update public.profiles p
set role = 'superadmin'
from auth.users u
where p.id = u.id
  and lower(p.email) = 'motoradvertisingservice@gmail.com'
  and coalesce(u.raw_app_meta_data->>'provider', '') = 'google';

-- ── 5. Helper sin recursión para las políticas ──────────────────────────────
create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

-- ── 6. Guardia: un usuario normal no puede cambiarse rol/plan/notas ─────────
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Contextos administrativos (service role / SQL editor) pasan directo.
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_superadmin() then
    if new.role        is distinct from old.role
       or new.plan        is distinct from old.plan
       or new.plan_status is distinct from old.plan_status
       or new.email       is distinct from old.email
       or new.notes       is distinct from old.notes then
      raise exception 'No autorizado: solo Motor Advertising puede cambiar rol o plan.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- ── 7. RLS ──────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "leer mi perfil" on public.profiles;
create policy "leer mi perfil" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "superadmin lee todo" on public.profiles;
create policy "superadmin lee todo" on public.profiles
  for select using (public.is_superadmin());

drop policy if exists "crear mi perfil" on public.profiles;
create policy "crear mi perfil" on public.profiles
  for insert with check (
    auth.uid() = id
    and role = 'pendiente'
    -- El correo debe ser el del propio usuario (el del token verificado),
    -- no uno escrito a mano: evita falsear el email al crear el perfil.
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "actualizar mi perfil" on public.profiles;
create policy "actualizar mi perfil" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "superadmin actualiza todo" on public.profiles;
create policy "superadmin actualiza todo" on public.profiles
  for update using (public.is_superadmin()) with check (public.is_superadmin());

-- ── 8. Permisos de columna ──────────────────────────────────────────────────
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, full_name, requested_role) on public.profiles to authenticated;
grant update (full_name, requested_role, role, plan, plan_status, notes)
  on public.profiles to authenticated;
-- (el trigger profiles_guard impide que un no-superadmin cambie rol/plan/notas)
