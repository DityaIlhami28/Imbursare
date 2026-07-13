'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type PendingApproval, type ExpenseStatus } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge, OcrBadge } from '@/components/ui/badge'
import { ClipboardCheck, CheckCircle, XCircle, Tag, RotateCcw, ExternalLink, ShieldAlert, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

// ─── Filter configuration ────────────────────────────────────────────────────

const APPROVAL_FILTERS = ['ALL', 'SUBMIT', 'REVISION', 'APPROVED', 'REJECTED'] as const
type ApprovalFilter = (typeof APPROVAL_FILTERS)[number]

const FILTER_CONFIG: Record<ApprovalFilter, { label: string; activeBg: string; activeText: string; activeBorder: string }> = {
  ALL:      { label: 'All',      activeBg: 'bg-primary/10 dark:bg-primary/20',         activeText: 'text-primary',                            activeBorder: 'border-primary/40' },
  SUBMIT:   { label: 'Pending',  activeBg: 'bg-blue-100 dark:bg-blue-900/30',          activeText: 'text-blue-700 dark:text-blue-400',        activeBorder: 'border-blue-300 dark:border-blue-700' },
  REVISION: { label: 'Revision', activeBg: 'bg-amber-100 dark:bg-amber-900/30',        activeText: 'text-amber-700 dark:text-amber-400',      activeBorder: 'border-amber-300 dark:border-amber-700' },
  APPROVED: { label: 'Approved', activeBg: 'bg-green-100 dark:bg-green-900/30',        activeText: 'text-green-700 dark:text-green-400',      activeBorder: 'border-green-300 dark:border-green-700' },
  REJECTED: { label: 'Rejected', activeBg: 'bg-red-100 dark:bg-red-900/30',            activeText: 'text-red-700 dark:text-red-400',          activeBorder: 'border-red-300 dark:border-red-700' },
}

// ─── Submitter avatar ────────────────────────────────────────────────────────

function SubmitterAvatar({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase()
  const palette = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500', 'bg-cyan-500']
  const color = palette[email.charCodeAt(0) % palette.length]
  return (
    <div className={`h-7 w-7 rounded-full ${color} flex items-center justify-center shrink-0`}>
      <span className="text-xs font-bold text-white">{initial}</span>
    </div>
  )
}

// ─── Single approval row ─────────────────────────────────────────────────────

function ApprovalRow({
  expense,
  checked,
  onCheckChange,
  onDone,
}: {
  expense: PendingApproval
  checked: boolean
  onCheckChange: (checked: boolean) => void
  onDone: () => void
}) {
  const [rejectPending, setRejectPending] = useState(false)
  const [revisionPending, setRevisionPending] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<'approve' | 'reject' | 'revision' | null>(null)

  const isSubmit = expense.status === 'SUBMIT'
  const isLocked = rejectPending || revisionPending || done !== null

  async function handle(action: 'approve' | 'reject' | 'revision') {
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    setError('')
    try {
      if (action === 'approve') await api.expense.approve(token, expense.id)
      else if (action === 'reject') await api.expense.reject(token, expense.id, note || undefined)
      else await api.expense.revision(token, expense.id, note)
      setDone(action)
      setTimeout(onDone, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // After action — show inline confirmation strip
  if (done) {
    const cfg = {
      approve:  { cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400', icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Approved' },
      reject:   { cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',         icon: <XCircle className="h-3.5 w-3.5" />,    label: 'Rejected' },
      revision: { cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', icon: <RotateCcw className="h-3.5 w-3.5" />,  label: 'Sent for Revision' },
    }[done]
    return (
      <div className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${cfg.cls}`}>
        {cfg.icon} {cfg.label}
      </div>
    )
  }

  return (
    <div className={`transition-colors ${checked && isSubmit ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox — only for SUBMIT items */}
        {isSubmit ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckChange(e.target.checked)}
            disabled={isLocked}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
          />
        ) : (
          <div className="h-4 w-4 shrink-0" />
        )}

        <SubmitterAvatar email={expense.submittedBy} />

        <div className="flex-1 min-w-0">
          <Link
            href={`/expenses/${expense.id}?from=approve-requests`}
            className="group inline-flex items-center gap-1 font-medium text-sm text-foreground hover:text-primary transition-colors"
          >
            <span className="truncate">{expense.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <span className="text-xs text-muted-foreground truncate max-w-40" title={expense.submittedBy}>{expense.requestedBy ?? expense.submittedBy}</span>
            <span className="text-muted-foreground/40 text-xs select-none">·</span>
            <span className="text-xs text-muted-foreground">
              {new Date(expense.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
            {expense.category && (
              <>
                <span className="text-muted-foreground/40 text-xs select-none">·</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                  <Tag className="h-2.5 w-2.5" />{expense.category.name}
                </span>
              </>
            )}
            {expense.unit && (
              <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {expense.unit}
              </span>
            )}
          </div>
        </div>

        {/* Right side: validation + status + amount */}
        <div className="shrink-0 flex items-center">
          <div className="hidden sm:block w-28 shrink-0"><OcrBadge status={expense.ocrFlag ?? null} /></div>
          <div className="w-28 shrink-0"><StatusBadge status={expense.status} /></div>
          <span className="w-32 shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
            {expense.amount.toLocaleString('id-ID', {
              style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </div>

      {/* Finance flag */}
      {expense.approvalNote && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-3 py-2">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">Finance flagged</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{expense.approvalNote}</p>
          </div>
        </div>
      )}

      {/* Action area — SUBMIT only */}
      {isSubmit && (
        <div className="px-4 pb-3 space-y-2">
          {error && (
            <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs text-destructive">
              {error}
            </p>
          )}

          {!rejectPending && !revisionPending ? (
            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => handle('approve')}
                disabled={submitting}
                size="sm"
                className="flex-2 bg-green-600 hover:bg-green-700 text-white border-0 dark:bg-green-700 dark:hover:bg-green-600"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {submitting ? 'Approving…' : 'Approve'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRevisionPending(true)}
                disabled={submitting}
                size="sm"
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Revision
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectPending(true)}
                disabled={submitting}
                size="sm"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          ) : rejectPending ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for rejection (optional)"
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handle('reject')}
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  {submitting ? 'Rejecting…' : 'Confirm Reject'}
                </Button>
                <Button variant="outline" onClick={() => { setRejectPending(false); setNote('') }} disabled={submitting} size="sm" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what needs to be changed (required)"
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handle('revision')}
                  disabled={submitting || !note.trim()}
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {submitting ? 'Sending…' : 'Send for Revision'}
                </Button>
                <Button variant="outline" onClick={() => { setRevisionPending(false); setNote('') }} disabled={submitting} size="sm" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ApproveRequestsPage() {
  const [data, setData] = useState<PendingApproval[]>([])
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<ApprovalFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setSelectedIds(new Set())
    setBulkError('')
    api.expense.getAllApprovals(token, { page, pageSize, search: debouncedSearch, status: filter })
      .then((res) => { setData(res.data); setTotal(res.total); setStatusCounts(res.statusCounts) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, pageSize, filter, debouncedSearch, refreshKey])

  const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  // Selectable = SUBMIT items on the current page
  const selectableIds = data.filter((e) => e.status === 'SUBMIT').map((e) => e.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        selectableIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => new Set([...prev, ...selectableIds]))
    }
  }

  async function bulkApprove() {
    const token = getToken()
    if (!token || selectedIds.size === 0) return
    setBulkApproving(true)
    setBulkError('')
    const ids = [...selectedIds]
    const results = await Promise.allSettled(ids.map((id) => api.expense.approve(token, id)))
    const failed = ids.filter((_, i) => results[i].status === 'rejected')
    setBulkApproving(false)
    if (failed.length > 0) setBulkError(`${failed.length} expense(s) could not be approved.`)
    setRefreshKey((k) => k + 1)
  }

  function handleDone() {
    setRefreshKey((k) => k + 1)
  }

  const selectedTotal = data
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approve Requests</h1>
        <p className="text-sm text-muted-foreground">Review and act on expense requests from your team</p>
      </div>

      {/* Filter stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {APPROVAL_FILTERS.map((f) => {
          const cfg = FILTER_CONFIG[f]
          const count = f === 'ALL' ? allCount : statusCounts[f] ?? 0
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
              className={`rounded-xl border p-3 text-left transition-all ${
                active
                  ? `${cfg.activeBg} ${cfg.activeBorder} ring-1 ring-inset ${cfg.activeBorder}`
                  : 'border-border bg-card hover:bg-accent/40'
              }`}
            >
              <p className={`text-2xl font-bold leading-none ${active ? cfg.activeText : 'text-foreground'}`}>
                {loading ? '–' : count}
              </p>
              <p className={`text-xs font-medium mt-1.5 ${active ? cfg.activeText : 'text-muted-foreground'}`}>
                {cfg.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedIds.size} selected</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {selectedTotal.toLocaleString('id-ID', {
                style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
              })}
            </p>
          </div>
          {bulkError && <p className="text-xs text-destructive">{bulkError}</p>}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} disabled={bulkApproving}>
              Deselect All
            </Button>
            <Button
              size="sm"
              onClick={bulkApprove}
              disabled={bulkApproving}
              className="bg-green-600 hover:bg-green-700 text-white border-0 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {bulkApproving ? 'Approving…' : `Approve ${selectedIds.size}`}
            </Button>
          </div>
        </div>
      )}

      {/* List card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">
                {filter === 'ALL'
                  ? `All Approvals (${allCount})`
                  : `${FILTER_CONFIG[filter].label} (${total})`}
              </CardTitle>
              <div className="relative w-56 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Title, number, or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>
            {/* Select-all — only shown when there are pending items in view */}
            {!loading && selectableIds.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                {allSelected ? 'Deselect pending' : `Select pending (${selectableIds.length})`}
              </label>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-px px-4 pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse mb-2" />
              ))}
            </div>
          ) : error ? (
            <p className="px-4 pb-4 text-sm text-destructive">{error}</p>
          ) : data.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ClipboardCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-foreground">
                {debouncedSearch ? 'No results found' : filter === 'SUBMIT' ? 'All caught up!' : `No ${FILTER_CONFIG[filter].label.toLowerCase()} items`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {debouncedSearch ? 'Try a different keyword.' : filter === 'SUBMIT' ? 'No pending approvals at this time.' : 'Switch filters to see other items.'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="w-4 shrink-0" />
                <div className="w-7 shrink-0" />
                <span className="flex-1 min-w-0">Requestor &amp; Expense</span>
                <div className="shrink-0 flex items-center">
                  <span className="hidden sm:block w-28 shrink-0">OCR Validation</span>
                  <span className="w-28 shrink-0">Status</span>
                  <span className="w-32 shrink-0 text-right">Amount</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {data.map((expense) => (
                  <ApprovalRow
                    key={expense.id}
                    expense={expense}
                    checked={selectedIds.has(expense.id)}
                    onCheckChange={(c) => toggleSelect(expense.id, c)}
                    onDone={handleDone}
                  />
                ))}
              </div>
              <div className="px-4 pb-4">
                <Pagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
