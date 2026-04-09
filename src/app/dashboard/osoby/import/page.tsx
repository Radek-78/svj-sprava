'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'

type RadekImportu = {
  jmeno: string
  prijmeni: string
  email: string
  telefon: string
  adresa_ulice: string
  adresa_mesto: string
  adresa_psc: string
  poznamka: string
  chyba?: string
}

export default function ImportOsobPage() {
  const router = useRouter()
  const supabase = createClient()
  const [radky, setRadky] = useState<RadekImportu[]>([])
  const [nacitani, setNacitani] = useState(false)
  const [vysledek, setVysledek] = useState<{ uspech: number; chyby: number } | null>(null)

  function stahnoutSablonu() {
    const sablona = [
      ['jmeno', 'prijmeni', 'email', 'telefon', 'adresa_ulice', 'adresa_mesto', 'adresa_psc', 'poznamka'],
      ['Jan', 'Novák', 'jan.novak@email.cz', '+420 777 123 456', 'Spojovací 557/1', 'Praha 9', '190 00', ''],
      ['Marie', 'Svobodová', 'marie@email.cz', '+420 602 987 654', 'Spojovací 557/2', 'Praha 9', '190 00', ''],
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(sablona)
    ws['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 26 }, { wch: 18 },
      { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Osoby')
    XLSX.writeFile(wb, 'sablona_osoby.xlsx')
  }

  function nacistSoubor(e: React.ChangeEvent<HTMLInputElement>) {
    const soubor = e.target.files?.[0]
    if (!soubor) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

      const zpracovane = json.map(row => {
        const radek: RadekImportu = {
          jmeno: String(row['jmeno'] ?? '').trim(),
          prijmeni: String(row['prijmeni'] ?? '').trim(),
          email: String(row['email'] ?? '').trim(),
          telefon: String(row['telefon'] ?? '').trim(),
          adresa_ulice: String(row['adresa_ulice'] ?? '').trim(),
          adresa_mesto: String(row['adresa_mesto'] ?? '').trim(),
          adresa_psc: String(row['adresa_psc'] ?? '').trim(),
          poznamka: String(row['poznamka'] ?? '').trim(),
        }
        if (!radek.jmeno) radek.chyba = 'Chybí jméno'
        else if (!radek.prijmeni) radek.chyba = 'Chybí příjmení'
        return radek
      })

      setRadky(zpracovane)
      setVysledek(null)
    }
    reader.readAsArrayBuffer(soubor)
  }

  async function handleImport() {
    const platne = radky.filter(r => !r.chyba)
    if (platne.length === 0) return

    setNacitani(true)
    let uspech = 0
    let chyby = 0

    for (const r of platne) {
      const { error } = await supabase.from('osoby').insert({
        jmeno: r.jmeno,
        prijmeni: r.prijmeni,
        email: r.email || null,
        telefon: r.telefon || null,
        adresa_ulice: r.adresa_ulice || null,
        adresa_mesto: r.adresa_mesto || null,
        adresa_psc: r.adresa_psc || null,
        poznamka: r.poznamka || null,
      })
      if (error) chyby++
      else uspech++
    }

    setVysledek({ uspech, chyby })
    setNacitani(false)
    if (chyby === 0) {
      setTimeout(() => { router.push('/dashboard/osoby'); router.refresh() }, 2000)
    }
  }

  const platneRadky = radky.filter(r => !r.chyba)
  const chybneRadky = radky.filter(r => r.chyba)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/osoby" className="text-sm text-gray-500 hover:text-gray-700">← Zpět</Link>
        <h2 className="text-2xl font-bold text-gray-900">Import osob z Excelu</h2>
      </div>

      {/* Krok 1 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">1</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Stáhněte šablonu</h3>
            <p className="text-sm text-gray-500 mb-4">Vyplňte data vlastníků a nájemníků. Sloupce musí zůstat s původními názvy.</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 font-mono">
              jmeno | prijmeni | email | telefon | adresa_ulice | adresa_mesto | adresa_psc | poznamka
            </div>
            <button
              onClick={stahnoutSablonu}
              className="flex items-center gap-2 bg-green-600 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Stáhnout šablonu (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Krok 2 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">2</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Nahrajte vyplněný soubor</h3>
            <p className="text-sm text-gray-500 mb-4">Vyberte .xlsx soubor s vyplněnými osobami.</p>
            <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-5 hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-600">Klikněte pro výběr souboru nebo přetáhněte sem</span>
              <input type="file" accept=".xlsx,.xls" onChange={nacistSoubor} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Náhled */}
      {radky.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">3</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Zkontrolujte data</h3>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-green-600 font-medium">✓ {platneRadky.length} platných řádků</span>
                {chybneRadky.length > 0 && <span className="text-red-600 font-medium">✗ {chybneRadky.length} chybných řádků</span>}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Příjmení</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Jméno</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">E-mail</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Telefon</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Stav</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {radky.map((r, i) => (
                      <tr key={i} className={r.chyba ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-gray-900">{r.prijmeni || '—'}</td>
                        <td className="px-3 py-2 text-gray-900">{r.jmeno || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.telefon || '—'}</td>
                        <td className="px-3 py-2">
                          {r.chyba
                            ? <span className="text-red-600 text-xs">{r.chyba}</span>
                            : <span className="text-green-600 text-xs">✓ OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {vysledek ? (
                <div className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${vysledek.chyby === 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}>
                  {vysledek.chyby === 0
                    ? `✓ Úspěšně importováno ${vysledek.uspech} osob. Přesměrovávám...`
                    : `Importováno ${vysledek.uspech} osob, ${vysledek.chyby} selhalo.`}
                </div>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={nacitani || platneRadky.length === 0}
                  className="mt-5 bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {nacitani ? 'Importuji...' : `Importovat ${platneRadky.length} osob`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
