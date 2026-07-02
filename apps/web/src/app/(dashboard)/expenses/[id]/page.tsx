'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getToken, parseToken } from '@/lib/auth'
import { api, type ExpenseDetail, type ExpenseLog, type ExpenseStatus, type Category } from '@/lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import {
  ArrowLeft, Paperclip, Clock, FileText, Download,
  CheckCircle, XCircle, Send, CreditCard, Pencil, RotateCcw, AlertCircle, ScanLine, Sparkles, ShieldAlert, Plus, Trash2,
} from 'lucide-react'

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusTimeline({ status }: { status: ExpenseStatus }) {
  const steps = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'SUBMIT', label: 'Submitted' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REIMBURSED', label: 'Reimbursed' },
  ]
  const currentIdx = { DRAFT: 0, SUBMIT: 1, REVISION: 1, APPROVED: 2, REJECTED: 1, REIMBURSED: 3 }[status] ?? 0
  const isDone = (i: number) => i < currentIdx || (status === 'REIMBURSED' && i === 3)

  return (
    <div className="flex items-start w-full">
      {steps.map((step, i) => {
        const done = isDone(i)
        const current = i === currentIdx && status !== 'REIMBURSED'
        const rejected = status === 'REJECTED' && i === 1
        const revision = status === 'REVISION' && i === 1
        const lineActive = i < currentIdx

        const circleClass = rejected
          ? 'bg-destructive border-destructive text-destructive-foreground'
          : revision
          ? 'bg-amber-500 border-amber-500 text-white'
          : done
          ? 'bg-primary border-primary text-primary-foreground'
          : current
          ? 'border-2 border-primary text-primary bg-background'
          : 'border-2 border-border text-muted-foreground bg-background'

        const labelClass = rejected
          ? 'text-destructive'
          : revision
          ? 'text-amber-600 dark:text-amber-400'
          : done || current
          ? 'text-foreground'
          : 'text-muted-foreground'

        const label = rejected ? 'Rejected' : revision ? 'Revision' : step.label

        return (
          <div key={step.key} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${circleClass}`}>
                {done ? '✓' : rejected ? '✕' : i + 1}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${labelClass}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${lineActive ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const ACTION_MESSAGES = {
  submit: 'Expense submitted for approval',
  approve: 'Expense approved',
  reject: 'Expense rejected',
  reimburse: 'Expense marked as reimbursed',
  revision: 'Revision requested',
  financeReject: 'Expense sent back to supervisor for review',
  forceReject: 'Expense force rejected by admin',
} as const

type WorkflowAction = keyof typeof ACTION_MESSAGES

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [logs, setLogs] = useState<ExpenseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Workflow action state
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const [rejectPending, setRejectPending] = useState(false)
  const [revisionPending, setRevisionPending] = useState(false)
  const [financeRejectPending, setFinanceRejectPending] = useState(false)
  const [forceRejectPending, setForceRejectPending] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ title: string | null; amount: number | null } | null>(null)

  // Edit state
  const [editMode, setEditMode] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [editForm, setEditForm] = useState({ title: '', description: '', amount: '', category: '' })
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set())
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const payload = parseToken(token)
    setUserRole(payload?.role ?? null)
    setLoading(true)
    setError('')
    Promise.all([
      api.expense.getDetails(token, id),
      api.expense.getLogs(token, id),
    ])
      .then(([detail, logData]) => {
        setExpense(detail)
        setLogs(logData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  function enterEditMode() {
    if (!expense) return
    setEditForm({
      title: expense.title,
      description: expense.description ?? '',
      amount: String(expense.amount),
      category: expense.category?.name ?? '',
    })
    setRemoveIds(new Set())
    setNewFiles([])
    setSaveError('')
    setEditMode(true)
    const token = getToken()
    if (token && categories.length === 0) {
      api.category.getAll(token).then(setCategories).catch(() => {})
    }
  }

  function cancelEdit() {
    setEditMode(false)
    setRemoveIds(new Set())
    setNewFiles([])
    setSaveError('')
  }

  async function handleSave() {
    const token = getToken()
    if (!token || !expense) return
    setSaving(true)
    setSaveError('')
    try {
      await api.expense.update(
        token,
        id,
        {
          title: editForm.title,
          description: editForm.description,
          amount: Number(editForm.amount),
          category: editForm.category || undefined,
        },
        newFiles.length > 0 ? newFiles : undefined,
        removeIds.size > 0 ? Array.from(removeIds) : undefined,
      )
      setEditMode(false)
      setRemoveIds(new Set())
      setNewFiles([])
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(action: WorkflowAction) {
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      if (action === 'submit') await api.expense.submit(token, id)
      else if (action === 'approve') await api.expense.approve(token, id)
      else if (action === 'reject') await api.expense.reject(token, id, note || undefined)
      else if (action === 'revision') await api.expense.revision(token, id, note)
      else if (action === 'financeReject') await api.expense.financeReject(token, id, note)
      else if (action === 'forceReject') await api.expense.forceReject(token, id, note)
      else await api.expense.reimburse(token, id)
      toast.success(ACTION_MESSAGES[action])
      setNote('')
      setRejectPending(false)
      setRevisionPending(false)
      setFinanceRejectPending(false)
      setForceRejectPending(false)
      setScanResult(null)
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleScanAttachments() {
    const token = getToken()
    if (!token || !expense) return
    setScanning(true)
    setScanResult(null)
    try {
      const result = await api.expense.scanAttachments(token, expense.id)
      setScanResult(result)
    } catch (err) {
      console.error('[Scan] error:', err)
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="text-center py-24">
        <p className="text-destructive">{error || 'Expense not found'}</p>
        <Link href="/expenses" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to expenses
        </Link>
      </div>
    )
  }

  const fromConfig: Record<string, { href: string; label: string }> = {
    'approve-requests': { href: '/approve-requests', label: 'Back to Approve Requests' },
  }
  const roleConfig: Record<string, { href: string; label: string }> = {
    ADMIN:    { href: '/admin/expenses',   label: 'Back to All Expenses' },
    FINANCE:  { href: '/finance/expenses', label: 'Back to Unit Expenses' },
    EMPLOYEE: { href: '/expenses',         label: 'Back to My Expenses' },
  }
  const back = (fromParam && fromConfig[fromParam])
    ?? roleConfig[userRole ?? '']
    ?? { href: '/expenses', label: 'Back to expenses' }

  const canEdit = (expense.status === 'DRAFT' || expense.status === 'REVISION') && userRole === 'EMPLOYEE'
  const showSubmit = (expense.status === 'DRAFT' || expense.status === 'REVISION') && userRole === 'EMPLOYEE'
  const showApproveReject = expense.status === 'SUBMIT' && userRole === 'ADMIN'
  const showReimburse = expense.status === 'APPROVED' && userRole === 'FINANCE'
  const showForceReject = userRole === 'ADMIN' && (expense.status === 'APPROVED' || expense.status === 'REVISION')
  const hasActions = showSubmit || showApproveReject || showReimburse
  const revisionNote = logs.find((l) => l.action === 'REVISION')?.message

  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={back.href}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {back.label}
      </Link>

      <StatusTimeline status={expense.status} />

      {expense.status === 'REVISION' && revisionNote && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Revision Requested</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">{revisionNote}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {editMode ? (
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputClass + ' text-lg font-semibold'}
                  placeholder="Expense title"
                />
              ) : (
                <CardTitle className="text-xl">{expense.title}</CardTitle>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {expense.expenseNumber && (
                  <span className="font-mono text-xs font-semibold tracking-wide text-primary bg-primary/10 rounded px-1.5 py-0.5">
                    {expense.expenseNumber}
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  Created {new Date(expense.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={expense.status} />
              {canEdit && !editMode && (
                <Button size="sm" variant="outline" onClick={enterEditMode}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {editMode ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Amount (IDR)</p>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                    className={inputClass}
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Category</p>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={inputClass + ' resize-none'}
                  placeholder="Add a description…"
                />
              </div>

              {/* Attachment management */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" /> Attachments
                </p>

                {/* Existing attachments */}
                {expense.attachments.length > 0 && (
                  <ul className="space-y-2 mb-2">
                    {expense.attachments.map((att) => {
                      const markedForRemoval = removeIds.has(att.id)
                      return (
                        <li
                          key={att.id}
                          className={`flex items-center gap-3 rounded-lg border p-2 transition-colors ${
                            markedForRemoval
                              ? 'border-destructive/40 bg-destructive/5 opacity-60'
                              : 'border-border'
                          }`}
                        >
                          {att.fileType?.startsWith('image/') ? (
                            <img
                              src={att.fileUrl}
                              alt={att.fileName}
                              className="h-10 w-10 rounded-md object-cover shrink-0 border border-border"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-border bg-muted flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium ${markedForRemoval ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {att.fileName}
                            </p>
                            {markedForRemoval && (
                              <p className="text-xs text-destructive">Will be deleted</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setRemoveIds((prev) => {
                              const next = new Set(prev)
                              if (markedForRemoval) next.delete(att.id)
                              else next.add(att.id)
                              return next
                            })}
                            className={`shrink-0 rounded p-1 transition-colors ${
                              markedForRemoval
                                ? 'text-muted-foreground hover:text-foreground'
                                : 'text-muted-foreground hover:text-destructive'
                            }`}
                            title={markedForRemoval ? 'Undo remove' : 'Remove attachment'}
                          >
                            {markedForRemoval
                              ? <RotateCcw className="h-3.5 w-3.5" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* New files to be added */}
                {newFiles.length > 0 && (
                  <ul className="space-y-2 mb-2">
                    {newFiles.map((file, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2">
                        <div className="h-10 w-10 rounded-md border border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt={file.name} className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">New</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* File input */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border hover:border-primary/50 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-4 w-4 shrink-0" />
                  Add attachments
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? [])
                      setNewFiles((prev) => [...prev, ...picked])
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              {saveError && (
                <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {saveError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={cancelEdit} disabled={saving} className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {expense.amount.toLocaleString('id-ID', {
                      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                {expense.category && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{expense.category.name}</p>
                  </div>
                )}
              </div>

              {expense.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{expense.description}</p>
                </div>
              )}

              {expense.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Attachments ({expense.attachments.length})
                  </p>
                  <ul className="space-y-2">
                    {expense.attachments.map((att) => (
                      <li key={att.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                        {att.fileType?.startsWith('image/') ? (
                          <img
                            src={att.fileUrl}
                            alt={att.fileName}
                            className="h-12 w-12 rounded-md object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md border border-border bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(att.size)}</p>
                        </div>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Workflow actions */}
      {hasActions && !editMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {showSubmit && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {expense.status === 'REVISION'
                    ? 'Make your changes above, then resubmit for approval.'
                    : 'Submit this expense for approval by your supervisor.'}
                </p>
                <Button onClick={() => handleAction('submit')} disabled={submitting} className="w-full">
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting…' : expense.status === 'REVISION' ? 'Resubmit for Approval' : 'Submit for Approval'}
                </Button>
              </div>
            )}

            {showApproveReject && (
              <div className="space-y-3">
                {!rejectPending && !revisionPending ? (
                  <div className="flex gap-2">
                    <Button onClick={() => handleAction('approve')} disabled={submitting} className="flex-1">
                      <CheckCircle className="h-4 w-4" />
                      {submitting ? 'Processing…' : 'Approve'}
                    </Button>
                    <Button variant="outline" onClick={() => setRevisionPending(true)} disabled={submitting} className="flex-1">
                      <RotateCcw className="h-4 w-4" /> Request Revision
                    </Button>
                    <Button variant="destructive" onClick={() => setRejectPending(true)} disabled={submitting} className="flex-1">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                ) : rejectPending ? (
                  <div className="space-y-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={() => handleAction('reject')} disabled={submitting} className="flex-1">
                        {submitting ? 'Rejecting…' : 'Confirm Reject'}
                      </Button>
                      <Button variant="outline" onClick={() => { setRejectPending(false); setNote('') }} disabled={submitting} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Describe what the employee needs to change.</p>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Revision instructions (required)"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleAction('revision')} disabled={submitting || !note.trim()} className="flex-1">
                        <RotateCcw className="h-4 w-4" />
                        {submitting ? 'Sending…' : 'Send for Revision'}
                      </Button>
                      <Button variant="outline" onClick={() => { setRevisionPending(false); setNote('') }} disabled={submitting} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showReimburse && (
              <div className="space-y-4">
                {/* Scan receipt section */}
                {expense.attachments.some((a) => a.fileType?.startsWith('image/')) && (
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Receipt Verification</p>
                      <button
                        type="button"
                        onClick={handleScanAttachments}
                        disabled={scanning}
                        className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {scanning
                          ? <><ScanLine className="h-3.5 w-3.5 animate-pulse" /> Scanning…</>
                          : <><Sparkles className="h-3.5 w-3.5" /> Scan Receipt</>}
                      </button>
                    </div>

                    {scanResult && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-lg bg-muted/50 px-3 py-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Declared</p>
                            <p className="font-semibold text-foreground">
                              {expense.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{expense.title}</p>
                          </div>
                          <div className={`rounded-lg px-3 py-2 ${
                            scanResult.amount !== null && Math.abs(scanResult.amount - expense.amount) > expense.amount * 0.05
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          }`}>
                            <p className="text-xs text-muted-foreground mb-0.5">Scanned</p>
                            <p className="font-semibold text-foreground">
                              {scanResult.amount !== null
                                ? scanResult.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
                                : 'Not detected'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{scanResult.title ?? 'Not detected'}</p>
                          </div>
                        </div>
                        {scanResult.amount !== null && Math.abs(scanResult.amount - expense.amount) > expense.amount * 0.05 && (
                          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            Scanned amount differs from declared amount by more than 5%.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!financeRejectPending ? (
                  <div className="flex gap-2">
                    <Button onClick={() => handleAction('reimburse')} disabled={submitting} className="flex-1">
                      <CreditCard className="h-4 w-4" />
                      {submitting ? 'Processing…' : 'Mark as Reimbursed'}
                    </Button>
                    <Button variant="destructive" onClick={() => setFinanceRejectPending(true)} disabled={submitting} className="flex-1">
                      <ShieldAlert className="h-4 w-4" /> Reject to Supervisor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Describe the issue with the receipt. The supervisor will be notified.</p>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Receipt amount doesn't match declared amount (required)"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={() => handleAction('financeReject')} disabled={submitting || !note.trim()} className="flex-1">
                        <ShieldAlert className="h-4 w-4" />
                        {submitting ? 'Sending…' : 'Confirm — Send to Supervisor'}
                      </Button>
                      <Button variant="outline" onClick={() => { setFinanceRejectPending(false); setNote('') }} disabled={submitting} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showForceReject && !editMode && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> Admin Override
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Force reject this expense regardless of its current approval state. This action cannot be undone.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {!forceRejectPending ? (
              <Button
                variant="destructive"
                onClick={() => setForceRejectPending(true)}
                className="w-full"
              >
                <XCircle className="h-4 w-4" /> Force Reject
              </Button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for force rejection (required)"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleAction('forceReject')}
                    disabled={submitting || !note.trim()}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4" />
                    {submitting ? 'Rejecting…' : 'Confirm Force Reject'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setForceRejectPending(false); setNote('') }}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-border space-y-4 ml-2">
              {logs.map((log) => (
                <li key={log.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  <p className="text-sm font-medium text-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(log.createdAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
