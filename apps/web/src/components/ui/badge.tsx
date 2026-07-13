import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { type ExpenseStatus, type OcrStatus } from '@/lib/api'

const statusConfig: Record<ExpenseStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  SUBMIT: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  REIMBURSED: { label: 'Reimbursed', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  REVISION: { label: 'Needs Revision', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as ExpenseStatus] ?? { label: status, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

const ocrConfig: Record<OcrStatus, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  VALID: { label: 'Valid', className: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30', Icon: ShieldCheck },
  INVALID: { label: 'Not valid', className: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30', Icon: ShieldAlert },
  UNVERIFIED: { label: 'Unverified', className: 'text-muted-foreground bg-muted', Icon: ShieldQuestion },
}

export function OcrBadge({ status }: { status: OcrStatus | null }) {
  if (!status) return null
  const { label, className, Icon } = ocrConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const classes: Record<string, string> = {
    ADMIN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    FINANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    EMPLOYEE: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[role] ?? 'bg-muted text-muted-foreground'}`}>
      {role}
    </span>
  )
}
