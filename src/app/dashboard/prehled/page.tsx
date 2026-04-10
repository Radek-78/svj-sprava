import { createClient } from '@/lib/supabase/server'
import PrehledClient from './PrehledClient'

export default async function PrehledPage() {
  const supabase = await createClient()

  const [
    { data: jednotky },
    { count: celkemOsob },
    { data: vybor },
    { data: nastaveniArr },
  ] = await Promise.all([
    supabase.from('jednotky').select('id, jednotky_osoby(role, je_aktivni)'),
    supabase.from('osoby').select('*', { count: 'exact', head: true }),
    supabase.from('vybor').select('*, osoby(id, jmeno, prijmeni, email, telefon, mobil)').order('poradi'),
    supabase.from('svj_nastaveni').select('klic, hodnota'),
  ])

  const nastaveni: Record<string, string> = {}
  for (const n of nastaveniArr ?? []) nastaveni[n.klic] = n.hodnota ?? ''

  const celkemJednotek = jednotky?.length ?? 0
  const obsazenoJednotek = jednotky?.filter(j =>
    (j.jednotky_osoby as { role: string; je_aktivni: boolean }[]).some(v => v.role === 'vlastnik' && v.je_aktivni)
  ).length ?? 0
  const pronajatoJednotek = jednotky?.filter(j =>
    (j.jednotky_osoby as { role: string; je_aktivni: boolean }[]).some(v => v.role === 'najemnik' && v.je_aktivni)
  ).length ?? 0

  return (
    <PrehledClient
      stats={{
        celkemJednotek,
        obsazenoJednotek,
        pronajatoJednotek,
        volneJednotek: celkemJednotek - obsazenoJednotek,
        celkemOsob: celkemOsob ?? 0,
      }}
      initialVybor={vybor ?? []}
      initialNastaveni={nastaveni}
    />
  )
}
