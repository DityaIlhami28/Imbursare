'use client'

import { useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'
import { api, type Position } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Plus, X } from 'lucide-react'

const LEVELS = ['staff', 'supervisor', 'manager', 'director', 'vp', 'c-level'] as const
type Level = (typeof LEVELS)[number]

const levelLabel: Record<number, string> = {
  1: 'Staff', 2: 'Supervisor', 3: 'Manager', 4: 'Director', 5: 'VP', 6: 'C-Level',
}

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-shadow disabled:opacity-50'

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', positionLevel: 'staff' as Level })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    load()
  }, [])

  function load() {
    const token = getToken()
    if (!token) return
    setLoading(true)
    api.positions.getAll(token)
      .then(setPositions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const token = getToken()!
      const created = await api.positions.create(token, form)
      setPositions((prev) => [...prev, created])
      setForm({ name: '', positionLevel: 'staff' })
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create position')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Positions</h1>
          <p className="text-sm text-muted-foreground">Define job positions and their hierarchy levels</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError('') }}>
          {showForm ? <><X className="h-4 w-4 mr-1.5" /> Cancel</> : <><Plus className="h-4 w-4 mr-1.5" /> New Position</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Position</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="Position name e.g. Software Engineer"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`${inputCls} flex-1`}
              />
              <select
                value={form.positionLevel}
                onChange={(e) => setForm({ ...form, positionLevel: e.target.value as Level })}
                className={`${inputCls} sm:w-44`}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
              <Button type="submit" disabled={saving} className="shrink-0">
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </form>
            {formError && <p className="text-sm text-destructive mt-2">{formError}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> All Positions ({positions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : positions.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No positions defined yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {positions
                .sort((a, b) => a.level - b.level)
                .map((pos) => (
                  <div key={pos.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{pos.name}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Level {pos.level} · {levelLabel[pos.level]}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
