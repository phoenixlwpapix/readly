'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileUp, Upload, X, Loader2, AlertCircle, Check } from 'lucide-react'
import { id } from '@instantdb/react'
import { fetchFeed, parseOPMLAction } from '@/app/actions'
import { useFolders, useFeeds, feedActions, folderActions } from '@/lib/feed-store'
import type { OPMLOutline } from '@/lib/types'

interface ImportOPMLDialogProps {
  open: boolean
  onClose: () => void
}

export function ImportOPMLDialog({ open, onClose }: ImportOPMLDialogProps) {
  const { folders } = useFolders()
  const { feeds } = useFeeds()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [outlines, setOutlines] = useState<OPMLOutline[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [existingUrls, setExistingUrls] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)

  // Update existing URLs when feeds change
  useEffect(() => {
    setExistingUrls(new Set(feeds.map((f) => f.url)))
  }, [feeds])

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

  // Count of new (non-existing) feeds among selected
  const newSelectedCount = Array.from(selectedIndices).filter(
    (i) => !existingUrls.has(outlines[i]?.xmlUrl)
  ).length

  // Count of existing feeds in the parsed outlines
  const existingCount = outlines.filter((o) => existingUrls.has(o.xmlUrl)).length

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
        // Select only non-existing feeds by default
        const nonExisting = parsed
          .map((o, i) => ({ o, i }))
          .filter(({ o }) => !existingUrls.has(o.xmlUrl))
          .map(({ i }) => i)
        setSelectedIndices(new Set(nonExisting))
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
    // Only toggle non-existing feeds
    const nonExistingIndices = outlines
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !existingUrls.has(o.xmlUrl))
      .map(({ i }) => i)
    const allNonExistingSelected = nonExistingIndices.every((i) => selectedIndices.has(i))
    if (allNonExistingSelected) {
      // Deselect all non-existing
      const next = new Set(selectedIndices)
      nonExistingIndices.forEach((i) => next.delete(i))
      setSelectedIndices(next)
    } else {
      // Select all non-existing
      setSelectedIndices(new Set([...selectedIndices, ...nonExistingIndices]))
    }
  }

  const handleToggle = (index: number) => {
    // Don't allow selecting existing feeds
    if (existingUrls.has(outlines[index]?.xmlUrl)) return
    const next = new Set(selectedIndices)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelectedIndices(next)
  }

  const handleImport = async () => {
    // Only import non-existing selected feeds
    const toImport = outlines.filter(
      (o, i) => selectedIndices.has(i) && !existingUrls.has(o.xmlUrl)
    )
    if (toImport.length === 0) {
      handleClose()
      return
    }

    setImporting(true)

    setImportProgress({ current: 0, total: toImport.length })

    const folderMap = new Map<string, string>()

    for (const folder of folders) {
      folderMap.set(folder.name.toLowerCase(), folder.id)
    }

    for (let i = 0; i < toImport.length; i++) {
      const outline = toImport[i]
      setImportProgress({ current: i + 1, total: toImport.length })

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
              Found {outlines.length} feed{outlines.length !== 1 ? 's' : ''}
              {existingCount > 0 && (
                <span style={{ color: 'var(--color-text-tertiary)' }}>
                  {' '}· {existingCount} already subscribed
                </span>
              )}
              {' '}· {newSelectedCount} new selected
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
                        checked={
                          outlines.filter((o) => !existingUrls.has(o.xmlUrl)).length > 0 &&
                          outlines.every((o, i) => existingUrls.has(o.xmlUrl) || selectedIndices.has(i))
                        }
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
                    <th
                      className="w-24 px-3 py-2 text-right font-medium"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {outlines.map((outline, i) => {
                    const isExisting = existingUrls.has(outline.xmlUrl)
                    return (
                      <tr
                        key={i}
                        className={`transition-colors ${isExisting ? 'cursor-default' : 'cursor-pointer'}`}
                        style={{
                          borderBottom:
                            i < outlines.length - 1
                              ? '1px solid var(--color-border)'
                              : 'none',
                          backgroundColor: isExisting
                            ? 'var(--color-bg-secondary)'
                            : selectedIndices.has(i)
                              ? 'var(--color-accent-light)'
                              : 'transparent',
                          opacity: isExisting ? 0.7 : 1,
                        }}
                        onClick={() => handleToggle(i)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIndices.has(i)}
                            onChange={() => handleToggle(i)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isExisting}
                            className="h-4 w-4 rounded disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ accentColor: 'var(--color-accent)', cursor: isExisting ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td
                          className="max-w-[180px] truncate px-3 py-2"
                          style={{ color: isExisting ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}
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
                        <td className="px-3 py-2 text-right">
                          {isExisting ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                                color: 'var(--color-success)',
                              }}
                            >
                              <Check size={12} />
                              Subscribed
                            </span>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              New
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
                disabled={newSelectedCount === 0}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
                onMouseEnter={(e) => {
                  if (newSelectedCount > 0) {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent)'
                }}
              >
                Import {newSelectedCount} Feed{newSelectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
