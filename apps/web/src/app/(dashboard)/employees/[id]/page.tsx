'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type EmployeeDetail, type Position } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Save } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-shadow disabled:opacity-50'
const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([])
  const [form, setForm] = useState({ address: '', phone: '', unit: '', positionId: '', supervisorId: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return

    Promise.all([
      api.company.getEmployee(token, id),
      api.positions.getAll(token).catch(() => [] as Position[]),
      api.company.getEmployees(token).catch(() => []),
    ])
      .then(([emp, pos, emps]) => {
        setEmployee(emp)
        setPositions(pos)
        setEmployees(emps.filter((e) => e.id !== id))
        setForm({
          address: emp.address ?? '',
          phone: emp.phone ?? '',
          unit: emp.unit ?? '',
          positionId: emp.position?.id ?? '',
          supervisorId: emp.supervisor?.id ?? '',
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const token = getToken()!
      const body: Record<string, unknown> = {}
      if (form.address) body.address = form.address
      if (form.phone) body.phone = form.phone
      if (form.unit) body.unit = form.unit
      if (form.positionId) body.positionId = form.positionId
      if (form.supervisorId) body.supervisorId = form.supervisorId
      await api.company.updateEmployee(token, id, body)
      setSuccess('Employee updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-24">
        <p className="text-destructive">{error || 'Employee not found'}</p>
        <Link href="/employees" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/employees"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      {/* Employee header */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{employee.fullName}</h1>
            <p className="text-sm text-muted-foreground">{employee.email}</p>
            {employee.position && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {employee.position.name} · {employee.unit ?? 'No unit'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="unit" className={labelCls}>Unit / Department</label>
                <input
                  id="unit"
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g. Engineering"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="position" className={labelCls}>Position</label>
                <select
                  id="position"
                  value={form.positionId}
                  onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">No position</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="supervisor" className={labelCls}>Supervisor</label>
              <select
                id="supervisor"
                value={form.supervisorId}
                onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}
                className={inputCls}
              >
                <option value="">No supervisor</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className={labelCls}>Phone</label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+62 812 3456 7890"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className={labelCls}>Address</label>
              <textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, City, Province"
                className={`${inputCls} resize-none`}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subordinates */}
      {employee.subordinates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Direct Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {employee.subordinates.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/employees/${sub.id}`}
                    className="flex items-center gap-2 rounded-lg p-2 hover:bg-accent transition-colors text-sm"
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {sub.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {sub.fullName}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
