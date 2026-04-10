'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Typy ────────────────────────────────────────────────────────────────────

type VyborClen = {
  id: string
  role: 'predseda' | 'mistopredseda' | 'clen'
  poradi: number
  osoba_id: string | null
  jmeno_externi: string | null
  email: string | null
  telefon: string | null
  osoby?: { id: string; jmeno: string | null; prijmeni: string } | null
}

type AuthUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

type Stats = {
  celkemJednotek: number
  obsazenoJednotek: number
  pronajatoJednotek: number
  volneJednotek: number
  celkemOsob: number
}

type VyborForm = {
  role: 'predseda' | 'mistopredseda' | 'clen'
  poradi: string
  isExternal: boolean
  osoba_id: string
  jmeno_externi: string
  email: string
  telefon: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  predseda: 'Předseda',
  mistopredseda: 'Místopředseda',
  clen: 'Člen výboru',
}

const ROLE_COLORS: Record<string, string> = {
  predseda: 'bg-violet-100 text-violet-700',
  mistopredseda: 'bg-blue-100 text-blue-700',
  clen: 'bg-zinc-100 text-zinc-600',
}

function getJmeno(clen: VyborClen): string {
  if (clen.osoby) return [clen.osoby.prijmeni, clen.osoby.jmeno].filter(Boolean).join(' ')
  return clen.jmeno_externi ?? '(neuvedeno)'
}

