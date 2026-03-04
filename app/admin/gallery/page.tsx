'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '../hooks/useAdminAuth'
import type { GalleryMedia } from '../types'

export default function GalleryAdmin() {
    const { authToken, isAuthenticated, message, setMessage } = useAdminAuth()

    const [galleryList, setGalleryList] = useState<GalleryMedia[]>([])
    const [galleryUploadProgress, setGalleryUploadProgress] = useState<{ current: number; total: number } | null>(null)
    const [galleryEdit, setGalleryEdit] = useState<GalleryMedia | null>(null)
    const [galleryBulkSelected, setGalleryBulkSelected] = useState<Set<number>>(new Set())
    const [galleryBulkEventTag, setGalleryBulkEventTag] = useState('')

    const refreshGallery = useCallback(() => {
        if (authToken) {
            fetch('/api/admin/gallery', { headers: { 'Authorization': authToken } })
                .then(res => res.ok ? res.json() : [])
                .then(setGalleryList)
        }
    }, [authToken])

    useEffect(() => {
        if (isAuthenticated && authToken) {
            refreshGallery()
        }
    }, [isAuthenticated, authToken, refreshGallery])

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files?.length || !authToken) return
        const total = files.length
        setGalleryUploadProgress({ current: 0, total })
        const formData = new FormData()
        for (let i = 0; i < files.length; i++) {
            formData.append('file', files[i])
        }
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
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve()
                    else {
                        try {
                            const j = JSON.parse(xhr.responseText || '{}')
                            reject(new Error(j.error || 'Upload failed'))
                        } catch {
                            reject(new Error('Upload failed'))
                        }
                    }
                }
                xhr.onerror = () => reject(new Error('Network error'))
                xhr.send(formData)
            })
            setGalleryUploadProgress({ current: total, total })
            setMessage('Upload successful')
            refreshGallery()
        } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setGalleryUploadProgress(null)
            e.target.value = ''
        }
    }

    const handleGalleryUpdate = async (payload: Partial<GalleryMedia> & { id: number }) => {
        if (!authToken) return
        const res = await fetch('/api/admin/gallery', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
            body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (json.success) {
            setMessage('Updated')
            setGalleryEdit(null)
            refreshGallery()
        } else {
            setMessage(json.error || 'Update failed')
        }
    }

    const handleGalleryDelete = async (id: number, hard?: boolean) => {
        if (!authToken) return
        const res = await fetch(`/api/admin/gallery?id=${id}${hard ? '&hard=1' : ''}`, {
            method: 'DELETE',
            headers: { 'Authorization': authToken },
        })
        const json = await res.json()
        if (json.success) {
            setMessage('Deleted')
            setGalleryEdit(null)
            setGalleryBulkSelected(prev => { const n = new Set(prev); n.delete(id); return n })
            refreshGallery()
        } else {
            setMessage(json.error || 'Delete failed')
        }
    }

    const handleGalleryBulk = async (action: 'add_to_carousel' | 'remove_from_carousel' | 'set_event_tag' | 'hide' | 'delete') => {
        if (!authToken || galleryBulkSelected.size === 0) return
        const ids = Array.from(galleryBulkSelected)
        const body: { action: string; ids: number[]; event_tag?: string | null; hard?: boolean } = { action, ids }
        if (action === 'set_event_tag') body.event_tag = galleryBulkEventTag || null
        if (action === 'delete') body.hard = false
        const res = await fetch('/api/admin/gallery/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
            body: JSON.stringify(body),
        })
        const json = await res.json()
        if (json.success) {
            setMessage('Bulk action done')
            setGalleryBulkSelected(new Set())
            refreshGallery()
        } else {
            setMessage(json.error || 'Bulk action failed')
        }
    }

    const toggleGalleryBulk = (id: number) => {
        setGalleryBulkSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    if (isAuthenticated === null) {
        return <div className="p-4 max-w-2xl mx-auto bg-gray-900 text-white rounded-lg">Authenticating...</div>
    }

    if (!isAuthenticated) {
        return <div className="p-4 max-w-2xl mx-auto bg-gray-900 text-white rounded-lg">{message}</div>
    }

    const carouselItems = galleryList
        .filter(item => item.show_in_carousel)
        .sort((a, b) => a.carousel_order - b.carousel_order)

    return (
        <div className="p-4 max-w-5xl mx-auto bg-gray-900 text-white rounded-lg">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Gallery Admin</h1>
                <a href="/admin" className="text-blue-400 hover:text-blue-300 text-sm">&larr; Back to Admin Hub</a>
            </div>
            {message && <p className={message.includes('successful') || message === 'Updated' || message === 'Deleted' || message === 'Bulk action done' || message === 'Upload successful' ? 'text-green-500 mb-3' : 'text-red-500 mb-3'}>{message}</p>}

            {/* Upload */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Upload</h2>
                <label className="inline-flex items-center justify-center min-h-[48px] min-w-[200px] px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer text-white font-medium touch-manipulation">
                    <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="sr-only"
                        onChange={handleGalleryUpload}
                        disabled={!!galleryUploadProgress}
                    />
                    {galleryUploadProgress
                        ? `Uploading ${galleryUploadProgress.current} of ${galleryUploadProgress.total}…`
                        : 'Add photos / videos'}
                </label>
                {galleryUploadProgress && (
                    <div className="mt-2 w-full max-w-xs h-2 bg-gray-700 rounded overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${(galleryUploadProgress.current / galleryUploadProgress.total) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Bulk actions */}
            {galleryList.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-400">Bulk:</span>
                    <button type="button" onClick={() => handleGalleryBulk('add_to_carousel')} disabled={galleryBulkSelected.size === 0} className="bg-green-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Add to carousel</button>
                    <button type="button" onClick={() => handleGalleryBulk('remove_from_carousel')} disabled={galleryBulkSelected.size === 0} className="bg-gray-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Remove from carousel</button>
                    <input type="text" placeholder="Event tag" value={galleryBulkEventTag} onChange={e => setGalleryBulkEventTag(e.target.value)} className="p-1.5 bg-gray-700 border border-gray-600 rounded text-sm w-32" />
                    <button type="button" onClick={() => handleGalleryBulk('set_event_tag')} disabled={galleryBulkSelected.size === 0} className="bg-gray-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Set tag</button>
                    <button type="button" onClick={() => handleGalleryBulk('hide')} disabled={galleryBulkSelected.size === 0} className="bg-yellow-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Hide</button>
                    <button type="button" onClick={() => handleGalleryBulk('delete')} disabled={galleryBulkSelected.size === 0} className="bg-red-600 px-3 py-1.5 rounded text-sm disabled:opacity-50">Delete</button>
                </div>
            )}

            {/* Gallery grid */}
            {galleryList.length > 0 && (
                <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
                    {galleryList.map(item => (
                        <div
                            key={item.id}
                            className={`border rounded overflow-hidden ${item.visible ? 'border-gray-600' : 'border-red-800 opacity-60'} ${galleryBulkSelected.has(item.id) ? 'ring-2 ring-blue-400' : ''}`}
                        >
                            <label className="flex items-center gap-1 p-1 bg-gray-700">
                                <input type="checkbox" checked={galleryBulkSelected.has(item.id)} onChange={() => toggleGalleryBulk(item.id)} className="rounded" />
                                <span className="text-xs truncate">#{item.id}</span>
                            </label>
                            <div className="aspect-square bg-gray-900 relative">
                                {(item.thumbnail_src || item.src) && (
                                    <img src={item.thumbnail_src || item.src} alt={item.alt || ''} className="w-full h-full object-cover" />
                                )}
                                {item.show_in_carousel ? (
                                    <span className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1 rounded">Carousel</span>
                                ) : null}
                            </div>
                            <div className="p-1 text-xs truncate" title={item.caption || item.date}>{item.caption || item.date || '—'}</div>
                            <div className="p-1 flex flex-wrap gap-1">
                                <button type="button" onClick={() => setGalleryEdit(item)} className="bg-yellow-600 px-2 py-0.5 rounded text-xs">Edit</button>
                                <button type="button" onClick={() => handleGalleryDelete(item.id)} className="bg-red-600 px-2 py-0.5 rounded text-xs">Hide</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Carousel preview */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Carousel (from gallery)</h2>
                <p className="text-gray-400 text-sm mb-2">Items with &quot;Show in carousel&quot; on. Edit via the grid above.</p>
                <div className="flex flex-wrap gap-2">
                    {carouselItems.map(item => (
                        <div key={item.id} className="w-24 border border-gray-600 rounded overflow-hidden">
                            {(item.thumbnail_src || item.src) && (
                                <img src={item.thumbnail_src || item.src} alt={item.alt || ''} className="w-full h-20 object-cover" />
                            )}
                            <div className="p-1 text-xs truncate">#{item.id}</div>
                            <button type="button" onClick={() => setGalleryEdit(item)} className="w-full bg-yellow-600 px-2 py-0.5 text-xs">Edit</button>
                        </div>
                    ))}
                    {carouselItems.length === 0 && (
                        <p className="text-gray-500">No carousel items. Add gallery media and turn on &quot;Show in carousel&quot;.</p>
                    )}
                </div>
            </div>

            {/* Edit modal */}
            {galleryEdit && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setGalleryEdit(null)}>
                    <div className="bg-gray-800 rounded-lg max-w-lg w-full p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-3">Edit gallery item</h3>
                        <form
                            onSubmit={e => {
                                e.preventDefault()
                                const form = e.currentTarget
                                handleGalleryUpdate({
                                    id: galleryEdit.id,
                                    caption: (form.querySelector('[name="caption"]') as HTMLInputElement)?.value ?? '',
                                    alt: (form.querySelector('[name="alt"]') as HTMLInputElement)?.value ?? '',
                                    date: (form.querySelector('[name="date"]') as HTMLInputElement)?.value ?? '',
                                    event_tag: (form.querySelector('[name="event_tag"]') as HTMLInputElement)?.value || null,
                                    show_in_carousel: (form.querySelector('[name="show_in_carousel"]') as HTMLInputElement)?.checked ? 1 : 0,
                                    carousel_order: parseInt((form.querySelector('[name="carousel_order"]') as HTMLInputElement)?.value || '0', 10),
                                    gallery_order: parseInt((form.querySelector('[name="gallery_order"]') as HTMLInputElement)?.value || '0', 10),
                                })
                            }}
                            className="space-y-2"
                        >
                            <div><label className="block text-sm">Caption</label><input name="caption" defaultValue={galleryEdit.caption} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Alt</label><input name="alt" defaultValue={galleryEdit.alt} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Date</label><input name="date" defaultValue={galleryEdit.date} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Event tag</label><input name="event_tag" defaultValue={galleryEdit.event_tag ?? ''} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <label className="flex items-center gap-2"><input name="show_in_carousel" type="checkbox" defaultChecked={!!galleryEdit.show_in_carousel} className="rounded" /><span>Show in carousel</span></label>
                            <div><label className="block text-sm">Carousel order</label><input name="carousel_order" type="number" defaultValue={galleryEdit.carousel_order} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div><label className="block text-sm">Gallery order</label><input name="gallery_order" type="number" defaultValue={galleryEdit.gallery_order} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" /></div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="bg-blue-600 px-4 py-2 rounded">Save</button>
                                <button type="button" onClick={() => setGalleryEdit(null)} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
                                <button type="button" onClick={() => handleGalleryDelete(galleryEdit.id, true)} className="bg-red-600 px-4 py-2 rounded">Delete permanently</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
