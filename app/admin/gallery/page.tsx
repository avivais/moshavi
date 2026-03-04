'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAdminAuth } from '../hooks/useAdminAuth'
import type { GalleryMedia } from '../types'
import { formatFileSize } from '../../../lib/format'

type SortOption = 'manual' | 'created_at_desc' | 'created_at_asc' | 'taken_at_desc' | 'taken_at_asc' | 'file_size_desc' | 'file_size_asc' | 'caption_asc' | 'caption_desc' | 'alt_asc' | 'alt_desc' | 'event_tag_asc' | 'event_tag_desc' | 'id_desc' | 'id_asc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'manual', label: 'Manual (gallery order)' },
    { value: 'created_at_desc', label: 'Upload date (newest)' },
    { value: 'created_at_asc', label: 'Upload date (oldest)' },
    { value: 'taken_at_desc', label: 'Taken at (newest)' },
    { value: 'taken_at_asc', label: 'Taken at (oldest)' },
    { value: 'file_size_desc', label: 'File size (largest)' },
    { value: 'file_size_asc', label: 'File size (smallest)' },
    { value: 'caption_asc', label: 'Caption A-Z' },
    { value: 'caption_desc', label: 'Caption Z-A' },
    { value: 'alt_asc', label: 'Alt A-Z' },
    { value: 'alt_desc', label: 'Alt Z-A' },
    { value: 'event_tag_asc', label: 'Event tag A-Z' },
    { value: 'event_tag_desc', label: 'Event tag Z-A' },
    { value: 'id_desc', label: 'ID (newest)' },
    { value: 'id_asc', label: 'ID (oldest)' },
]

function sortItems(items: GalleryMedia[], sort: SortOption): GalleryMedia[] {
    const sorted = [...items]
    switch (sort) {
        case 'manual': return sorted.sort((a, b) => a.gallery_order - b.gallery_order || a.id - b.id)
        case 'created_at_desc': return sorted.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        case 'created_at_asc': return sorted.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
        case 'taken_at_desc': return sorted.sort((a, b) => { if (!a.taken_at && !b.taken_at) return 0; if (!a.taken_at) return 1; if (!b.taken_at) return -1; return b.taken_at.localeCompare(a.taken_at) })
        case 'taken_at_asc': return sorted.sort((a, b) => { if (!a.taken_at && !b.taken_at) return 0; if (!a.taken_at) return 1; if (!b.taken_at) return -1; return a.taken_at.localeCompare(b.taken_at) })
        case 'file_size_desc': return sorted.sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
        case 'file_size_asc': return sorted.sort((a, b) => (a.file_size || 0) - (b.file_size || 0))
        case 'caption_asc': return sorted.sort((a, b) => a.caption.localeCompare(b.caption))
        case 'caption_desc': return sorted.sort((a, b) => b.caption.localeCompare(a.caption))
        case 'alt_asc': return sorted.sort((a, b) => a.alt.localeCompare(b.alt))
        case 'alt_desc': return sorted.sort((a, b) => b.alt.localeCompare(a.alt))
        case 'event_tag_asc': return sorted.sort((a, b) => (a.event_tag ?? '').localeCompare(b.event_tag ?? ''))
        case 'event_tag_desc': return sorted.sort((a, b) => (b.event_tag ?? '').localeCompare(a.event_tag ?? ''))
        case 'id_desc': return sorted.sort((a, b) => b.id - a.id)
        case 'id_asc': return sorted.sort((a, b) => a.id - b.id)
        default: return sorted
    }
}