function formatDate(d: string | null): string {
  if (!d) return 'Nikdy'
  return new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1'

// ─── Modální okno ─────────────────────────────────────────────────────────────

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onMouseDown={e => e.stopPropagation()}>
        <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <p className="text-white font-semibold text-sm">{title}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function PrehledClient({
  stats,
  initialVybor,
  initialNastaveni,
}: {
  stats: Stats
  initialVybor: VyborClen[]
  initialNastaveni: Record<string, string>
}) {
  const [vybor, setVybor] = useState(initialVybor)
  const [nastaveni, setNastaveni] = useState(initialNastaveni)
  const [vsechnyOsoby, setVsechnyOsoby] = useState<{ id: string; jmeno: string | null; prijmeni: string }[]>([])

  // Auth uživatelé
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  // Výbor modal
  const [vyborOpen, setVyborOpen] = useState(false)
  const [editClen, setEditClen] = useState<VyborClen | null>(null)
  const [form, setForm] = useState<VyborForm>({
    role: 'clen', poradi: '0', isExternal: false,
    osoba_id: '', jmeno_externi: '', email: '', telefon: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Pozvat uživatele modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Nastavení modal
  const [nastaveniOpen, setNastaveniOpen] = useState(false)
  const [editEmailVybor, setEditEmailVybor] = useState('')
  const [savingNastaveni, setSavingNastaveni] = useState(false)

  const supabase = createClient()

  // Načíst auth uživatele
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Chyba')
      setUsers((await res.json()).users ?? [])
      setUsersError('')
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // Načíst osoby pro formulář výboru
  useEffect(() => {
    if (vyborOpen) {
      supabase.from('osoby').select('id, jmeno, prijmeni').order('prijmeni')
        .then(({ data }) => setVsechnyOsoby(data ?? []))
    }
  }, [vyborOpen])

  // Refresh výboru ze Supabase
  async function refreshVybor() {
    const { data } = await supabase.from('vybor').select('*, osoby(id, jmeno, prijmeni)').order('poradi')
    setVybor(data ?? [])
  }

  // ── Výbor CRUD ──

  function openAdd() {
    setEditClen(null)
    setForm({ role: 'clen', poradi: String(vybor.length), isExternal: false, osoba_id: '', jmeno_externi: '', email: '', telefon: '' })
    setFormError('')
    setVyborOpen(true)
  }

  function openEdit(clen: VyborClen) {
    setEditClen(clen)
    setForm({
      role: clen.role,
      poradi: String(clen.poradi),
      isExternal: !clen.osoba_id,
      osoba_id: clen.osoba_id ?? '',
      jmeno_externi: clen.jmeno_externi ?? '',
      email: clen.email ?? '',
      telefon: clen.telefon ?? '',
    })
    setFormError('')
    setVyborOpen(true)
  }

  async function handleSaveClen(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormError('')
    const payload = {
      role: form.role,
      poradi: parseInt(form.poradi) || 0,
      osoba_id: form.isExternal ? null : (form.osoba_id || null),
      jmeno_externi: form.isExternal ? (form.jmeno_externi || null) : null,
      email: form.email || null,
      telefon: form.telefon || null,
    }
    const { error } = editClen
      ? await supabase.from('vybor').update(payload).eq('id', editClen.id)
      : await supabase.from('vybor').insert(payload)
    if (error) { setFormError(error.message); setSaving(false); return }
    await refreshVybor()
    setSaving(false)
    setVyborOpen(false)
  }

  async function handleDeleteClen(id: string) {
    setDeletingId(id)
    await supabase.from('vybor').delete().eq('id', id)
    await refreshVybor()
    setDeletingId(null)
  }

  // ── Nastavení ──

  function openNastaveni() {
    setEditEmailVybor(nastaveni.email_vybor ?? '')
    setNastaveniOpen(true)
  }

  async function handleSaveNastaveni(e: React.FormEvent) {
    e.preventDefault()
    setSavingNastaveni(true)
    await supabase.from('svj_nastaveni').upsert({ klic: 'email_vybor', hodnota: editEmailVybor })
    setNastaveni(p => ({ ...p, email_vybor: editEmailVybor }))
    setSavingNastaveni(false)
    setNastaveniOpen(false)
  }

  // ── Pozvat uživatele ──

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true); setInviteError(''); setInviteSuccess(false)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setInviteSuccess(true)
      setInviteEmail('')
      await loadUsers()
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setInviting(false)
    }
  }

  async function handleDeleteUser(userId: string) {
    setDeletingUserId(userId)
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    await loadUsers()
    setDeletingUserId(null)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="h-full overflow-auto bg-zinc-50">

        {/* Hlavička – stejná výška jako ostatní záložky */}
        <div className="bg-white border-b border-zinc-200 px-6 flex-shrink-0" style={{ height: 56 }}>
          <div className="h-full flex items-center gap-4">
            <h1 className="text-base font-semibold text-zinc-900 whitespace-nowrap">Přehled</h1>
            <div className="flex items-center gap-2">
              {[
                { label: 'jednotek', value: stats.celkemJednotek },
                { label: 'obsazeno', value: stats.obsazenoJednotek, color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
                { label: 'pronajato', value: stats.pronajatoJednotek, color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
                { label: 'volné', value: stats.volneJednotek, color: 'bg-zinc-100 text-zinc-600', dot: 'bg-zinc-300' },
                { label: 'osob', value: stats.celkemOsob, color: 'bg-sky-50 text-sky-700', dot: 'bg-sky-400' },
              ].map((s, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${s.color ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {s.dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />}
                  <span className="font-semibold">{s.value}</span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Obsah */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6">

            {/* ── Výbor SVJ ── */}
            <div className="col-span-2 bg-white rounded-2xl border border-zinc-100 shadow-sm flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Výbor SVJ</p>
                <button onClick={openAdd} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Přidat člena
                </button>
              </div>

              {vybor.length === 0 ? (
                <div className="px-6 py-10 text-center text-zinc-400 text-sm italic">Výbor zatím nebyl nastaven.</div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {vybor.map(clen => (
                    <div key={clen.id} className="px-6 py-4 flex items-start justify-between group">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-zinc-500">{getJmeno(clen).slice(0, 1)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-zinc-900">{getJmeno(clen)}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_COLORS[clen.role]}`}>
                              {ROLE_LABELS[clen.role]}
                            </span>
                          </div>
                          {clen.email && (
                            <a href={`mailto:${clen.email}`} className="text-xs text-zinc-400 hover:text-violet-600 transition-colors mt-0.5 block">
                              {clen.email}
                            </a>
                          )}
                          {clen.telefon && <p className="text-xs text-zinc-400 mt-0.5">{clen.telefon}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                        <button onClick={() => openEdit(clen)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteClen(clen.id)} disabled={deletingId === clen.id} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* E-mail výboru */}
              <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">E-mail výboru</p>
                    {nastaveni.email_vybor ? (
                      <a href={`mailto:${nastaveni.email_vybor}`} className="text-sm text-zinc-700 hover:text-violet-600 transition-colors">
                        {nastaveni.email_vybor}
                      </a>
                    ) : (
                      <span className="text-sm text-zinc-400 italic">Nenastaveno</span>
                    )}
                  </div>
                </div>
                <button onClick={openNastaveni} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              </div>
            </div>

            {/* ── Přístupy ── */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Přístupy</p>
                <button
                  onClick={() => { setInviteOpen(true); setInviteEmail(''); setInviteError(''); setInviteSuccess(false) }}
                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Pozvat
                </button>
              </div>

              <div className="flex-1 divide-y divide-zinc-50">
                {loadingUsers ? (
                  <div className="px-5 py-8 text-center text-zinc-400 text-sm">Načítám...</div>
                ) : usersError ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-red-500 font-medium">Nelze načíst uživatele</p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Přidejte <code className="bg-zinc-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> do .env.local</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="px-5 py-8 text-center text-zinc-400 text-sm italic">Žádní uživatelé</div>
                ) : (
                  users.map(u => (
                    <div key={u.id} className="px-5 py-3.5 flex items-start justify-between group">
                      <div className="min-w-0 mr-2">
                        <p className="text-sm font-medium text-zinc-900 truncate">{u.email}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {u.last_sign_in_at ? `Přihlášen: ${formatDate(u.last_sign_in_at)}` : 'Ještě se nepřihlásil'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={deletingUserId === u.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30 flex-shrink-0"
                        title="Odebrat přístup"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Modal: Člen výboru ── */}
      {vyborOpen && (
        <Modal onClose={() => setVyborOpen(false)} title={editClen ? 'Upravit člena výboru' : 'Přidat člena výboru'}>
          <form onSubmit={handleSaveClen} className="px-6 py-5 space-y-4">
            <div>
              <label className={LABEL}>Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['predseda', 'mistopredseda', 'clen'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${form.role === r ? 'bg-zinc-950 text-white border-zinc-950' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={LABEL}>Osoba</label>
              <div className="flex gap-2 mb-2">
                {[false, true].map(ext => (
                  <button key={String(ext)} type="button" onClick={() => setForm(p => ({ ...p, isExternal: ext }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.isExternal === ext ? 'bg-zinc-950 text-white border-zinc-950' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                    {ext ? 'Externí' : 'Ze seznamu osob'}
                  </button>
                ))}
              </div>
              {form.isExternal ? (
                <input value={form.jmeno_externi} onChange={e => setForm(p => ({ ...p, jmeno_externi: e.target.value }))}
                  placeholder="Jméno a příjmení" className={INPUT} />
              ) : (
                <select value={form.osoba_id} onChange={e => setForm(p => ({ ...p, osoba_id: e.target.value }))} className={INPUT}>
                  <option value="">— vyberte osobu —</option>
                  {vsechnyOsoby.map(o => (
                    <option key={o.id} value={o.id}>{[o.prijmeni, o.jmeno].filter(Boolean).join(' ')}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="jan@email.cz" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Telefon</label>
                <input value={form.telefon} onChange={e => setForm(p => ({ ...p, telefon: e.target.value }))}
                  placeholder="+420 000 000 000" className={INPUT} />
              </div>
            </div>

            {formError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50">
                {saving ? 'Ukládám...' : editClen ? 'Uložit změny' : 'Přidat člena'}
              </button>
              <button type="button" onClick={() => setVyborOpen(false)}
                className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                Zrušit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: E-mail výboru ── */}
      {nastaveniOpen && (
        <Modal onClose={() => setNastaveniOpen(false)} title="Kontakt výboru">
          <form onSubmit={handleSaveNastaveni} className="px-6 py-5 space-y-4">
            <div>
              <label className={LABEL}>E-mail výboru SVJ</label>
              <input type="email" value={editEmailVybor} onChange={e => setEditEmailVybor(e.target.value)}
                placeholder="vybor@svj.cz" autoFocus className={INPUT} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingNastaveni}
                className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50">
                {savingNastaveni ? 'Ukládám...' : 'Uložit'}
              </button>
              <button type="button" onClick={() => setNastaveniOpen(false)}
                className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                Zrušit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Pozvat uživatele ── */}
      {inviteOpen && (
        <Modal onClose={() => setInviteOpen(false)} title="Pozvat uživatele">
          <div className="px-6 py-5">
            {inviteSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <p className="text-sm font-semibold text-zinc-900">Pozvánka odeslána</p>
                <p className="text-xs text-zinc-400 mt-1">Uživatel obdrží e-mail s odkazem pro přihlášení.</p>
                <button onClick={() => setInviteOpen(false)}
                  className="mt-4 w-full bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium">
                  Zavřít
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className={LABEL}>E-mail nového uživatele</label>
                  <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="petr.novak@email.cz" autoFocus className={INPUT} />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Uživatel obdrží e-mail s odkazem pro nastavení hesla a přihlášení do aplikace.
                </p>
                {inviteError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{inviteError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={inviting}
                    className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50">
                    {inviting ? 'Odesílám...' : 'Odeslat pozvánku'}
                  </button>
                  <button type="button" onClick={() => setInviteOpen(false)}
                    className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                    Zrušit
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
