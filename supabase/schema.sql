-- =====================================================================
--  INTI FINANZAS · esquema de base de datos (Supabase / PostgreSQL)
--  Pasos: Supabase > SQL Editor > pega TODO este archivo > Run
--  Es seguro ejecutarlo más de una vez.
-- =====================================================================

-- 1) TABLAS ----------------------------------------------------------
create table if not exists public.perfiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  plan      text not null default 'free' check (plan in ('free','pro')),
  pro_hasta timestamptz,
  creado    timestamptz not null default now()
);

create table if not exists public.ajustes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  config      jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object' and octet_length(config::text) < 20000),
  actualizado timestamptz not null default now()
);

create table if not exists public.movimientos (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha_emision        timestamptz not null default now(),
  tipo_movimiento      text not null check (tipo_movimiento in ('Ingreso','Gasto')),
  descripcion          text not null default '' check (char_length(descripcion) <= 120),
  categoria            text not null default 'Otros' check (char_length(categoria) <= 60),
  categoria_pcge       text check (char_length(categoria_pcge) <= 60),
  tipo_doc_identidad   text check (tipo_doc_identidad in ('RUC','DNI')),
  numero_doc_identidad text check (numero_doc_identidad ~ '^([0-9]{8}|[0-9]{11})$'),
  razon_social         text check (char_length(razon_social) <= 120),
  tipo_comprobante     text check (tipo_comprobante in ('01','02','03','04')),
  serie                text check (char_length(serie) <= 10),
  numero               text check (char_length(numero) <= 20),
  base_imponible       numeric(14,2) check (base_imponible is null or base_imponible >= 0),
  igv_monto            numeric(14,2) check (igv_monto is null or igv_monto >= 0),
  otros_tributos       numeric(14,2) not null default 0 check (otros_tributos >= 0),
  importe_total        numeric(14,2) not null check (importe_total > 0 and importe_total < 100000000),
  sujeto_a_detraccion  boolean not null default false,
  tasa_detraccion      numeric(5,2) not null default 0 check (tasa_detraccion between 0 and 100),
  monto_detraccion     numeric(14,2) not null default 0,
  monto_neto_pagar     numeric(14,2) not null default 0,
  creado               timestamptz not null default now()
);
-- Velocidad: casi todas las consultas filtran por usuario y fecha
create index if not exists mov_user_fecha on public.movimientos (user_id, fecha_emision desc);

create table if not exists public.deudas (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre  text not null check (char_length(nombre) between 1 and 60),
  monto   numeric(14,2) not null check (monto > 0 and monto < 100000000),
  tipo    text not null check (tipo in ('mensual','unico')),
  dia     int  check (dia between 1 and 31),
  fecha   date,
  creado  timestamptz not null default now(),
  check ((tipo = 'mensual' and dia is not null) or (tipo = 'unico' and fecha is not null))
);
create index if not exists deudas_user on public.deudas (user_id);

create table if not exists public.deuda_marcas (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clave   text not null check (char_length(clave) <= 80),
  primary key (user_id, clave)
);

-- Parámetros globales (los edita el administrador, no los usuarios)
create table if not exists public.parametros (
  clave text primary key,
  valor text not null
);
insert into public.parametros (clave, valor) values ('limite_free_mensual', '0')   -- 0 = sin límite en el plan gratuito
  on conflict (clave) do nothing;

create table if not exists public.parametros_tributarios (
  anio       int primary key,
  uit        numeric(10,2) not null,
  cronograma jsonb not null,     -- 12 textos "mes_de_pago|días para dígitos 0,1,2-3,4-5,6-7,8-9,BC"
  nota       text
);
insert into public.parametros_tributarios (anio, uit, cronograma, nota) values
 (2026, 5500, '["2|16,17,18,19,20,23,24","3|16,17,18,19,20,23,24","4|17,20,21,22,23,24,27","5|18,19,20,21,22,25,26","6|15,16,17,18,19,22,23","7|15,16,17,20,21,22,24","8|18,19,20,21,24,25,26","9|15,16,17,18,21,22,23","10|16,19,20,21,22,23,26","11|16,17,18,19,20,23,24","12|17,18,21,22,23,24,28","1|18,19,20,21,22,25,26"]'::jsonb,
  'UIT 2026 y cronograma mensual oficial SUNAT 2026')
 on conflict (anio) do nothing;
-- Cada año: insert into public.parametros_tributarios (anio, uit, cronograma) values (2027, ..., '[...]');

