'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

interface VideoSet {
    id: number
    title: string
    date: string
    src: string
    poster: string
}

export default function SetsClient() {
    const [videoSets, setVideoSets] = useState<VideoSet[]>([])
    const [error, setError] = useState<string | null>(null)
    const [currentVideo, setCurrentVideo] = useState<VideoSet | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [isMuted, setIsMuted] = useState(false)
    const [volume, setVolume] = useState(0.7) // Current volume
    const [lastVolume, setLastVolume] = useState(0.7) // Last non-zero volume
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [isIOS, setIsIOS] = useState(false) // iOS detection

    const videoRef = useRef<HTMLVideoElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)

    // Memoize the reversed video list unconditionally
    const memoizedVideoSets = useMemo(() => [...videoSets].reverse(), [videoSets])

    useEffect(() => {
        // Fetch video sets from DB
        async function fetchVideoSets() {
            try {
                const res = await fetch('/api/videoSets')
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
                const data = await res.json()
                setVideoSets(data)
                // Set the newest video (highest ID) as current by default
                if (data.length > 0) {
                    const newestVideo = [...data].sort((a, b) => b.id - a.id)[0]
                    setCurrentVideo(newestVideo)
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load video sets'
                console.error('Fetch error:', errorMessage)
                setError(errorMessage)
            }
        }
        fetchVideoSets()
    }, [])

    useEffect(() => {
        // Detect if the device is iOS
        const checkIOS = () =>
            /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        setIsIOS(checkIOS())
    }, [])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const updateProgress = () => {
            if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100)
                setCurrentTime(video.currentTime)
            }
        }

        const handleLoadedMetadata = () => {
            setDuration(video.duration)
            video.volume = volume
            video.muted = isMuted || volume === 0
        }

        video.addEventListener('timeupdate', updateProgress)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)

        return () => {
            video.removeEventListener('timeupdate', updateProgress)
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
    }, [currentVideo, volume, isMuted])

    const handleVideoClick = () => {
        const video = videoRef.current
        if (!video) return

        if (isPlaying) {
            video.pause()
        } else {
            video.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const progressBar = progressRef.current
        const video = videoRef.current
        if (!progressBar || !video) return

        const rect = progressBar.getBoundingClientRect()
        const pos = (e.clientX - rect.left) / rect.width
        video.currentTime = pos * video.duration
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value)
        setVolume(value)
        if (videoRef.current) {
            videoRef.current.volume = value
            setIsMuted(value === 0)
            if (value > 0) setLastVolume(value)
        }
    }

    const toggleMute = () => {
        const video = videoRef.current
        if (!video) return

        if (isMuted) {
            const newVolume = lastVolume > 0 ? lastVolume : 0.7
            setVolume(newVolume)
            video.volume = newVolume
            video.muted = false
            setIsMuted(false)
        } else {
            if (volume > 0) setLastVolume(volume)
            setVolume(0)
            video.volume = 0
            video.muted = true
            setIsMuted(true)
        }
    }

    const formatTime = (seconds: number) => {
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600)
            const mins = Math.floor((seconds % 3600) / 60)
            const secs = Math.floor(seconds % 60)
            return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
        } else {
            const mins = Math.floor(seconds / 60)
            const secs = Math.floor(seconds % 60)
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`
        }
    }

    const selectVideo = (video: VideoSet) => {
        setCurrentVideo(video)
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
        setIsMuted(false)
        if (!isIOS) {
            setVolume(0.7)
            setLastVolume(0.7)
        }
    }

    return (
        <main className="min-h-screen p-2 md:p-4">
            <h1 className="text-3xl mb-6 font-poiret-one text-center md:text-left">Past Sets</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Video Player */}
                <div className="w-full md:w-2/3">
                    {currentVideo && (
                        <div className="bg-gray-900 rounded-lg overflow-hidden">
                            <div className="relative aspect-video" onClick={handleVideoClick}>
                                <video
                                    ref={videoRef}
                                    src={currentVideo.src}
                                    poster={currentVideo.poster}
                                    className="w-full h-full object-contain"
                                    playsInline
                                    muted={isMuted || (volume === 0 && !isIOS)}
                                >
                                    Your browser does not support the video tag.
                                </video>
                                {!isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <button className="bg-white bg-opacity-20 rounded-full p-5 hover:bg-opacity-30 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16">
                                                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Custom controls */}
                            <div className="p-4 bg-black bg-opacity-50">
                                <div
                                    ref={progressRef}
                                    className="w-full h-2 bg-gray-700 rounded cursor-pointer mb-3"
                                    onClick={handleProgressClick}
                                >
                                    <div
                                        className="h-full bg-gradient-to-r from-yellow-300 via-purple-500 to-cyan-600 rounded"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleVideoClick} className="text-white hover:text-gray-300 focus-ring rounded p-1" aria-label={isPlaying ? 'Pause' : 'Play'}>
                                            {isPlaying ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Volume Control */}
                                        <div className="flex items-center gap-2">
                                            <button onClick={toggleMute} className="text-white hover:text-gray-300 focus-ring rounded p-1" aria-label={isMuted || (volume === 0 && !isIOS) ? 'Unmute' : 'Mute'}>
                                                {isMuted || (volume === 0 && !isIOS) ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M6.717 3.55A.5.5 0 0 1 7.22 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.605-1.89a.5.5 0 0 1 .287-.06zm6.963 1.582a.5.5 0 0 1 0 .707L12.354 7.165l1.326 1.326a.5.5 0 0 1-.707.707L11.647 7.872l-1.326 1.326a.5.5 0 0 1-.707-.707L10.94 7.165l-1.326-1.326a.5.5 0 0 1 .707-.707L11.647 6.458l1.326-1.326a.5.5 0 0 1 .707 0z" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z" />
                                                        <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z" />
                                                        <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7.22 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.605-1.89a.5.5 0 0 1 .287-.06z" />
                                                    </svg>
                                                )}
                                            </button>
                                            {!isIOS && (
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={volume}
                                                    onChange={handleVolumeChange}
                                                    className="w-16 md:w-24 accent-purple-500"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-sm text-white">
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 font-poiret-one">
                                <h2 className="text-xl">{currentVideo.title}</h2>
                                <p className="text-gray-400">{currentVideo.date}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Video List */}
                <div className="w-full md:w-1/3">
                    <div className="bg-gray-900 rounded-lg p-4">
                        <h2 className="text-xl mb-4 font-poiret-one">Available Sets</h2>
                        <div className="space-y-3">
                            {error ? (
                                <p>{error}</p>
                            ) : videoSets.length > 0 ? (
                                memoizedVideoSets.map((video) => (
                                    <div
                                        key={video.id}
                                        onClick={() => selectVideo(video)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectVideo(video); } }}
                                        tabIndex={0}
                                        role="button"
                                        className={`p-3 rounded-lg cursor-pointer transition focus-ring ${currentVideo?.id === video.id ? 'selected-card' : 'hover:bg-gray-800'}`}
                                    >
                                        <h3 className="font-poiret-one">{video.title}</h3>
                                        <p className="text-sm text-gray-400">{video.date}</p>
                                    </div>
                                ))
                            ) : (
                                <p>No sets available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}