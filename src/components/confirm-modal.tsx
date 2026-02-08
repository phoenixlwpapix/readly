'use client'

import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {title}
            </h3>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1 transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--color-danger)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