-- 2) USUARIOS NUEVOS: crean su perfil y ajustes solos -------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (user_id) values (new.id) on conflict do nothing;
  insert into public.ajustes  (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
insert into public.perfiles (user_id) select id from auth.users on conflict do nothing;
insert into public.ajustes  (user_id) select id from auth.users on conflict do nothing;

-- 3) VALIDACIÓN Y CÁLCULO EN EL SERVIDOR --------------------------------
create or replace function public.calc_movimiento() returns trigger
language plpgsql set search_path = public as $$
declare lim int; pl text; n int;
begin
  if new.tipo_comprobante = '01' then
    if new.numero_doc_identidad is null or length(new.numero_doc_identidad) <> 11 then
      raise exception 'La factura requiere el RUC del cliente o proveedor (11 dígitos)'; end if;
    if coalesce(new.serie,'') = '' then
      raise exception 'Falta la serie y número del comprobante'; end if;
  end if;
  if new.tipo_doc_identidad = 'RUC' and new.numero_doc_identidad is not null and length(new.numero_doc_identidad) <> 11 then
    raise exception 'El RUC debe tener 11 dígitos'; end if;
  if new.tipo_doc_identidad = 'DNI' and new.numero_doc_identidad is not null and length(new.numero_doc_identidad) <> 8 then
    raise exception 'El DNI debe tener 8 dígitos'; end if;

  if new.otros_tributos > new.importe_total then
    raise exception 'Otros tributos no pueden superar el importe total'; end if;

  -- Desglose de IGV por comprobante (si no lo envían)
  if new.base_imponible is null and new.igv_monto is null then
    if new.tipo_comprobante in ('01','04') then
      new.base_imponible := round((new.importe_total - new.otros_tributos) / 1.18, 2);
      new.igv_monto := new.importe_total - new.otros_tributos - new.base_imponible;
    elsif new.tipo_comprobante = '02' then
      new.base_imponible := new.importe_total - new.otros_tributos; new.igv_monto := 0;
    end if;
  end if;

  -- Detracción y neto a pagar (base del flujo de caja)
  if new.sujeto_a_detraccion then
    new.monto_detraccion := round(new.importe_total * new.tasa_detraccion / 100, 2);
  else
    new.monto_detraccion := 0; new.tasa_detraccion := 0;
  end if;
  new.monto_neto_pagar := new.importe_total - new.monto_detraccion;

  -- Límite opcional del plan gratuito
  if tg_op = 'INSERT' then
    select coalesce(nullif(valor,'')::int, 0) into lim from public.parametros where clave = 'limite_free_mensual';
    if coalesce(lim,0) > 0 then
      select case when plan = 'pro' and pro_hasta is not null and pro_hasta < now() then 'free' else plan end
        into pl from public.perfiles where user_id = new.user_id;
      if coalesce(pl,'free') = 'free' then
        select count(*) into n from public.movimientos
         where user_id = new.user_id
           and fecha_emision >= date_trunc('month', coalesce(new.fecha_emision, now()))
           and fecha_emision <  date_trunc('month', coalesce(new.fecha_emision, now())) + interval '1 month';
        if n >= lim then
          raise exception 'Llegaste al límite del plan gratuito (% movimientos al mes). Pasa al plan Pro.', lim; end if;
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_calc_mov on public.movimientos;
create trigger trg_calc_mov before insert or update on public.movimientos
  for each row execute function public.calc_movimiento();

-- 4) SEGURIDAD: cada usuario solo ve y modifica lo suyo (RLS) -------------
alter table public.perfiles               enable row level security;
alter table public.ajustes                enable row level security;
alter table public.movimientos            enable row level security;
alter table public.deudas                 enable row level security;
alter table public.deuda_marcas           enable row level security;
alter table public.parametros             enable row level security;
alter table public.parametros_tributarios enable row level security;

drop policy if exists "propios" on public.movimientos;
create policy "propios" on public.movimientos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "propios" on public.ajustes;
create policy "propios" on public.ajustes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "propios" on public.deudas;
create policy "propios" on public.deudas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "propios" on public.deuda_marcas;
create policy "propios" on public.deuda_marcas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- El plan solo se LEE: nadie puede cambiarse a "pro" desde el navegador
drop policy if exists "leer_propio" on public.perfiles;
create policy "leer_propio" on public.perfiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "leer" on public.parametros;
create policy "leer" on public.parametros for select to authenticated using (true);
drop policy if exists "leer" on public.parametros_tributarios;
create policy "leer" on public.parametros_tributarios for select to authenticated using (true);

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select, insert, update, delete on public.movimientos, public.ajustes, public.deudas, public.deuda_marcas to authenticated;
grant select on public.perfiles, public.parametros, public.parametros_tributarios to authenticated;

-- 5) TOTALES MENSUALES CALCULADOS EN LA BASE DE DATOS ---------------------
create or replace function public.resumen_mensual(meses int default 24)
returns table (anio int, mes int, ventas numeric, gastos numeric, n bigint)
language sql stable set search_path = public as $$
  select extract(year  from fecha_emision at time zone 'America/Lima')::int,
         extract(month from fecha_emision at time zone 'America/Lima')::int,
         coalesce(sum(monto_neto_pagar) filter (where tipo_movimiento = 'Ingreso'), 0),
         coalesce(sum(monto_neto_pagar) filter (where tipo_movimiento = 'Gasto'), 0),
         count(*)
    from public.movimientos
   where fecha_emision >= ((date_trunc('month', now() at time zone 'America/Lima') - make_interval(months => least(greatest(meses,1),120))) at time zone 'America/Lima')
   group by 1, 2 order by 1, 2
$$;
revoke execute on function public.resumen_mensual(int) from public, anon;
grant  execute on function public.resumen_mensual(int) to authenticated;

-- 6) DERECHOS DEL USUARIO: eliminar su cuenta y todos sus datos -------------
create or replace function public.eliminar_mi_cuenta() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  delete from auth.users where id = auth.uid();   -- borra en cascada todas sus tablas
end $$;
revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant  execute on function public.eliminar_mi_cuenta() to authenticated;

-- 7) PLAN PRO: vencimiento automático (opcional) --------------------------
create or replace function public.vencer_planes() returns void
language sql security definer set search_path = public as $$
  update public.perfiles set plan = 'free' where plan = 'pro' and pro_hasta is not null and pro_hasta < now();
$$;
revoke execute on function public.vencer_planes() from public, anon, authenticated;
-- Con la extensión pg_cron activada (Database > Extensions):
-- select cron.schedule('vencer-planes', '0 5 * * *', 'select public.vencer_planes()');
