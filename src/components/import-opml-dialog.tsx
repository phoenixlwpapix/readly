'use client'

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FileUp, Upload, X, Loader2, AlertCircle } from 'lucide-react'
import { id } from '@instantdb/react'
import { fetchFeed, parseOPMLAction } from '@/app/actions'
import { useFolders, feedActions, folderActions, getExistingFeedUrls } from '@/lib/feed-store'
import type { OPMLOutline } from '@/lib/types'

interface ImportOPMLDialogProps {
  open: boolean
  onClose: () => void
}

export function ImportOPMLDialog({ open, onClose }: ImportOPMLDialogProps) {
  const { folders } = useFolders()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [outlines, setOutlines] = useState<OPMLOutline[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)

  const handleClose = () => {
    setOutlines([])
    setSelectedIndices(new Set())
    setError('')
    setParsing(false)
    setImporting(false)
    setImportProgress({ current: 0, total: 0 })
    setDragOver(false)
    onClose()
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.opml') && !file.name.endsWith('.xml')) {
      setError('Please select an .opml or .xml file')
      return
    }

    setError('')
    setParsing(true)
    try {
      const content = await file.text()
      const parsed = await parseOPMLAction(content)
      if (parsed.length === 0) {
        setError('No feeds found in the OPML file')
      } else {
        setOutlines(parsed)
        // Select all by default
        setSelectedIndices(new Set(parsed.map((_, i) => i)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse OPML file')
    } finally {
      setParsing(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    []
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleToggleAll = () => {
    if (selectedIndices.size === outlines.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(outlines.map((_, i) => i)))
    }
  }

  const handleToggle = (index: number) => {
    const next = new Set(selectedIndices)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelectedIndices(next)
  }

  const handleImport = async () => {
    const toImport = outlines.filter((_, i) => selectedIndices.has(i))
    if (toImport.length === 0) return

    setImporting(true)

    const existingUrls = await getExistingFeedUrls()
    const newOutlines = toImport.filter((o) => !existingUrls.has(o.xmlUrl))

    if (newOutlines.length === 0) {
      handleClose()
      return
    }

    setImportProgress({ current: 0, total: newOutlines.length })

    const folderMap = new Map<string, string>()

    for (const folder of folders) {
      folderMap.set(folder.name.toLowerCase(), folder.id)
    }

    for (let i = 0; i < newOutlines.length; i++) {
      const outline = newOutlines[i]
      setImportProgress({ current: i + 1, total: newOutlines.length })

      try {
        const feed = await fetchFeed(outline.xmlUrl)

        let folderId: string | null = null
        if (outline.folder) {
          const existingId = folderMap.get(outline.folder.toLowerCase())
          if (existingId) {
            folderId = existingId
          } else {
            const newId = id()
            await folderActions.addFolder({ id: newId, name: outline.folder, isExpanded: true })
            folderMap.set(outline.folder.toLowerCase(), newId)
            folderId = newId
          }
        }

        await feedActions.addFeed({ ...feed, folderId })
      } catch (err) {
        console.error(`[Import] Failed to import "${outline.title || outline.xmlUrl}":`, err)
      }
    }

    handleClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 shadow-2xl"
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
              <FileUp size={16} color="white" />
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Import OPML
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

        {/* Content */}
        {outlines.length === 0 && !importing ? (
          <>
            {/* Drop zone */}
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-200"
              style={{
                borderColor: dragOver
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
                backgroundColor: dragOver
                  ? 'var(--color-accent-light)'
                  : 'var(--color-bg-secondary)',
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? (
                <Loader2
                  size={32}
                  className="animate-spin"
                  style={{ color: 'var(--color-accent)' }}
                />
              ) : (
                <Upload
                  size={32}
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
              )}
              <p
                className="mt-3 text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {parsing ? 'Parsing file...' : 'Drop your OPML file here'}
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Accepts .opml and .xml files
              </p>
              {!parsing && (
                <button
                  type="button"
                  className="mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--color-bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--color-bg-tertiary)'
                  }}
                >
                  Browse files
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".opml,.xml"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                  color: 'var(--color-danger)',
                }}
              >
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}
          </>
        ) : importing ? (
          /* Import progress */
          <div className="flex flex-col items-center py-8">
            <Loader2
              size={32}
              className="animate-spin"
              style={{ color: 'var(--color-accent)' }}
            />
            <p
              className="mt-4 text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Importing {importProgress.current} of {importProgress.total}...
            </p>
            <div
              className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          /* Preview table */
          <>
            <p
              className="mb-3 text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Found {outlines.length} feed{outlines.length !== 1 ? 's' : ''} · {selectedIndices.size} selected
            </p>
            <div
              className="max-h-64 overflow-y-auto rounded-lg border"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIndices.size === outlines.length}
                        onChange={handleToggleAll}
                        className="h-4 w-4 cursor-pointer rounded"
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                    </th>
                    <th
                      className="px-3 py-2 font-medium"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Title
                    </th>
                    <th
                      className="px-3 py-2 font-medium"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Folder
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {outlines.map((outline, i) => (
                    <tr
                      key={i}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom:
                          i < outlines.length - 1
                            ? '1px solid var(--color-border)'
                            : 'none',
                        backgroundColor: selectedIndices.has(i) ? 'var(--color-accent-light)' : 'transparent',
                      }}
                      onClick={() => handleToggle(i)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(i)}
                          onChange={() => handleToggle(i)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 cursor-pointer rounded"
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                      </td>
                      <td
                        className="max-w-[200px] truncate px-3 py-2"
                        style={{ color: 'var(--color-text-primary)' }}
                        title={outline.xmlUrl}
                      >
                        {outline.title || outline.xmlUrl}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {outline.folder || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={selectedIndices.size === 0}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
                onMouseEnter={(e) => {
                  if (selectedIndices.size > 0) {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent)'
                }}
              >
                Import {selectedIndices.size} Feed{selectedIndices.size !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
