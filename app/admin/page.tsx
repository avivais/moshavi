'use client'

import { useState, useEffect } from 'react'

interface FormData {
    type: 'carousel' | 'videoSet' | 'playlist'
    id?: number
    src?: string
    alt?: string
    width?: number
    height?: number
    title?: string
    date?: string
    poster?: string
    month?: string
    year?: number
    embedId?: string
}

interface CarouselImage {
    type: 'carousel'
    id: number
    src: string
    alt: string
    width: number
    height: number
}

interface VideoSet {
    type: 'videoSet'
    id: number
    title: string
    date: string
    src: string
    poster: string
}

interface Playlist {
    type: 'playlist'
    id: number
    month: string
    year: number
    embedId: string
}

interface GalleryMedia {
    id: number
    src: string
    thumbnail_src: string | null
    width: number
    height: number
    type: 'photo' | 'video'
    caption: string
    alt: string
    date: string
    event_tag: string | null
    show_in_carousel: number
    carousel_order: number
    gallery_order: number
    visible: number
    created_at?: string
}

interface Data {
    carouselImages: CarouselImage[]
    videoSets: VideoSet[]
    playlists: Playlist[]
}

type DataItem = CarouselImage | VideoSet | Playlist

interface YoutubeSyncPreviewItem {
    title: string
    embedId: string
    month: string
    year: number
}

