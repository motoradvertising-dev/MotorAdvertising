-- ============================================================================
-- Recomendaciones de Motor Advertising para cada cliente
-- ----------------------------------------------------------------------------
-- EJECUTAR UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- (Requiere haber ejecutado antes setup-profiles.sql. Es idempotente.)
--
-- Cada fila es una recomendación para un perfil. Se escriben desde
-- Gestión → Perfil de usuario y el cliente las ve en su panel como una
-- sección desplegable. Igual que los reportes: se crean como BORRADOR y solo
-- las PUBLICADAS llegan al cliente.
-- ============================================================================

create table if not exists public.recomendaciones (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  orden       integer not null default 0,
  categoria   text not null default 'general'
              check (categoria in ('atencion', 'proceso', 'campanas', 'web', 'canal', 'general')),
  titulo      text not null check (char_length(titulo) between 1 and 140),
  resumen     text not null default '' check (char_length(resumen) <= 280),
  -- Texto con formato sencillo: párrafos, "- " viñetas, "1. " pasos,
  -- "> " frase destacada y "? " preguntas para el cliente.
  cuerpo      text not null default '' check (char_length(cuerpo) <= 4000),
  -- Franja horaria opcional (se dibuja sobre las 24 horas del día).
  hora_desde  time,
  hora_hasta  time,
  -- Fecha o rango opcional (se dibuja como calendario con cuenta regresiva).
  fecha_desde date,
  fecha_hasta date,
  -- Texto del botón de WhatsApp; vacío = sin botón.
  boton       text not null default '' check (char_length(boton) <= 60),
  status      text not null default 'borrador' check (status in ('borrador', 'publicado')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint recomendaciones_horas check ((hora_desde is null) = (hora_hasta is null)),
  constraint recomendaciones_fechas check (
    fecha_hasta is null or (fecha_desde is not null and fecha_hasta >= fecha_desde)
  )
);

create index if not exists recomendaciones_profile_idx
  on public.recomendaciones (profile_id, orden, created_at);

-- updated_at automático (reutiliza la función de setup-profiles.sql)
drop trigger if exists recomendaciones_touch on public.recomendaciones;
create trigger recomendaciones_touch
  before update on public.recomendaciones
  for each row execute function public.profiles_touch();

alter table public.recomendaciones enable row level security;

drop policy if exists "superadmin lee recomendaciones" on public.recomendaciones;
create policy "superadmin lee recomendaciones" on public.recomendaciones
  for select using (public.is_superadmin());

-- El cliente dueño SOLO ve las PUBLICADAS (los borradores son internos).
drop policy if exists "dueno lee sus recomendaciones" on public.recomendaciones;
create policy "dueno lee sus recomendaciones" on public.recomendaciones
  for select using (auth.uid() = profile_id and status = 'publicado');

drop policy if exists "superadmin crea recomendaciones" on public.recomendaciones;
create policy "superadmin crea recomendaciones" on public.recomendaciones
  for insert with check (public.is_superadmin());

drop policy if exists "superadmin actualiza recomendaciones" on public.recomendaciones;
create policy "superadmin actualiza recomendaciones" on public.recomendaciones
  for update using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "superadmin borra recomendaciones" on public.recomendaciones;
create policy "superadmin borra recomendaciones" on public.recomendaciones
  for delete using (public.is_superadmin());

revoke all on public.recomendaciones from anon;
revoke all on public.recomendaciones from authenticated;
grant select, insert, delete on public.recomendaciones to authenticated;
grant update (orden, categoria, titulo, resumen, cuerpo, hora_desde, hora_hasta,
              fecha_desde, fecha_hasta, boton, status)
  on public.recomendaciones to authenticated;
