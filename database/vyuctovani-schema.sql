-- Spustit v Supabase SQL editoru před prvním importem vyúčtování.

create table if not exists public.vyuctovani_sluzeb (
  id uuid primary key default gen_random_uuid(),
  osoba_id uuid not null references public.osoby(id) on delete restrict,
  jednotka_id uuid not null references public.jednotky(id) on delete restrict,
  rok integer not null,
  obdobi_od date not null,
  obdobi_do date not null,
  cislo_dokladu text,
  variabilni_symbol text,
  uzivatel_text text,
  typ_vysledku text not null check (typ_vysledku in ('preplatek', 'nedoplatek', 'nula')),
  castka numeric(12,2),
  zaplacena_zaloha numeric(12,2),
  predepsana_zaloha numeric(12,2),
  naklad_celkem numeric(12,2),
  celkovy_predpis numeric(12,2),
  nevyuctovatelne_predpis numeric(12,2),
  prispevek_sprava_domu numeric(12,2),
  zdroj_soubor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (osoba_id, jednotka_id, rok, cislo_dokladu)
);

create table if not exists public.odecty_vodomeru (
  id uuid primary key default gen_random_uuid(),
  vyuctovani_id uuid not null references public.vyuctovani_sluzeb(id) on delete cascade,
  jednotka_id uuid not null references public.jednotky(id) on delete restrict,
  cislo_merice text not null,
  typ text not null default 'SV',
  datum_od date,
  datum_do date,
  pocatecni_stav numeric(12,3),
  koncovy_stav numeric(12,3),
  spotreba numeric(12,3),
  created_at timestamptz not null default now(),
  unique (vyuctovani_id, cislo_merice, datum_od, datum_do)
);

create index if not exists vyuctovani_sluzeb_osoba_obdobi_idx
  on public.vyuctovani_sluzeb(osoba_id, obdobi_od);

create index if not exists vyuctovani_sluzeb_jednotka_obdobi_idx
  on public.vyuctovani_sluzeb(jednotka_id, obdobi_od);

create index if not exists odecty_vodomeru_jednotka_merice_datum_idx
  on public.odecty_vodomeru(jednotka_id, cislo_merice, datum_od);

alter table public.vyuctovani_sluzeb enable row level security;
alter table public.odecty_vodomeru enable row level security;

drop policy if exists "Přihlášení uživatelé čtou vyúčtování" on public.vyuctovani_sluzeb;
create policy "Přihlášení uživatelé čtou vyúčtování"
  on public.vyuctovani_sluzeb for select
  to authenticated
  using (true);

drop policy if exists "Přihlášení uživatelé zapisují vyúčtování" on public.vyuctovani_sluzeb;
create policy "Přihlášení uživatelé zapisují vyúčtování"
  on public.vyuctovani_sluzeb for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Přihlášení uživatelé čtou odečty" on public.odecty_vodomeru;
create policy "Přihlášení uživatelé čtou odečty"
  on public.odecty_vodomeru for select
  to authenticated
  using (true);

drop policy if exists "Přihlášení uživatelé zapisují odečty" on public.odecty_vodomeru;
create policy "Přihlášení uživatelé zapisují odečty"
  on public.odecty_vodomeru for all
  to authenticated
  using (true)
  with check (true);
