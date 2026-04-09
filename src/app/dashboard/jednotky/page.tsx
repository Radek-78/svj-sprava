import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function JednotkyPage() {
  const supabase = await createClient()

  const { data: jednotky } = await supabase
    .from('jednotky')
    .select(`*, vlastnici!left(osoba_id, je_aktivni, osoby(jmeno, prijmeni)), najemnici!left(je_aktivni)`)
    .order('cislo_jednotky')

  const celkem = jednotky?.length ?? 0
  const sVlastnikem = jednotky?.filter(j => (j.vlastnici ?? []).some((v: {je_aktivni: boolean}) => v.je_aktivni)).length ?? 0
  const sNajemnikem = jednotky?.filter(j => (j.najemnici ?? []).some((n: {je_aktivni: boolean}) => n.je_aktivni)).length ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Hlavička stránky */}
      <div className="px-8 pt-8 pb-5 border-b border-zinc-200 bg-stone-50">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Bytové jednotky</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-zinc-500">{celkem} jednotek celkem</span>
              <span className="text-zinc-300">·</span>
              <span className="text-sm text-emerald-600 font-medium">{sVlastnikem} obsazeno</span>
              <span className="text-zinc-300">·</span>
              <span className="text-sm text-amber-600 font-medium">{sNajemnikem} s nájemníkem</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/jednotky/import"
              className="flex items-center gap-2 border border-zinc-300 text-zinc-700 text-sm px-3.5 py-2 rounded-xl hover:bg-zinc-50 transition-colors font-medium">
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </Link>
            <Link href="/dashboard/jednotky/nova"
              className="flex items-center gap-2 bg-violet-600 text-white text-sm px-3.5 py-2 rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Přidat jednotku
            </Link>
          </div>
        </div>
      </div>

      {/* Tabulka */}
      <div className="flex-1 overflow-hidden px-8 py-5">
        {(!jednotky || jednotky.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-zinc-200">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm mb-4">Zatím nejsou přidány žádné jednotky.</p>
            <Link href="/dashboard/jednotky/nova" className="bg-violet-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors">
              Přidat první jednotku
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 210px)' }}>
            <div className="overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest w-20">Číslo</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest w-16">Patro</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest w-24">Výměra</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest w-28">Podíl</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Vlastník</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest w-28">Obsazení</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {jednotky.map((j, idx) => {
                    const aktivniVlastnici = (j.vlastnici ?? []).filter((v: {je_aktivni: boolean}) => v.je_aktivni)
                    const maNajemnika = (j.najemnici ?? []).some((n: {je_aktivni: boolean}) => n.je_aktivni)

                    return (
                      <tr key={j.id} className={`border-b border-zinc-100 hover:bg-violet-50/30 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/40'}`}>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-zinc-900">{j.cislo_jednotky}</span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{j.patro ?? '—'}</td>
                        <td className="px-4 py-2.5 text-zinc-600 tabular-nums">{j.vymera_m2} m²</td>
                        <td className="px-4 py-2.5 text-zinc-400 tabular-nums text-xs">{j.podil_citatel}/{j.podil_jmenovatel}</td>
                        <td className="px-4 py-2.5">
                          {aktivniVlastnici.length === 0 ? (
                            <span className="text-zinc-300 text-xs italic">Neuvedeno</span>
                          ) : (
                            <span className="text-zinc-700">
                              {aktivniVlastnici.map((v: {osoba_id: string, osoby: {jmeno: string | null, prijmeni: string}}, i: number) => (
                                <span key={i}>{i > 0 && ', '}{v.osoby.prijmeni}{v.osoby.jmeno ? ` ${v.osoby.jmeno}` : ''}</span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {maNajemnika ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                              Nájemník
                            </span>
                          ) : aktivniVlastnici.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                              Vlastník
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 flex-shrink-0"></span>
                              Volné
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/dashboard/jednotky/${j.id}`}
                            className="text-xs font-medium text-zinc-400 hover:text-violet-600 transition-colors opacity-0 group-hover:opacity-100">
                            Detail →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Celkem {celkem} jednotek</span>
              <span className="text-xs text-zinc-400">{sVlastnikem} obsazeno · {celkem - sVlastnikem} bez vlastníka</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
