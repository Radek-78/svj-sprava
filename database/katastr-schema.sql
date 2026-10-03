-- Spustit v Supabase SQL editoru před prvním použitím stránky Kontrola katastru.

create table if not exists public.katastr_vypisy (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  poznamka text,
  raw_text text not null,
  zaznamy jsonb not null,
  pocet_zaznamu integer not null
);

create index if not exists katastr_vypisy_created_at_idx
  on public.katastr_vypisy(created_at desc);

alter table public.katastr_vypisy enable row level security;

drop policy if exists "Přihlášení uživatelé čtou výpisy z katastru" on public.katastr_vypisy;
create policy "Přihlášení uživatelé čtou výpisy z katastru"
  on public.katastr_vypisy for select
  to authenticated
  using (true);

drop policy if exists "Přihlášení uživatelé zapisují výpisy z katastru" on public.katastr_vypisy;
create policy "Přihlášení uživatelé zapisují výpisy z katastru"
  on public.katastr_vypisy for all
  to authenticated
  using (true)
  with check (true);
