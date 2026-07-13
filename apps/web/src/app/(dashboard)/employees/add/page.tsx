'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth'
import { api, type CompanyRole } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Copy, Check, UserPlus } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-shadow disabled:opacity-50'
const labelCls = 'text-sm font-medium text-foreground'

const ROLES: CompanyRole[] = ['EMPLOYEE', 'FINANCE', 'ADMIN']

export default function AddEmployeePage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', role: 'EMPLOYEE' as CompanyRole })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState<{ email: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = getToken()!
      const res = await api.company.addUser(token, form)
      if (res.inviteLink) {
        setInvite({ email: form.email, link: res.inviteLink })
      } else {
        // Existing account added to the company — no invite needed.
        router.push('/employees')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!invite) return
    await navigator.clipboard.writeText(invite.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function addAnother() {
    setForm({ fullName: '', email: '', role: 'EMPLOYEE' })
    setInvite(null)
    setError('')
  }

  if (invite) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Link href="/employees" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to employees
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle>Employee added</CardTitle>
            </div>
            <CardDescription>
              Share this invite link with <span className="font-medium text-foreground">{invite.email}</span> so they can
              set their own password. The link expires in 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input readOnly value={invite.link} className={`${inputCls} font-mono text-xs`} onFocus={(e) => e.target.select()} />
              <Button type="button" variant="outline" onClick={copyLink} className="shrink-0">
                {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The invite is also logged on the server (dev mode). Wire up an email provider in
              <code className="mx-1">MailService</code> to deliver it automatically.
            </p>
            <div className="flex gap-3 pt-1">
              <Button onClick={addAnother} className="flex-1">Add another</Button>
              <Button variant="outline" render={<Link href="/employees" />}>Done</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/employees"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add Employee</CardTitle>
          <CardDescription>
            If the email isn&apos;t registered yet, we&apos;ll create a pending account and generate an invite link so
            they can set their own password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className={labelCls}>Full Name *</label>
              <input
                id="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Jane Smith"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelCls}>Email *</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className={labelCls}>Role *</label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as CompanyRole })}
                className={inputCls}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                ADMIN: full access · FINANCE: approve &amp; reimburse · EMPLOYEE: submit expenses
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Adding…' : 'Add Employee'}
              </Button>
              <Button type="button" variant="outline" render={<Link href="/employees" />}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
