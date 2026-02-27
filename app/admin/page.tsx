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

            {/* Display Existing Data */}
            {data && (
                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-bold mb-2">Carousel Images</h2>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="border border-gray-700 p-2">ID</th>
                                    <th className="border border-gray-700 p-2">Src</th>
                                    <th className="border border-gray-700 p-2">Alt</th>
                                    <th className="border border-gray-700 p-2">Width</th>
                                    <th className="border border-gray-700 p-2">Height</th>
                                    <th className="border border-gray-700 p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.carouselImages.map(item => (
                                    <tr key={item.id} className="bg-gray-700">
                                        <td className="border border-gray-600 p-2">{item.id}</td>
                                        <td className="border border-gray-600 p-2">{item.src}</td>
                                        <td className="border border-gray-600 p-2">{item.alt}</td>
                                        <td className="border border-gray-600 p-2">{item.width}</td>
                                        <td className="border border-gray-600 p-2">{item.height}</td>
                                        <td className="border border-gray-600 p-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="bg-yellow-600 px-2 py-1 rounded hover:bg-yellow-700 mr-2"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete('carousel', item.id)}
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