-- ============================================================================
-- Reportes de pauta generados con IA — Motor Advertising
-- ----------------------------------------------------------------------------
-- EJECUTAR UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- (Requiere haber ejecutado antes setup-profiles.sql. Es idempotente.)
--
-- Guarda cada reporte generado desde Gestión → Perfil de usuario.
-- Solo el superadmin crea/borra; el cliente dueño del perfil puede LEER los
-- suyos (para mostrarlos en su panel más adelante).
-- ============================================================================

create table if not exists public.pauta_reports (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  periodo      text not null default '',
  metricas_raw text not null default '',
  report       jsonb not null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists pauta_reports_profile_idx
  on public.pauta_reports (profile_id, created_at desc);

-- Estado del reporte: se crea como BORRADOR y el superadmin lo publica.
-- (idempotente: agrega la columna si la tabla ya existía sin ella)
alter table public.pauta_reports
  add column if not exists status text not null default 'borrador'
  check (status in ('borrador', 'publicado'));

alter table public.pauta_reports enable row level security;

drop policy if exists "superadmin lee reportes" on public.pauta_reports;
create policy "superadmin lee reportes" on public.pauta_reports
  for select using (public.is_superadmin());

-- El cliente dueño SOLO ve reportes PUBLICADOS (los borradores son internos).
drop policy if exists "dueno lee sus reportes" on public.pauta_reports;
create policy "dueno lee sus reportes" on public.pauta_reports
  for select using (auth.uid() = profile_id and status = 'publicado');

drop policy if exists "superadmin crea reportes" on public.pauta_reports;
create policy "superadmin crea reportes" on public.pauta_reports
  for insert with check (public.is_superadmin());

drop policy if exists "superadmin actualiza reportes" on public.pauta_reports;
create policy "superadmin actualiza reportes" on public.pauta_reports
  for update using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "superadmin borra reportes" on public.pauta_reports;
create policy "superadmin borra reportes" on public.pauta_reports
  for delete using (public.is_superadmin());

revoke all on public.pauta_reports from anon;
revoke all on public.pauta_reports from authenticated;
grant select, insert, delete on public.pauta_reports to authenticated;
grant update (status, periodo) on public.pauta_reports to authenticated;
