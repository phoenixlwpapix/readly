'use client'

import { useState } from 'react'
import { Rss, X, Loader2 } from 'lucide-react'
import { id } from '@instantdb/react'
import { fetchFeed } from '@/app/actions'
import { useFolders, feedActions, folderActions, getExistingFeedUrls } from '@/lib/feed-store'

interface AddFeedDialogProps {
  open: boolean
  onClose: () => void
}

export function AddFeedDialog({ open, onClose }: AddFeedDialogProps) {
  const { folders } = useFolders()
  const [url, setUrl] = useState('')
  const [folderOption, setFolderOption] = useState('none')
  const [newFolderName, setNewFolderName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleClose = () => {
    setUrl('')
    setFolderOption('none')
    setNewFolderName('')
    setError('')
    setLoading(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedUrl = url.trim()
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setError('URL must start with http:// or https://')
      return
    }

    setLoading(true)
    try {
      const existingUrls = await getExistingFeedUrls()
      if (existingUrls.has(trimmedUrl)) {
        setError('This feed has already been added')
        setLoading(false)
        return
      }

      const feed = await fetchFeed(trimmedUrl)

      let folderId: string | null = null
      if (folderOption === 'new' && newFolderName.trim()) {
        const newId = id()
        await folderActions.addFolder({ id: newId, name: newFolderName.trim(), isExpanded: true })
        folderId = newId
      } else if (folderOption !== 'none') {
        folderId = folderOption
      }

      await feedActions.addFeed({ ...feed, folderId })
      handleClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch feed. Please check the URL.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Rss size={16} color="white" />
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Add RSS Feed
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 transition-all duration-200"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL input */}
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Feed URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Folder select */}
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Folder (optional)
            </label>
            <select
              value={folderOption}
              onChange={(e) => setFolderOption(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              disabled={loading}
            >
              <option value="none">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
              <option value="new">New folder...</option>
            </select>
          </div>

          {/* New folder name */}
          {folderOption === 'new' && (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                autoFocus
                disabled={loading}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                color: 'var(--color-danger)',
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
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
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              onMouseEnter={(e) => {
                if (!loading && url.trim()) {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-accent-hover)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)'
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Adding...' : 'Add Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