function formatDate(iso?: string | null): string {
    if (!iso) return ''
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

function SortableCard({ item, isSelected, onToggleSelect, onEdit, onHide }: {
    item: GalleryMedia; isSelected: boolean; onToggleSelect: () => void; onEdit: () => void; onHide: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

    return (
        <div ref={setNodeRef} style={style} className={`border rounded overflow-hidden ${item.visible ? 'border-gray-600' : 'border-red-800 opacity-60'} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
            <div className="flex items-center gap-1 p-1 bg-gray-700" {...attributes} {...listeners}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} onClick={e => e.stopPropagation()} className="rounded" />
                <span className="text-xs truncate flex-1 cursor-grab">#{item.id} · {item.type === 'video' ? '🎬' : '📷'} · {formatFileSize(item.file_size || 0)}</span>
            </div>
            <div className="aspect-square bg-gray-900 relative">
                {(item.thumbnail_src || item.src) && <img src={item.thumbnail_src || item.src} alt={item.alt || ''} className="w-full h-full object-cover" />}
                {item.show_in_carousel ? <span className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1 rounded">Carousel</span> : null}
                {!item.visible && <span className="absolute top-1 left-1 bg-red-600 text-white text-xs px-1 rounded">Hidden</span>}
            </div>
            <div className="p-1 text-xs space-y-0.5">
                <div className="truncate" title={item.caption || item.date}>{item.caption || item.date || '—'}</div>
                {item.created_at && <div className="text-gray-500 truncate" title={item.created_at}>Up: {formatDate(item.created_at)}</div>}
                {item.taken_at && <div className="text-gray-500 truncate" title={item.taken_at}>At: {formatDate(item.taken_at)}</div>}
            </div>
            <div className="p-1 flex flex-wrap gap-1">
                <button type="button" onClick={onEdit} className="bg-yellow-600 px-2 py-0.5 rounded text-xs">Edit</button>
                <button type="button" onClick={onHide} className="bg-red-600 px-2 py-0.5 rounded text-xs">Hide</button>
            </div>
        </div>
    )
}

function PlainCard({ item, isSelected, onToggleSelect, onEdit, onHide }: {
    item: GalleryMedia; isSelected: boolean; onToggleSelect: () => void; onEdit: () => void; onHide: () => void
}) {
    return (
        <div className={`border rounded overflow-hidden ${item.visible ? 'border-gray-600' : 'border-red-800 opacity-60'} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
            <label className="flex items-center gap-1 p-1 bg-gray-700">
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="rounded" />
                <span className="text-xs truncate">#{item.id} · {item.type === 'video' ? '🎬' : '📷'} · {formatFileSize(item.file_size || 0)}</span>
            </label>
            <div className="aspect-square bg-gray-900 relative">
                {(item.thumbnail_src || item.src) && <img src={item.thumbnail_src || item.src} alt={item.alt || ''} className="w-full h-full object-cover" />}
                {item.show_in_carousel ? <span className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1 rounded">Carousel</span> : null}
                {!item.visible && <span className="absolute top-1 left-1 bg-red-600 text-white text-xs px-1 rounded">Hidden</span>}
            </div>
            <div className="p-1 text-xs space-y-0.5">
                <div className="truncate" title={item.caption || item.date}>{item.caption || item.date || '—'}</div>
                {item.created_at && <div className="text-gray-500 truncate" title={item.created_at}>Up: {formatDate(item.created_at)}</div>}
                {item.taken_at && <div className="text-gray-500 truncate" title={item.taken_at}>At: {formatDate(item.taken_at)}</div>}
            </div>
            <div className="p-1 flex flex-wrap gap-1">
                <button type="button" onClick={onEdit} className="bg-yellow-600 px-2 py-0.5 rounded text-xs">Edit</button>
                <button type="button" onClick={onHide} className="bg-red-600 px-2 py-0.5 rounded text-xs">Hide</button>
            </div>
        </div>
    )
}

export default function GalleryAdmin() {
    const { authToken, isAuthenticated, message, setMessage } = useAdminAuth()

    const [galleryList, setGalleryList] = useState<GalleryMedia[]>([])
    const [galleryUploadProgress, setGalleryUploadProgress] = useState<{ current: number; total: number } | null>(null)
    const [uploadSortMethod, setUploadSortMethod] = useState<string>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('upload_sort_method') || 'manual'
        return 'manual'
    })
    const [uploadEventTag, setUploadEventTag] = useState('')
    const [uploadCaption, setUploadCaption] = useState('')
    const [uploadAlt, setUploadAlt] = useState('')
    const [uploadDate, setUploadDate] = useState('')
    const [uploadTakenAt, setUploadTakenAt] = useState('')
    const [isDragOver, setIsDragOver] = useState(false)
    const [galleryEdit, setGalleryEdit] = useState<GalleryMedia | null>(null)
    const [galleryBulkSelected, setGalleryBulkSelected] = useState<Set<number>>(new Set())
    const [galleryBulkEventTag, setGalleryBulkEventTag] = useState('')
    const [confirmDelete, setConfirmDelete] = useState<{ ids: number[]; totalSize: number } | null>(null)
    const [storageData, setStorageData] = useState<{
        disk: { total: number; used: number; free: number; percent: number }
        gallery: { images: { bytes: number; count: number }; videos: { bytes: number; count: number }; thumbs: { bytes: number }; total: { bytes: number; count: number } }
    } | null>(null)
    const [sortOption, setSortOption] = useState<SortOption>(() => {
        if (typeof window !== 'undefined') return (localStorage.getItem('gallery_sort') as SortOption) || 'manual'
        return 'manual'
    })
    const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all')
    const [filterSize, setFilterSize] = useState<string>('all')
    const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all')
    const [filterCarousel, setFilterCarousel] = useState<'all' | 'in' | 'out'>('all')
    const [filterEventTag, setFilterEventTag] = useState<string>('all')
    const [filterTakenAt, setFilterTakenAt] = useState<'all' | 'has' | 'none'>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    const filteredList = useMemo(() => {
        let items = galleryList
        if (filterType !== 'all') items = items.filter(i => i.type === filterType)
        if (filterSize !== 'all') {
            const ranges: Record<string, [number, number]> = { '<500KB': [0, 500 * 1024], '500KB-1MB': [500 * 1024, 1024 * 1024], '1-5MB': [1024 * 1024, 5 * 1024 * 1024], '5-20MB': [5 * 1024 * 1024, 20 * 1024 * 1024], '>20MB': [20 * 1024 * 1024, Infinity] }
            const range = ranges[filterSize]
            if (range) items = items.filter(i => (i.file_size || 0) >= range[0] && (i.file_size || 0) < range[1])
        }
        if (filterVisibility === 'visible') items = items.filter(i => i.visible)
        else if (filterVisibility === 'hidden') items = items.filter(i => !i.visible)
        if (filterCarousel === 'in') items = items.filter(i => i.show_in_carousel)
        else if (filterCarousel === 'out') items = items.filter(i => !i.show_in_carousel)
        if (filterEventTag === 'has') items = items.filter(i => i.event_tag)
        else if (filterEventTag === 'none') items = items.filter(i => !i.event_tag)
        else if (filterEventTag !== 'all') items = items.filter(i => i.event_tag === filterEventTag)
        if (filterTakenAt === 'has') items = items.filter(i => i.taken_at)
        else if (filterTakenAt === 'none') items = items.filter(i => !i.taken_at)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            items = items.filter(i => i.caption.toLowerCase().includes(q) || i.alt.toLowerCase().includes(q) || (i.event_tag ?? '').toLowerCase().includes(q))
        }
        return items
    }, [galleryList, filterType, filterSize, filterVisibility, filterCarousel, filterEventTag, filterTakenAt, searchQuery])

    const sortedList = useMemo(() => sortItems(filteredList, sortOption), [filteredList, sortOption])

    const uniqueEventTags = useMemo(() => {
        const tags = new Set<string>()
        galleryList.forEach(i => { if (i.event_tag) tags.add(i.event_tag) })
        return Array.from(tags).sort()
    }, [galleryList])

    const activeFilterCount = [filterType !== 'all', filterSize !== 'all', filterVisibility !== 'all', filterCarousel !== 'all', filterEventTag !== 'all', filterTakenAt !== 'all', searchQuery.trim() !== ''].filter(Boolean).length

    const handleSortChange = (value: SortOption) => {
        setSortOption(value)
        localStorage.setItem('gallery_sort', value)
    }

    const refreshGallery = useCallback(() => {
        if (authToken) {
            fetch('/api/admin/gallery', { headers: { 'Authorization': authToken } })
                .then(res => res.ok ? res.json() : [])
                .then(setGalleryList)
        }
    }, [authToken])

    const refreshStorage = useCallback(() => {
        if (authToken) {
            fetch('/api/admin/gallery/storage', { headers: { 'Authorization': authToken } })
                .then(res => res.ok ? res.json() : null)
                .then(d => { if (d) setStorageData(d) })
                .catch(() => {})
        }
    }, [authToken])

    useEffect(() => {
        if (isAuthenticated && authToken) { refreshGallery(); refreshStorage() }
    }, [isAuthenticated, authToken, refreshGallery, refreshStorage])

    useEffect(() => {
        setGalleryBulkSelected(new Set())
    }, [filterType, filterSize, filterVisibility, filterCarousel, filterEventTag, filterTakenAt, searchQuery])

    const doUpload = async (files: FileList | File[]) => {
        if (!files.length || !authToken) return
        const total = files.length
        setGalleryUploadProgress({ current: 0, total })
        const formData = new FormData()
        for (let i = 0; i < files.length; i++) formData.append('file', files[i])
        if (uploadEventTag.trim()) formData.append('event_tag', uploadEventTag.trim())
        if (uploadCaption.trim()) formData.append('caption', uploadCaption.trim())
        if (uploadAlt.trim()) formData.append('alt', uploadAlt.trim())
        if (uploadDate.trim()) formData.append('date', uploadDate.trim())
        if (uploadTakenAt.trim()) formData.append('taken_at', uploadTakenAt.trim())
        formData.append('sort_method', uploadSortMethod)
        try {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', '/api/admin/gallery/upload')
            xhr.setRequestHeader('Authorization', authToken)
            xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable) {
                    const pct = Math.round((ev.loaded / ev.total) * 100)
                    setGalleryUploadProgress({ current: Math.min(Math.round((pct / 100) * total), total - 1), total })
                }
            }
            await new Promise<void>((resolve, reject) => {
                xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else { try { reject(new Error(JSON.parse(xhr.responseText || '{}').error || 'Upload failed')) } catch { reject(new Error('Upload failed')) } } }
                xhr.onerror = () => reject(new Error('Network error'))
                xhr.send(formData)
            })
            setGalleryUploadProgress({ current: total, total })
            setMessage('Upload successful')
            refreshGallery(); refreshStorage()
        } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setGalleryUploadProgress(null)
        }
    }

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files?.length) return
        await doUpload(files)
        e.target.value = ''
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const files = e.dataTransfer.files
        if (files.length > 0) await doUpload(files)
    }

    const handleGalleryUpdate = async (payload: Partial<GalleryMedia> & { id: number }) => {
        if (!authToken) return
        const res = await fetch('/api/admin/gallery', {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
            body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (json.success) { setMessage('Updated'); setGalleryEdit(null); refreshGallery() }
        else setMessage(json.error || 'Update failed')
    }

    const handleGallerySoftDelete = async (id: number) => {
        if (!authToken) return
        const res = await fetch(`/api/admin/gallery?id=${id}`, { method: 'DELETE', headers: { 'Authorization': authToken } })
        const json = await res.json()
        if (json.success) { setMessage('Hidden'); setGalleryEdit(null); refreshGallery() }
        else setMessage(json.error || 'Hide failed')
    }

    const requestHardDelete = (ids: number[]) => {
        const totalSize = galleryList.filter(i => ids.includes(i.id)).reduce((sum, i) => sum + (i.file_size || 0), 0)
        setConfirmDelete({ ids, totalSize })
    }

    const executeHardDelete = async () => {
        if (!authToken || !confirmDelete) return
        const { ids } = confirmDelete
        setConfirmDelete(null)
        if (ids.length === 1) {
            const res = await fetch(`/api/admin/gallery?id=${ids[0]}&hard=1`, { method: 'DELETE', headers: { 'Authorization': authToken } })
            const json = await res.json()
            if (json.success) { setMessage('Permanently deleted'); setGalleryEdit(null) } else setMessage(json.error || 'Delete failed')
        } else {
            const res = await fetch('/api/admin/gallery/bulk', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
                body: JSON.stringify({ action: 'delete', ids, hard: true }),
            })
            const json = await res.json()
            if (json.success) setMessage(`Permanently deleted ${ids.length} items`); else setMessage(json.error || 'Bulk delete failed')
        }
        setGalleryBulkSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
        refreshGallery(); refreshStorage()
    }

    const handleGalleryBulk = async (action: 'add_to_carousel' | 'remove_from_carousel' | 'set_event_tag' | 'hide' | 'show' | 'delete') => {
        if (!authToken || galleryBulkSelected.size === 0) return
        const ids = Array.from(galleryBulkSelected)
        const body: { action: string; ids: number[]; event_tag?: string | null; hard?: boolean } = { action, ids }
        if (action === 'set_event_tag') body.event_tag = galleryBulkEventTag || null
        if (action === 'delete') body.hard = false
        const res = await fetch('/api/admin/gallery/bulk', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
            body: JSON.stringify(body),
        })
        const json = await res.json()
        if (json.success) { setMessage('Bulk action done'); setGalleryBulkSelected(new Set()); refreshGallery() }
        else setMessage(json.error || 'Bulk action failed')
    }

    const toggleGalleryBulk = (id: number) => {
        setGalleryBulkSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = sortedList.findIndex(i => i.id === active.id)
        const newIndex = sortedList.findIndex(i => i.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return
        const reordered = [...sortedList]
        const [moved] = reordered.splice(oldIndex, 1)
        reordered.splice(newIndex, 0, moved)
        const updated = reordered.map((item, i) => ({ ...item, gallery_order: i }))
        setGalleryList(updated)
        if (authToken) {
            fetch('/api/admin/gallery/reorder', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
                body: JSON.stringify({ gallery_order: updated.map(i => i.id) }),
            }).catch(() => setMessage('Reorder failed'))
        }
    }

    // Selection stats
    const selectedItems = galleryList.filter(i => galleryBulkSelected.has(i.id))
    const selectedImages = selectedItems.filter(i => i.type === 'photo')
    const selectedVideos = selectedItems.filter(i => i.type === 'video')
    const selectedTotalSize = selectedItems.reduce((s, i) => s + (i.file_size || 0), 0)
    // Conditional bulk action checks
    const hasCarouselSelected = selectedItems.some(i => i.show_in_carousel)
    const hasVisibleSelected = selectedItems.some(i => i.visible)
    const hasHiddenSelected = selectedItems.some(i => !i.visible)

    const isSuccessMsg = (m: string) => ['Updated', 'Hidden', 'Permanently deleted', 'Bulk action done', 'Upload successful'].some(s => m.includes(s))

    if (isAuthenticated === null) return <div className="p-4 max-w-2xl mx-auto bg-gray-900 text-white rounded-lg">Authenticating...</div>
    if (!isAuthenticated) return <div className="p-4 max-w-2xl mx-auto bg-gray-900 text-white rounded-lg">{message}</div>

    const carouselItems = galleryList.filter(item => item.show_in_carousel).sort((a, b) => a.carousel_order - b.carousel_order)

    return (
        <div className="p-4 max-w-5xl mx-auto bg-gray-900 text-white rounded-lg">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Gallery Admin</h1>
                <a href="/admin" className="text-blue-400 hover:text-blue-300 text-sm">&larr; Back to Admin Hub</a>
            </div>
            {message && <p className={isSuccessMsg(message) ? 'text-green-500 mb-3' : 'text-red-500 mb-3'}>{message}</p>}

            {/* Upload */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-bold mb-3">Upload</h2>
                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600'}`}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <label className="inline-flex items-center justify-center min-h-[48px] min-w-[200px] px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer text-white font-medium touch-manipulation">
                        <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={handleGalleryUpload} disabled={!!galleryUploadProgress} />
                        {galleryUploadProgress ? `Uploading ${galleryUploadProgress.current} of ${galleryUploadProgress.total}…` : 'Choose files'}
                    </label>
                    <p className="mt-2 text-sm text-gray-400">or drag and drop files here</p>
                </div>
                {galleryUploadProgress && (
                    <div className="mt-2 w-full max-w-xs h-2 bg-gray-700 rounded overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(galleryUploadProgress.current / galleryUploadProgress.total) * 100}%` }} />
                    </div>
                )}
                <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400 whitespace-nowrap">Sort new uploads by:</label>
                        <select value={uploadSortMethod} onChange={e => { setUploadSortMethod(e.target.value); localStorage.setItem('upload_sort_method', e.target.value) }} className="p-1.5 bg-gray-700 border border-gray-600 rounded text-sm">
                            <option value="manual">Add to end</option>
                            <option value="taken_at_desc">Taken at (newest first)</option>
                        </select>
                    </div>
                    <details className="text-sm">
                        <summary className="cursor-pointer text-gray-400 hover:text-gray-300">Batch metadata (optional)</summary>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <div><label className="block text-xs text-gray-500">Event tag</label><input value={uploadEventTag} onChange={e => setUploadEventTag(e.target.value)} className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded text-sm" /></div>
                            <div><label className="block text-xs text-gray-500">Caption</label><input value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded text-sm" /></div>
                            <div><label className="block text-xs text-gray-500">Alt text</label><input value={uploadAlt} onChange={e => setUploadAlt(e.target.value)} className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded text-sm" /></div>
                            <div><label className="block text-xs text-gray-500">Date label</label><input value={uploadDate} onChange={e => setUploadDate(e.target.value)} className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded text-sm" /></div>
                            <div><label className="block text-xs text-gray-500">Taken at</label><input type="datetime-local" value={uploadTakenAt} onChange={e => setUploadTakenAt(e.target.value)} className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded text-sm" /></div>
                        </div>
                    </details>
                </div>
            </div>

            {/* Storage dashboard */}
            {storageData && (
                <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                    <h2 className="text-sm font-bold mb-2 text-gray-400">Storage</h2>
                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                        <span>Images: {formatFileSize(storageData.gallery.images.bytes)} ({storageData.gallery.images.count})</span>
                        <span>Videos: {formatFileSize(storageData.gallery.videos.bytes)} ({storageData.gallery.videos.count})</span>
                        <span>Thumbs: {formatFileSize(storageData.gallery.thumbs.bytes)}</span>
                        <span className="font-medium">Total: {formatFileSize(storageData.gallery.total.bytes)} ({storageData.gallery.total.count} files)</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                        Disk: {formatFileSize(storageData.disk.used)} used of {formatFileSize(storageData.disk.total)} ({storageData.disk.percent}% used, {formatFileSize(storageData.disk.free)} free)
                    </div>
                    <div className="w-full h-3 bg-gray-700 rounded overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${storageData.disk.percent > 85 ? 'bg-red-500' : storageData.disk.percent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${storageData.disk.percent}%` }} />
                    </div>
                </div>
            )}

            {/* Filter bar */}
            {galleryList.length > 0 && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-400 font-medium">Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}:</span>
                        <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)} className="p-1 bg-gray-700 border border-gray-600 rounded text-xs">
                            <option value="all">All types</option><option value="photo">Images</option><option value="video">Videos</option>
                        </select>
                        <select value={filterSize} onChange={e => setFilterSize(e.target.value)} className="p-1 bg-gray-700 border border-gray-600 rounded text-xs">
                            <option value="all">All sizes</option><option value="<500KB">&lt; 500 KB</option><option value="500KB-1MB">500 KB - 1 MB</option><option value="1-5MB">1 - 5 MB</option><option value="5-20MB">5 - 20 MB</option><option value=">20MB">&gt; 20 MB</option>
                        </select>
                        <select value={filterVisibility} onChange={e => setFilterVisibility(e.target.value as typeof filterVisibility)} className="p-1 bg-gray-700 border border-gray-600 rounded text-xs">
                            <option value="all">All visibility</option><option value="visible">Visible</option><option value="hidden">Hidden</option>
                        </select>
                        <select value={filterCarousel} onChange={e => setFilterCarousel(e.target.value as typeof filterCarousel)} className="p-1 bg-gray-700 border border-gray-600 rounded text-xs">
                            <option value="all">All carousel</option><option value="in">In carousel</option><option value="out">Not in carousel</option>
                        </select>
                        <select value={filterEventTag} onChange={e => setFilterEventTag(e.target.value)} className="p-1 bg-gray-700 border border-gray-600 rounded text-xs">
                            <option value="all">All tags</option><option value="has">Has tag</option><option value="none">No tag</option>
                            {uniqueEventTags.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={filterTakenAt} onChange={e => setFilterTakenAt(e.target.value as typeof filterTakenAt)} className="p-1 bg-gray-700 border border-gray-600 rounded text-xs">
                            <option value="all">All dates</option><option value="has">Has taken_at</option><option value="none">No taken_at</option>
                        </select>
                        {activeFilterCount > 0 && (
                            <button type="button" onClick={() => { setFilterType('all'); setFilterSize('all'); setFilterVisibility('all'); setFilterCarousel('all'); setFilterEventTag('all'); setFilterTakenAt('all'); setSearchQuery('') }} className="text-xs text-blue-400 hover:text-blue-300">Clear all</button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Search caption, alt, tag…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 p-1.5 bg-gray-700 border border-gray-600 rounded text-sm max-w-xs" />
                        <button type="button" onClick={() => { const ids = sortedList.map(i => i.id); setGalleryBulkSelected(new Set(ids)) }} className="bg-blue-600 px-3 py-1.5 rounded text-sm">Select all filtered ({sortedList.length})</button>
                    </div>
                </div>
            )}

            {/* Sort + Bulk actions toolbar */}
            {galleryList.length > 0 && (
                <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-400">Sort:</label>
                        <select value={sortOption} onChange={e => handleSortChange(e.target.value as SortOption)} className="p-1.5 bg-gray-700 border border-gray-600 rounded text-sm">
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <span className="text-sm text-gray-500">{sortedList.length}{filteredList.length !== galleryList.length ? ` of ${galleryList.length}` : ''} items</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-400">Bulk ({galleryBulkSelected.size}):</span>
                        <button type="button" onClick={() => handleGalleryBulk('add_to_carousel')} disabled={galleryBulkSelected.size === 0} className="bg-green-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Add to carousel</button>
                        <button type="button" onClick={() => handleGalleryBulk('remove_from_carousel')} disabled={galleryBulkSelected.size === 0 || !hasCarouselSelected} className="bg-gray-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Remove from carousel</button>
                        <input type="text" placeholder="Event tag" value={galleryBulkEventTag} onChange={e => setGalleryBulkEventTag(e.target.value)} className="p-1.5 bg-gray-700 border border-gray-600 rounded text-sm w-32" />
                        <button type="button" onClick={() => handleGalleryBulk('set_event_tag')} disabled={galleryBulkSelected.size === 0} className="bg-gray-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Set tag</button>
                        <button type="button" onClick={() => handleGalleryBulk('hide')} disabled={galleryBulkSelected.size === 0 || !hasVisibleSelected} className="bg-yellow-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Hide</button>
                        <button type="button" onClick={() => handleGalleryBulk('show')} disabled={galleryBulkSelected.size === 0 || !hasHiddenSelected} className="bg-green-700 px-3 py-1.5 rounded text-sm disabled:opacity-50">Show</button>
                        <button type="button" onClick={() => requestHardDelete(Array.from(galleryBulkSelected))} disabled={galleryBulkSelected.size === 0} className="bg-red-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Delete</button>
                    </div>
                </div>
            )}

            {/* Gallery grid */}
            {sortedList.length > 0 && (
                sortOption === 'manual' ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={sortedList.map(i => i.id)} strategy={rectSortingStrategy}>
                            <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
                                {sortedList.map(item => (
                                    <SortableCard key={item.id} item={item} isSelected={galleryBulkSelected.has(item.id)}
                                        onToggleSelect={() => toggleGalleryBulk(item.id)} onEdit={() => setGalleryEdit(item)} onHide={() => handleGallerySoftDelete(item.id)} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
                        {sortedList.map(item => (
                            <PlainCard key={item.id} item={item} isSelected={galleryBulkSelected.has(item.id)}
                                onToggleSelect={() => toggleGalleryBulk(item.id)} onEdit={() => setGalleryEdit(item)} onHide={() => handleGallerySoftDelete(item.id)} />
                        ))}
                    </div>
                )
            )}

            {/* Carousel preview */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Carousel (from gallery)</h2>
                <p className="text-gray-400 text-sm mb-2">Items with &quot;Show in carousel&quot; on. Edit via the grid above.</p>
                <div className="flex flex-wrap gap-2">
                    {carouselItems.map(item => (
                        <div key={item.id} className="w-24 border border-gray-600 rounded overflow-hidden">
                            {(item.thumbnail_src || item.src) && <img src={item.thumbnail_src || item.src} alt={item.alt || ''} className="w-full h-20 object-cover" />}
                            <div className="p-1 text-xs truncate">#{item.id}</div>
                            <button type="button" onClick={() => setGalleryEdit(item)} className="w-full bg-yellow-600 px-2 py-0.5 text-xs">Edit</button>
                        </div>
                    ))}
                    {carouselItems.length === 0 && <p className="text-gray-500">No carousel items. Add gallery media and turn on &quot;Show in carousel&quot;.</p>}
                </div>
            </div>

            {/* Edit modal */}
            {galleryEdit && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setGalleryEdit(null)}>
                    <div className="bg-gray-800 rounded-lg max-w-lg w-full p-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-3">Edit gallery item #{galleryEdit.id}</h3>
                        <div className="text-xs text-gray-400 mb-3 space-y-0.5">
                            <div>Type: {galleryEdit.type} · Size: {formatFileSize(galleryEdit.file_size || 0)}</div>
                            {galleryEdit.created_at && <div>Uploaded: {formatDate(galleryEdit.created_at)}</div>}
                            {galleryEdit.taken_at && <div>Taken at: {formatDate(galleryEdit.taken_at)}</div>}
                        </div>
                        <form
                            onSubmit={e => {
                                e.preventDefault()
                                const f = e.currentTarget
                                handleGalleryUpdate({
                                    id: galleryEdit.id,
                                    caption: (f.querySelector('[name="caption"]') as HTMLInputElement)?.value ?? '',
                                    alt: (f.querySelector('[name="alt"]') as HTMLInputElement)?.value ?? '',
                                    date: (f.querySelector('[name="date"]') as HTMLInputElement)?.value ?? '',
                                    event_tag: (f.querySelector('[name="event_tag"]') as HTMLInputElement)?.value || null,
                                    taken_at: (f.querySelector('[name="taken_at"]') as HTMLInputElement)?.value || null,
                                    show_in_carousel: (f.querySelector('[name="show_in_carousel"]') as HTMLInputElement)?.checked ? 1 : 0,
                                    carousel_order: parseInt((f.querySelector('[name="carousel_order"]') as HTMLInputElement)?.value || '0', 10),
                                    gallery_order: parseInt((f.querySelector('[name="gallery_order"]') as HTMLInputElement)?.value || '0', 10),
                                })
                            }}
                            className="space-y-2"
                        >
                            <div><label className="block text-sm">Caption</label><input name="caption" defaultValue={galleryEdit.caption} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Alt</label><input name="alt" defaultValue={galleryEdit.alt} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Date (display label)</label><input name="date" defaultValue={galleryEdit.date} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Taken at</label><input name="taken_at" type="datetime-local" defaultValue={galleryEdit.taken_at?.slice(0, 16) ?? ''} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Event tag</label><input name="event_tag" defaultValue={galleryEdit.event_tag ?? ''} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <label className="flex items-center gap-2"><input name="show_in_carousel" type="checkbox" defaultChecked={!!galleryEdit.show_in_carousel} className="rounded" /><span>Show in carousel</span></label>
                            <div><label className="block text-sm">Carousel order</label><input name="carousel_order" type="number" defaultValue={galleryEdit.carousel_order} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Gallery order</label><input name="gallery_order" type="number" defaultValue={galleryEdit.gallery_order} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="bg-blue-600 px-4 py-2 rounded">Save</button>
                                <button type="button" onClick={() => setGalleryEdit(null)} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
                                <button type="button" onClick={() => { setGalleryEdit(null); requestHardDelete([galleryEdit.id]) }} className="bg-red-600 px-4 py-2 rounded">Delete permanently</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Hard delete confirmation */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-3 text-red-400">Permanently delete {confirmDelete.ids.length} item{confirmDelete.ids.length > 1 ? 's' : ''}?</h3>
                        <p className="text-gray-300 mb-4">This will free {formatFileSize(confirmDelete.totalSize)}. This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setConfirmDelete(null)} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
                            <button type="button" onClick={executeHardDelete} className="bg-red-600 px-4 py-2 rounded font-medium">Delete permanently</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified sticky bulk bar */}
            {galleryBulkSelected.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 px-4 py-3 z-40">
                    <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm">
                            <span className="font-medium">Selected: </span>
                            {selectedImages.length > 0 && <span>{selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} ({formatFileSize(selectedImages.reduce((s, i) => s + (i.file_size || 0), 0))})</span>}
                            {selectedImages.length > 0 && selectedVideos.length > 0 && <span>, </span>}
                            {selectedVideos.length > 0 && <span>{selectedVideos.length} video{selectedVideos.length > 1 ? 's' : ''} ({formatFileSize(selectedVideos.reduce((s, i) => s + (i.file_size || 0), 0))})</span>}
                            <span className="text-gray-400"> — Total: {selectedItems.length} ({formatFileSize(selectedTotalSize)})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleGalleryBulk('add_to_carousel')} className="bg-green-600 px-3 py-1.5 rounded text-sm">+ Carousel</button>
                            <button type="button" onClick={() => handleGalleryBulk('remove_from_carousel')} disabled={!hasCarouselSelected} className="bg-gray-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">- Carousel</button>
                            <button type="button" onClick={() => handleGalleryBulk('hide')} disabled={!hasVisibleSelected} className="bg-yellow-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Hide</button>
                            <button type="button" onClick={() => handleGalleryBulk('show')} disabled={!hasHiddenSelected} className="bg-green-700 px-3 py-1.5 rounded text-sm disabled:opacity-50">Show</button>
                            <button type="button" onClick={() => requestHardDelete(Array.from(galleryBulkSelected))} className="bg-red-600 px-3 py-1.5 rounded text-sm">Delete</button>
                            <button type="button" onClick={() => setGalleryBulkSelected(new Set())} className="bg-gray-700 px-3 py-1.5 rounded text-sm">Clear</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
