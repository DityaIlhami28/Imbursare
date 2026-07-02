'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type Category } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Paperclip, X, ArrowLeft, ScanLine, Sparkles } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-shadow disabled:opacity-50'
const labelCls = 'text-sm font-medium text-foreground'

export default function NewExpensePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({ title: '', description: '', amount: '', category: '' })
  const [amountFocused, setAmountFocused] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [catLoading, setCatLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.category.getAll(token)
      .then(setCategories)
      .catch(() => {})
      .finally(() => setCatLoading(false))
  }, [])

  async function scanImages(imageFiles: File[]) {
    const token = getToken()
    if (!token || imageFiles.length === 0) return
    setScanning(true)
    setScanSuccess(false)
    try {
      const results = await Promise.all(imageFiles.map((f) => api.expense.scanReceipt(token, f)))
      const totalAmount = results.reduce((sum, r) => sum + (r.amount ?? 0), 0)
      const firstTitle = results.find((r) => r.title)?.title ?? null
      setForm((prev) => ({
        ...prev,
        title: firstTitle ?? prev.title,
        amount: totalAmount > 0 ? String(totalAmount) : prev.amount,
      }))
      setScanSuccess(true)
    } catch {
      // silently fail — user can fill fields manually
    } finally {
      setScanning(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const combined = [...files, ...selected].slice(0, 5)
    setFiles(combined)
    const newPreviews: Record<string, string> = {}
    selected.forEach((f) => {
      if (f.type.startsWith('image/')) newPreviews[f.name + f.size] = URL.createObjectURL(f)
    })
    setPreviews((prev) => ({ ...prev, ...newPreviews }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    const scannable = combined.filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf')
    if (scannable.length > 0) scanImages(scannable)
  }

  function removeFile(idx: number) {
    const file = files[idx]
    const key = file.name + file.size
    if (previews[key]) {
      URL.revokeObjectURL(previews[key])
      setPreviews((prev) => { const next = { ...prev }; delete next[key]; return next })
    }
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function formatSize(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (!form.category) {
      setError('Please select a category')
      return
    }

    setLoading(true)
    try {
      const token = getToken()!
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('amount', String(amount))
      fd.append('category', form.category)
      files.forEach((file) => fd.append('files', file))

      const result = await api.expense.create(token, fd)
      router.push(`/expenses/${result.expenseId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/expenses"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit New Expense</CardTitle>
          <CardDescription>
            Fill in the details below. Your request will be reviewed based on your position&apos;s spending policy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Attachments first — receipt upload triggers auto-scan */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Attachments *</label>
                <span className="text-xs text-muted-foreground">Up to 5 · Images, PDF, DOCX · Max 4 MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />

              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                  {files.length === 0 ? 'Attach receipt or document' : `Add more (${files.length}/5)`}
                </button>
              )}

              {files.length > 0 && (
                <ul className="space-y-1.5">
                  {files.map((file, i) => {
                    const previewUrl = previews[file.name + file.size]
                    const isScannable = file.type.startsWith('image/') || file.type === 'application/pdf'
                    return (
                      <li key={i} className="flex items-center gap-3 rounded-lg border border-border p-2">
                        {previewUrl ? (
                          <img src={previewUrl} alt={file.name} className="h-12 w-12 rounded-md object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="h-12 w-12 rounded-md border border-border bg-muted flex items-center justify-center shrink-0">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                        </div>
                        {scanning && isScannable && (
                          <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                            <ScanLine className="h-3.5 w-3.5 animate-pulse" /> Reading…
                          </span>
                        )}
                        {!scanning && scanSuccess && isScannable && (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
                            <Sparkles className="h-3 w-3" /> Filled
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {scanSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Receipt scanned — review the fields below before submitting.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className={labelCls}>Title *</label>
              <input
                id="title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Client meeting lunch"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className={labelCls}>Description</label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Additional details about this expense…"
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="amount" className={labelCls}>Amount (IDR) *</label>
                <input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  required
                  value={amountFocused ? form.amount : (Number(form.amount) > 0 ? Number(form.amount).toLocaleString('id-ID') : '')}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })}
                  placeholder={amountFocused ? '150000' : 'e.g. 150.000'}
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="category" className={labelCls}>Category *</label>
                <select
                  id="category"
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                  disabled={catLoading}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && !catLoading && (
                  <p className="text-xs text-muted-foreground">No categories yet. Ask your admin to create some.</p>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading || files.length === 0} className="flex-1">
                {loading ? 'Creating…' : 'Create Draft'}
              </Button>
              <Button type="button" variant="outline" render={<Link href="/expenses" />}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