export default function Admin() {
    const [form, setForm] = useState<FormData>({ type: 'playlist' })
    const [message, setMessage] = useState<string | null>(null)
    const [authToken, setAuthToken] = useState<string | null>(null)
    const [data, setData] = useState<Data | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    // YouTube sync preview state
    const [syncPreviewLoading, setSyncPreviewLoading] = useState(false)
    const [syncPreviewError, setSyncPreviewError] = useState<string | null>(null)
    const [syncLatestInDb, setSyncLatestInDb] = useState<{ year: number; month: string } | null>(null)
    const [syncToAdd, setSyncToAdd] = useState<YoutubeSyncPreviewItem[]>([])
    const [syncSelected, setSyncSelected] = useState<Set<number>>(new Set())
    const [syncApplyLoading, setSyncApplyLoading] = useState(false)
    const [syncApplyMessage, setSyncApplyMessage] = useState<string | null>(null)
    const [syncPreviewFetched, setSyncPreviewFetched] = useState(false)

    // Gallery state
    const [galleryList, setGalleryList] = useState<GalleryMedia[]>([])
    const [galleryUploadProgress, setGalleryUploadProgress] = useState<{ current: number; total: number } | null>(null)
    const [galleryEdit, setGalleryEdit] = useState<GalleryMedia | null>(null)
    const [galleryBulkSelected, setGalleryBulkSelected] = useState<Set<number>>(new Set())
    const [galleryBulkEventTag, setGalleryBulkEventTag] = useState('')

    useEffect(() => {
        const token = prompt('Enter admin password')
        if (token) {
            const bearerToken = `Bearer ${token}`
            setAuthToken(bearerToken)
            fetch('/api/admin', {
                headers: { 'Authorization': bearerToken },
            }).then(res => {
                if (res.ok) {
                    setIsAuthenticated(true)
                    res.json().then(setData)
                } else {
                    setIsAuthenticated(false)
                    setMessage('Invalid password')
                }
            }).catch(() => {
                setIsAuthenticated(false)
                setMessage('Authentication failed')
            })
        } else {
            setIsAuthenticated(false)
            setMessage('Password required')
        }
    }, [])

    useEffect(() => {
        if (isAuthenticated && authToken) {
            fetch('/api/admin/gallery', { headers: { 'Authorization': authToken } })
                .then(res => res.ok ? res.json() : [])
                .then(setGalleryList)
                .catch(() => setGalleryList([]))
        }
    }, [isAuthenticated, authToken])

    const refreshGallery = () => {
        if (authToken) {
            fetch('/api/admin/gallery', { headers: { 'Authorization': authToken } })
                .then(res => res.ok ? res.json() : [])
                .then(setGalleryList)
        }
    }

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!authToken) {
            setMessage('Authentication required')
            return
        }

        const method = form.id ? 'PUT' : 'POST'
        const payload = form.id ? { type: form.type, id: form.id, data: {
            src: form.src || '',
            alt: form.alt || '',
            width: form.width || 0,
            height: form.height || 0,
            title: form.title || '',
            date: form.date || '',
            poster: form.poster || '',
            month: form.month || '',
            year: form.year || 0,
            embedId: form.embedId || '',
        } } : { type: form.type, data: form }

        const response = await fetch('/api/admin', {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
            body: JSON.stringify(payload),
        })

        const result = await response.json()
        if (result.success) {
            setMessage('Operation successful')
            setForm({ type: form.type }) // Reset form, keep type
            // Refresh data
            fetch('/api/admin', { headers: { 'Authorization': authToken } }).then(res => res.json().then(setData))
        } else {
            setMessage(result.error || 'Operation failed')
        }
    }

    const handleDelete = async (type: 'carousel' | 'videoSet' | 'playlist', id: number) => {
        if (!authToken) {
            setMessage('Authentication required')
            return
        }

        const response = await fetch('/api/admin', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
            body: JSON.stringify({ type, id }),
        })

        const result = await response.json()
        if (result.success) {
            setMessage('Deletion successful')
            setForm({ type: form.type }) // Reset form, keep type
            // Refresh data
            fetch('/api/admin', { headers: { 'Authorization': authToken } }).then(res => res.json().then(setData))
        } else {
            setMessage(result.error || 'Deletion failed')
        }
    }

    const handleEdit = (item: DataItem) => {
        if (form.type === 'carousel' && item.type === 'carousel') {
            setForm({
                type: 'carousel',
                id: item.id,
                src: item.src,
                alt: item.alt,
                width: item.width,
                height: item.height,
            })
        } else if (form.type === 'videoSet' && item.type === 'videoSet') {
            setForm({
                type: 'videoSet',
                id: item.id,
                title: item.title,
                date: item.date,
                src: item.src,
                poster: item.poster,
            })
        } else if (form.type === 'playlist' && item.type === 'playlist') {
            setForm({
                type: 'playlist',
                id: item.id,
                month: item.month,
                year: item.year,
                embedId: item.embedId,
            })
        }
    }

    const fetchYoutubeSyncPreview = async () => {
        if (!authToken) return
        setSyncPreviewError(null)
        setSyncPreviewLoading(true)
        try {
            const res = await fetch('/api/admin/youtube-sync/preview', { headers: { 'Authorization': authToken } })
            const json = await res.json()
            if (!res.ok) {
                setSyncPreviewError(json.error || 'Failed to fetch preview')
                setSyncToAdd([])
                setSyncLatestInDb(null)
                setSyncPreviewFetched(false)
                return
            }
            setSyncLatestInDb(json.latestInDb ?? null)
            setSyncToAdd(json.toAdd ?? [])
            setSyncSelected(new Set((json.toAdd ?? []).map((_: unknown, i: number) => i)))
            setSyncPreviewFetched(true)
        } catch (e) {
            setSyncPreviewError(e instanceof Error ? e.message : 'Request failed')
            setSyncToAdd([])
            setSyncLatestInDb(null)
            setSyncPreviewFetched(false)
        } finally {
            setSyncPreviewLoading(false)
        }
    }

    const applyYoutubeSync = async () => {
        if (!authToken || syncToAdd.length === 0) return
        const selected = Array.from(syncSelected).sort((a, b) => a - b)
        const playlists = selected.map(i => syncToAdd[i]).filter(Boolean)
        if (playlists.length === 0) return
        setSyncApplyMessage(null)
        setSyncApplyLoading(true)
        try {
            const res = await fetch('/api/admin/youtube-sync/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
                body: JSON.stringify({ playlists: playlists.map(({ month, year, embedId }) => ({ month, year, embedId })) }),
            })
            const json = await res.json()
            if (!res.ok) {
                setSyncApplyMessage(json.error || 'Failed to add playlists')
                return
            }
            setSyncApplyMessage(`Added ${json.added ?? playlists.length} playlists.`)
            setSyncToAdd([])
            setSyncLatestInDb(null)
            setSyncSelected(new Set())
            setSyncPreviewFetched(false)
            fetch('/api/admin', { headers: { 'Authorization': authToken } }).then(r => r.json().then(setData))
        } catch (e) {
            setSyncApplyMessage(e instanceof Error ? e.message : 'Request failed')
        } finally {
            setSyncApplyLoading(false)
        }
    }

    const toggleSyncSelected = (index: number) => {
        setSyncSelected(prev => {
            const next = new Set(prev)
            if (next.has(index)) next.delete(index)
            else next.add(index)
            return next
        })
    }

    if (isAuthenticated === null) {
        return <div className="p-4 max-w-2xl mx-auto bg-gray-900 text-white rounded-lg">Authenticating...</div>
    }

    if (!isAuthenticated) {
        return <div className="p-4 max-w-2xl mx-auto bg-gray-900 text-white rounded-lg">{message}</div>
    }

    return (
        <div className="p-4 max-w-4xl mx-auto bg-gray-900 text-white rounded-lg">
            <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
            {message && <p className={message.includes('successful') ? 'text-green-500' : 'text-red-500'}>{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
                <div>
                    <label className="block mb-1">Type:</label>
                    <select
                        value={form.type}
                        onChange={e => setForm({ type: e.target.value as 'carousel' | 'videoSet' | 'playlist' })}
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                    >
                        <option value="carousel">Carousel Image</option>
                        <option value="videoSet">Video Set</option>
                        <option value="playlist">Playlist</option>
                    </select>
                </div>
                <div>
                    <label className="block mb-1">ID (for update):</label>
                    <input
                        type="number"
                        placeholder="ID"
                        value={form.id || ''}
                        onChange={e => setForm({ ...form, id: Number(e.target.value) || undefined })}
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                    />
                </div>
                {form.type === 'carousel' && (
                    <>
                        <div>
                            <label className="block mb-1">Src:</label>
                            <input
                                placeholder="src"
                                value={form.src || ''}
                                onChange={e => setForm({ ...form, src: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Alt:</label>
                            <input
                                placeholder="alt"
                                value={form.alt || ''}
                                onChange={e => setForm({ ...form, alt: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Width:</label>
                            <input
                                type="number"
                                placeholder="width"
                                value={form.width || ''}
                                onChange={e => setForm({ ...form, width: Number(e.target.value) || undefined })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Height:</label>
                            <input
                                type="number"
                                placeholder="height"
                                value={form.height || ''}
                                onChange={e => setForm({ ...form, height: Number(e.target.value) || undefined })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                    </>
                )}
                {form.type === 'videoSet' && (
                    <>
                        <div>
                            <label className="block mb-1">Title:</label>
                            <input
                                placeholder="title"
                                value={form.title || ''}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Date:</label>
                            <input
                                placeholder="date"
                                value={form.date || ''}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Src:</label>
                            <input
                                placeholder="src"
                                value={form.src || ''}
                                onChange={e => setForm({ ...form, src: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Poster:</label>
                            <input
                                placeholder="poster"
                                value={form.poster || ''}
                                onChange={e => setForm({ ...form, poster: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                    </>
                )}
                {form.type === 'playlist' && (
                    <>
                        <div>
                            <label className="block mb-1">Month:</label>
                            <input
                                placeholder="month"
                                value={form.month || ''}
                                onChange={e => setForm({ ...form, month: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Year:</label>
                            <input
                                type="number"
                                placeholder="year"
                                value={form.year || ''}
                                onChange={e => setForm({ ...form, year: Number(e.target.value) || undefined })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Embed ID:</label>
                            <input
                                placeholder="embedId"
                                value={form.embedId || ''}
                                onChange={e => setForm({ ...form, embedId: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                            />
                        </div>
                    </>
                )}
                <button type="submit" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
                    {form.id ? 'Update' : 'Add'}
                </button>
            </form>

            {/* YouTube playlist sync */}
            <div className="mb-8 p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-bold mb-2">YouTube playlist sync (@avivais)</h2>
                <p className="text-gray-400 text-sm mb-3">Fetch playlists from your channel and add newer ones to Moshavi.</p>
                <button
                    type="button"
                    onClick={fetchYoutubeSyncPreview}
                    disabled={syncPreviewLoading}
                    className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                    {syncPreviewLoading ? 'Fetching…' : 'Fetch preview'}
                </button>
                {syncPreviewError && <p className="text-red-500 mt-2">{syncPreviewError}</p>}
                {syncApplyMessage && <p className={syncApplyMessage.startsWith('Added') ? 'text-green-500 mt-2' : 'text-red-500 mt-2'}>{syncApplyMessage}</p>}
                {syncToAdd.length > 0 && (
                    <div className="mt-4">
                        <p className="text-gray-400 text-sm mb-2">
                            {syncLatestInDb ? `Latest in Moshavi: ${syncLatestInDb.month} ${syncLatestInDb.year}` : 'No playlists in Moshavi yet.'}
                        </p>
                        <p className="text-sm mb-2">Playlists to add (uncheck to exclude):</p>
                        <ul className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                            {syncToAdd.map((item, i) => (
                                <li key={`${item.year}-${item.month}-${item.embedId}`} className="flex items-center gap-2 flex-wrap">
                                    <input
                                        type="checkbox"
                                        checked={syncSelected.has(i)}
                                        onChange={() => toggleSyncSelected(i)}
                                        className="rounded"
                                    />
                                    <span className="font-poiret-one">{item.title}</span>
                                    <span className="text-gray-500 text-sm">{item.month} {item.year}</span>
                                    <span className="text-gray-600 text-xs truncate max-w-[8rem]" title={item.embedId}>{item.embedId}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={applyYoutubeSync}
                            disabled={syncApplyLoading || syncSelected.size === 0}
                            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {syncApplyLoading ? 'Adding…' : `Confirm and add (${syncSelected.size})`}
                        </button>
                    </div>
                )}
                {syncToAdd.length === 0 && !syncPreviewLoading && !syncPreviewError && (
                    syncPreviewFetched && (
                        <p className="text-gray-400 mt-2">
                            No new playlists to add.
                            {syncLatestInDb && ` Latest in Moshavi: ${syncLatestInDb.month} ${syncLatestInDb.year}.`}
                        </p>
                    )
                )}
            </div>

            {/* Gallery: upload + media list + edit + bulk */}
            <div className="mb-8 p-4 bg-gray-800 rounded-lg">
                <h2 className="text-xl font-bold mb-2">Gallery</h2>
                <p className="text-gray-400 text-sm mb-3">Upload photos and videos; add to carousel or manage in gallery.</p>
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

                {galleryList.length > 0 && (
                    <>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-gray-400">Bulk:</span>
                            <button
                                type="button"
                                onClick={() => handleGalleryBulk('add_to_carousel')}
                                disabled={galleryBulkSelected.size === 0}
                                className="bg-green-600 px-3 py-1.5 rounded text-sm disabled:opacity-50"
                            >
                                Add to carousel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleGalleryBulk('remove_from_carousel')}
                                disabled={galleryBulkSelected.size === 0}
                                className="bg-gray-600 px-3 py-1.5 rounded text-sm disabled:opacity-50"
                            >
                                Remove from carousel
                            </button>
                            <input
                                type="text"
                                placeholder="Event tag"
                                value={galleryBulkEventTag}
                                onChange={e => setGalleryBulkEventTag(e.target.value)}
                                className="p-1.5 bg-gray-700 border border-gray-600 rounded text-sm w-32"
                            />
                            <button
                                type="button"
                                onClick={() => handleGalleryBulk('set_event_tag')}
                                disabled={galleryBulkSelected.size === 0}
                                className="bg-gray-600 px-3 py-1.5 rounded text-sm disabled:opacity-50"
                            >
                                Set tag
                            </button>
                            <button
                                type="button"
                                onClick={() => handleGalleryBulk('hide')}
                                disabled={galleryBulkSelected.size === 0}
                                className="bg-yellow-600 px-3 py-1.5 rounded text-sm disabled:opacity-50"
                            >
                                Hide
                            </button>
                            <button
                                type="button"
                                onClick={() => handleGalleryBulk('delete')}
                                disabled={galleryBulkSelected.size === 0}
                                className="bg-red-600 px-3 py-1.5 rounded text-sm disabled:opacity-50"
                            >
                                Delete
                            </button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                            {galleryList.map(item => (
                                <div
                                    key={item.id}
                                    className={`border rounded overflow-hidden ${item.visible ? 'border-gray-600' : 'border-red-800 opacity-60'} ${galleryBulkSelected.has(item.id) ? 'ring-2 ring-blue-400' : ''}`}
                                >
                                    <label className="flex items-center gap-1 p-1 bg-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={galleryBulkSelected.has(item.id)}
                                            onChange={() => toggleGalleryBulk(item.id)}
                                            className="rounded"
                                        />
                                        <span className="text-xs truncate">#{item.id}</span>
                                    </label>
                                    <div className="aspect-square bg-gray-900 relative">
                                        {(item.thumbnail_src || item.src) && (
                                            <img
                                                src={item.thumbnail_src || item.src}
                                                alt={item.alt || ''}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        {item.show_in_carousel ? (
                                            <span className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1 rounded">Carousel</span>
                                        ) : null}
                                    </div>
                                    <div className="p-1 text-xs truncate" title={item.caption || item.date}>{item.caption || item.date || '—'}</div>
                                    <div className="p-1 flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setGalleryEdit(item)}
                                            className="bg-yellow-600 px-2 py-0.5 rounded text-xs"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGalleryDelete(item.id)}
                                            className="bg-red-600 px-2 py-0.5 rounded text-xs"
                                        >
                                            Hide
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

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
                                <div>
                                    <label className="block text-sm">Caption</label>
                                    <input name="caption" defaultValue={galleryEdit.caption} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm">Alt</label>
                                    <input name="alt" defaultValue={galleryEdit.alt} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm">Date</label>
                                    <input name="date" defaultValue={galleryEdit.date} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm">Event tag</label>
                                    <input name="event_tag" defaultValue={galleryEdit.event_tag ?? ''} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" />
                                </div>
                                <label className="flex items-center gap-2">
                                    <input name="show_in_carousel" type="checkbox" defaultChecked={!!galleryEdit.show_in_carousel} className="rounded" />
                                    <span>Show in carousel</span>
                                </label>
                                <div>
                                    <label className="block text-sm">Carousel order</label>
                                    <input name="carousel_order" type="number" defaultValue={galleryEdit.carousel_order} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm">Gallery order</label>
                                    <input name="gallery_order" type="number" defaultValue={galleryEdit.gallery_order} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" />
                                </div>
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

            {/* Display Existing Data */}
            {data && (
                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-bold mb-2">Carousel (from gallery)</h2>
                        <p className="text-gray-400 text-sm mb-2">Items with &quot;Show in carousel&quot; on. Edit via Gallery section above.</p>
                        <div className="flex flex-wrap gap-2">
                            {galleryList.filter(item => item.show_in_carousel).sort((a, b) => a.carousel_order - b.carousel_order).map(item => (
                                <div key={item.id} className="w-24 border border-gray-600 rounded overflow-hidden">
                                    {(item.thumbnail_src || item.src) && (
                                        <img src={item.thumbnail_src || item.src} alt={item.alt || ''} className="w-full h-20 object-cover" />
                                    )}
                                    <div className="p-1 text-xs truncate">#{item.id}</div>
                                    <button
                                        type="button"
                                        onClick={() => setGalleryEdit(item)}
                                        className="w-full bg-yellow-600 px-2 py-0.5 text-xs"
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                            {galleryList.filter(item => item.show_in_carousel).length === 0 && (
                                <p className="text-gray-500">No carousel items. Add gallery media and turn on &quot;Show in carousel&quot;.</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-2">Video Sets</h2>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="border border-gray-700 p-2">ID</th>
                                    <th className="border border-gray-700 p-2">Title</th>
                                    <th className="border border-gray-700 p-2">Date</th>
                                    <th className="border border-gray-700 p-2">Src</th>
                                    <th className="border border-gray-700 p-2">Poster</th>
                                    <th className="border border-gray-700 p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.videoSets.map(item => (
                                    <tr key={item.id} className="bg-gray-700">
                                        <td className="border border-gray-600 p-2">{item.id}</td>
                                        <td className="border border-gray-600 p-2">{item.title}</td>
                                        <td className="border border-gray-600 p-2">{item.date}</td>
                                        <td className="border border-gray-600 p-2">{item.src}</td>
                                        <td className="border border-gray-600 p-2">{item.poster}</td>
                                        <td className="border border-gray-600 p-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="bg-yellow-600 px-2 py-1 rounded hover:bg-yellow-700 mr-2"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete('videoSet', item.id)}
                                                className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-2">Playlists</h2>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="border border-gray-700 p-2">ID</th>
                                    <th className="border border-gray-700 p-2">Month</th>
                                    <th className="border border-gray-700 p-2">Year</th>
                                    <th className="border border-gray-700 p-2">Embed ID</th>
                                    <th className="border border-gray-700 p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.playlists.map(item => (
                                    <tr key={item.id} className="bg-gray-700">
                                        <td className="border border-gray-600 p-2">{item.id}</td>
                                        <td className="border border-gray-600 p-2">{item.month}</td>
                                        <td className="border border-gray-600 p-2">{item.year}</td>
                                        <td className="border border-gray-600 p-2">{item.embedId}</td>
                                        <td className="border border-gray-600 p-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="bg-yellow-600 px-2 py-1 rounded hover:bg-yellow-700 mr-2"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete('playlist', item.id)}
                                                className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}