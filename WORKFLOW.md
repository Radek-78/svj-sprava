# Jak pracujeme s aplikací SVJ Správa

## Přehled

Aplikace je postavena na **Next.js 16** (React, TypeScript) s databází **Supabase** (PostgreSQL).
Kód je uložen na GitHubu a automaticky nasazován přes **Vercel** — každý push do větve `main` spustí nové nasazení.

---

## Technologický stack

| Vrstva | Technologie |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Font | Geist (přes `next/font/google`) |
| Databáze | Supabase (PostgreSQL s Row Level Security) |
| Auth | Supabase Auth (email + heslo) |
| Repozitář | GitHub — `Radek-78/svj-sprava` |
| Hosting | Vercel (automatický deploy z větve `main`) |

---

## Struktura projektu

```
src/
  app/
    layout.tsx              # Kořenový layout (font, výška stránky)
    globals.css             # Globální styly, dot pattern pozadí
    login/page.tsx          # Přihlašovací stránka
    dashboard/
      layout.tsx            # Ověření přihlášení, TopNav
      page.tsx              # Přesměrování na /jednotky
      jednotky/
        page.tsx            # Server component — načte data z DB
        JednotkyClient.tsx  # Client component — tabulka + modaly
      osoby/
        page.tsx            # Server component — načte data z DB
        OsobyClient.tsx     # Client component — tabulka + modaly
  components/
    TopNav.tsx              # Navigační lišta nahoře
    PageShell.tsx           # Sdílená šablona pro všechny záložky
  lib/
    supabase/
      client.ts             # Supabase klient (prohlížeč)
      server.ts             # Supabase klient (server)
```

---

## Jak funguje práce s AI asistentem (Claude)

Úpravy aplikace probíhají přímo přes **Claude Code** — AI asistent čte, píše a upravuje soubory.
Žádný kód se nepíše ručně.

**Typický průběh úpravy:**

1. Popíšeš co chceš změnit nebo přidat
2. Claude přečte relevantní soubory, navrhne řešení a provede úpravy
3. Claude zkontroluje TypeScript chyby
4. Claude provede `git commit` a `git push`
5. Vercel automaticky spustí nové nasazení (trvá ~1–2 minuty)

---

## Git workflow

Pracujeme přímo na větvi `main`. Žádné feature branches, žádné pull requesty.

```
# Co se děje při každé změně:

git add <soubory>
git commit -m "Popis změny"
git push origin main

# → Vercel detekuje push → spustí build → nasadí novou verzi
```

---

## Databáze (Supabase)

Schéma databáze se spravuje přímo v **Supabase SQL editoru** (supabase.com → projekt → SQL Editor).
Žádné migrace, žádný ORM — čistý SQL.

### Tabulky

**`jednotky`** — bytové jednotky
- `id`, `cislo_jednotky`, `ulice_vchodu`, `patro`, `uzitna_plocha`, `vytapena_plocha`
- `podil_citatel`, `podil_jmenovatel` (výchozí 10000)
- `pocet_pokoju`, `poznamka`

**`osoby`** — vlastníci, nájemníci, bydlící
- `id`, `jmeno`, `prijmeni`, `titul`
- `email`, `telefon`, `mobil`
- `kontaktni_ulice`, `kontaktni_mesto`, `kontaktni_psc`
- `poznamka`

**`jednotky_osoby`** — vazby osoby na jednotku
- `id`, `jednotka_id` (FK → jednotky), `osoba_id` (FK → osoby)
- `role` — `vlastnik` / `najemnik` / `bydlici`
- `typ_vlastnictvi` — `individualni` / `podilove` / `sjm` / `mcp`
- `podil_citatel`, `podil_jmenovatel` (pro podílové vlastnictví)
- `datum_od`, `datum_do`, `je_aktivni`

Row Level Security je zapnuto — přístup mají pouze přihlášení uživatelé.

---

## Jak přidat novou záložku

1. Vytvoř složku `src/app/dashboard/nazev/`
2. `page.tsx` — server component, načte data ze Supabase
3. `NazevClient.tsx` — client component, použije `PageShell` ze `src/components/PageShell.tsx`
4. Přidej odkaz do `src/components/TopNav.tsx` (pole `navLinks`)

---

## Jak funguje `PageShell`

`PageShell` je sdílená šablona záložky. Přijímá:
- `title` — název záložky
- `stats` — statistické pilulky v hlavičce (hodnota + popis + barva)
- `actions` — pravá část hlavičky (vyhledávání, tlačítko Přidat)
- `children` — obsah (tabulka)

```tsx
<PageShell
  title="Název záložky"
  stats={[
    { label: 'celkem', value: 42 },
    { label: 'aktivních', value: 38, dot: 'emerald', color: 'emerald' },
  ]}
  actions={<AddButton onClick={...}>Přidat</AddButton>}
>
  <PageTable>
    <PageThead>
      <PageTh>Sloupec 1</PageTh>
      <PageTh>Sloupec 2</PageTh>
    </PageThead>
    <PageTbody>
      {data.map(item => (
        <PageTr key={item.id} onClick={() => openModal(item.id)}>
          <PageTd>{item.nazev}</PageTd>
          <PageTd>{item.hodnota}</PageTd>
        </PageTr>
      ))}
    </PageTbody>
  </PageTable>
</PageShell>
```

---

## Modaly

Každá záložka má vlastní modal řízený stavem `view`:

```typescript
type ModalView = 'detail' | 'edit' | 'nova' | ...
```

Modal je vždy `fixed inset-0 z-50` — překrývá celou stránku.
Po uložení se zavolá `refreshData()` (re-fetch z Supabase) a `router.refresh()` (invalidace Next.js cache).
