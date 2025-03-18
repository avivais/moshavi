'use client'

import { useState, useEffect, useMemo } from 'react'

interface Playlist {
    id: number
    month: string
    year: number
    embedId: string
}

export default function MusicClient() {
    const [playlistsData, setPlaylistsData] = useState<Playlist[]>([])
    const [error, setError] = useState<string | null>(null)
    const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)

    useEffect(() => {
        async function fetchPlaylists() {
            try {
                const res = await fetch('/api/playlists')
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
                const data = await res.json()
                setPlaylistsData(data)
                if (data.length > 0 && !currentPlaylist) {
                    const newestPlaylist = [...data].sort((a, b) => {
                        if (a.year !== b.year) return b.year - a.year
                        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                        return months.indexOf(b.month) - months.indexOf(a.month)
                    })[0]
                    setCurrentPlaylist(newestPlaylist)
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists'
                console.error('Fetch error:', errorMessage)
                setError(errorMessage)
            }
        }
        fetchPlaylists()
    }, [currentPlaylist])

    // Memoize playlistsData for performance
    const memoizedPlaylists = useMemo(() => playlistsData, [playlistsData])

    // Group playlists by year
    const playlistsByYear = useMemo(() => {
        const grouped: Record<number, Playlist[]> = {}
        memoizedPlaylists.forEach(playlist => {
            if (!grouped[playlist.year]) {
                grouped[playlist.year] = []
            }
            grouped[playlist.year].push(playlist)
        })

        // Sort years in descending order
        return Object.entries(grouped)
            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
            .map(([year, playlists]) => ({
                year: Number(year),
                playlists: playlists.sort((a, b) => {
                    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                    return months.indexOf(b.month) - months.indexOf(a.month)
                })
            }))
    }, [memoizedPlaylists])

    const selectPlaylist = (playlist: Playlist) => {
        setCurrentPlaylist(playlist)
    }

    // Playlist item rendering function (reused in both mobile and desktop views)
    const renderPlaylistItems = () => (
        playlistsByYear.length > 0 ? (
            <div className="space-y-6">
                {playlistsByYear.map(({ year, playlists }) => (
                    <div key={year}>
                        <h3 className="text-lg font-karantina mb-2 text-gradient bg-gradient-to-r from-yellow-300 via-purple-500 to-cyan-600 bg-clip-text text-transparent">
                            {year}
                        </h3>
                        <div className="space-y-3">
                            {playlists.map((playlist) => (
                                <div
                                    key={playlist.id}
                                    onClick={() => selectPlaylist(playlist)}
                                    className={`p-3 rounded-lg cursor-pointer transition ${currentPlaylist?.id === playlist.id
                                            ? 'bg-gradient-to-r from-yellow-300/20 via-purple-500/20 to-cyan-600/20 border border-purple-500/50'
                                            : 'hover:bg-gray-800'
                                        }`}
                                >
                                    <h4 className="font-poiret-one">{playlist.month}</h4>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-gray-400 italic">No playlists available yet</p>
        )
    )

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden flex flex-col">
                <div className="h-[3rem]"></div>
                <div className="fixed top-12 left-0 right-0 z-[90] bg-black px-4 pt-2 pb-1">
                    <h1 className="text-2xl font-poiret-one mb-2 text-center">Monthly Playlists</h1>
                    {error && <p className="text-red-500">{error}</p>}
                    {currentPlaylist && (
                        <div className="bg-gray-900 rounded-lg overflow-hidden mb-0">
                            <div className="relative aspect-video">
                                <iframe
                                    className="absolute top-0 left-0 w-full h-full"
                                    src={`https://www.youtube.com/embed/videoseries?list=${currentPlaylist.embedId}`}
                                    title={`${currentPlaylist.month} ${currentPlaylist.year}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                            <div className="p-1 font-poiret-one">
                                <h2 className="text-sm text-gray-400">{currentPlaylist.month} {currentPlaylist.year}</h2>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-[calc(56vw+1.5rem)] px-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                        <h2 className="text-xl mb-4 font-poiret-one">Playlist Archives</h2>
                        {renderPlaylistItems()}
                    </div>
                </div>
            </div>
            {/* DESKTOP LAYOUT */}
            <div className="hidden md:block px-8 pb-8">
                <h1 className="text-3xl mb-4 font-poiret-one">Monthly Playlists</h1>
                <div className="flex gap-8">
                    <div className="w-2/3">
                        <div className="sticky top-16">
                            {error && <p className="text-red-500">{error}</p>}
                            {currentPlaylist ? (
                                <div className="bg-gray-900 rounded-lg overflow-hidden">
                                    <div className="relative aspect-video">
                                        <iframe
                                            className="absolute top-0 left-0 w-full h-full"
                                            src={`https://www.youtube.com/embed/videoseries?list=${currentPlaylist.embedId}`}
                                            title={`${currentPlaylist.month} ${currentPlaylist.year}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                    <div className="p-4 font-poiret-one">
                                        <h2 className="text-sm text-gray-400">{currentPlaylist.month} {currentPlaylist.year}</h2>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-900 rounded-lg p-8 flex flex-col items-center justify-center aspect-video">
                                    <h2 className="text-2xl font-poiret-one mb-4">No playlists available</h2>
                                    <p className="text-gray-400 text-center">
                                        Please add your YouTube playlists to get started
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-1/3 max-h-[calc(100vh-8rem)] overflow-y-auto">
                        <div className="bg-gray-900 rounded-lg p-4">
                            <h2 className="text-xl mb-4 font-poiret-one">Playlist Archives</h2>
                            {renderPlaylistItems()}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}