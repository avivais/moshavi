'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

interface VideoSet {
    id: number
    title: string
    date: string
    src: string
    poster: string
}

export default function SetsClient() {
    const DOUBLE_TAP_MS = 280
    const SKIP_SECONDS = 10
    const KEYBOARD_SEEK_SECONDS = 5
    const FINE_SCRUB_Y_THRESHOLD = 44
    const FINE_SCRUB_FACTOR = 0.25

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
    const [isVideoHovered, setIsVideoHovered] = useState(false)
    const [progressHoverTime, setProgressHoverTime] = useState<number | null>(null)
    const [isProgressHovered, setIsProgressHovered] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [bufferedPercent, setBufferedPercent] = useState(0)
    const [isBuffering, setIsBuffering] = useState(false)
    const [isSeeking, setIsSeeking] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isPictureInPicture, setIsPictureInPicture] = useState(false)
    const [pipSupported, setPipSupported] = useState(false)
    const [showControls, setShowControls] = useState(true)
    const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null)
    const [scrubPreviewPos, setScrubPreviewPos] = useState<number | null>(null)
    const [isFineScrubbing, setIsFineScrubbing] = useState(false)
    const [skipFeedback, setSkipFeedback] = useState<{ direction: 'backward' | 'forward'; token: number } | null>(null)
    const didDragRef = useRef(false)
    const leftTapAtRef = useRef(0)
    const rightTapAtRef = useRef(0)
    const skipFeedbackTimerRef = useRef<number | null>(null)
    const scrubSessionRef = useRef<{ startPos: number; startY: number } | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)
    const playerShellRef = useRef<HTMLDivElement>(null)

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

    const seekTo = useCallback((nextSeconds: number, reason: 'drag' | 'keyboard' | 'doubleTap' | 'button' | 'mediaSession') => {
        const video = videoRef.current
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
        const targetTime = Math.min(video.duration, Math.max(0, nextSeconds))
        setIsSeeking(reason !== 'drag')
        video.currentTime = targetTime
        setCurrentTime(targetTime)
        setProgress((targetTime / video.duration) * 100)
    }, [])

    const seekBy = useCallback((delta: number, reason: 'keyboard' | 'doubleTap' | 'button' | 'mediaSession') => {
        const video = videoRef.current
        if (!video) return
        seekTo(video.currentTime + delta, reason)
    }, [seekTo])

    const togglePlayback = () => {
        const video = videoRef.current
        if (!video) return
        if (video.paused) {
            void video.play()
        } else {
            video.pause()
        }
    }

    const indicateSkip = (direction: 'backward' | 'forward') => {
        if (skipFeedbackTimerRef.current) {
            window.clearTimeout(skipFeedbackTimerRef.current)
        }
        setSkipFeedback({ direction, token: Date.now() })
        skipFeedbackTimerRef.current = window.setTimeout(() => {
            setSkipFeedback(null)
        }, 600)
    }

    const notifyInteraction = () => {
        setShowControls(true)
    }

    const getBubbleLeftPercent = (positionRatio: number) => Math.min(92, Math.max(8, positionRatio * 100))

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const updateProgress = () => {
            if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100)
                setCurrentTime(video.currentTime)
            }
        }

        const updateBuffered = () => {
            if (!video.duration || video.buffered.length === 0) {
                setBufferedPercent(0)
                return
            }
            try {
                const end = video.buffered.end(video.buffered.length - 1)
                setBufferedPercent((end / video.duration) * 100)
            } catch {
                setBufferedPercent(0)
            }
        }

        const handleLoadedMetadata = () => {
            setDuration(video.duration)
            video.volume = volume
            video.muted = isMuted || volume === 0
            updateBuffered()
        }

        const handleWaiting = () => setIsBuffering(true)
        const handlePlaying = () => {
            setIsBuffering(false)
            setIsSeeking(false)
        }
        const handleCanPlay = () => setIsBuffering(false)
        const handleSeeking = () => setIsSeeking(true)
        const handleSeeked = () => setIsSeeking(false)
        const handlePlay = () => setIsPlaying(true)
        const handlePause = () => setIsPlaying(false)
        const handleEnded = () => setIsPlaying(false)

        video.addEventListener('timeupdate', updateProgress)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('progress', updateBuffered)
        video.addEventListener('waiting', handleWaiting)
        video.addEventListener('stalled', handleWaiting)
        video.addEventListener('seeking', handleSeeking)
        video.addEventListener('seeked', handleSeeked)
        video.addEventListener('canplay', handleCanPlay)
        video.addEventListener('playing', handlePlaying)
        video.addEventListener('play', handlePlay)
        video.addEventListener('pause', handlePause)
        video.addEventListener('ended', handleEnded)

        return () => {
            video.removeEventListener('timeupdate', updateProgress)
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('progress', updateBuffered)
            video.removeEventListener('waiting', handleWaiting)
            video.removeEventListener('stalled', handleWaiting)
            video.removeEventListener('seeking', handleSeeking)
            video.removeEventListener('seeked', handleSeeked)
            video.removeEventListener('canplay', handleCanPlay)
            video.removeEventListener('playing', handlePlaying)
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('pause', handlePause)
            video.removeEventListener('ended', handleEnded)
        }
    }, [currentVideo, volume, isMuted])

    useEffect(() => {
        if (!isFullscreen) {
            setShowControls(true)
            return
        }
        if (!isPlaying || isDragging || isProgressHovered) {
            setShowControls(true)
            return
        }
        const timer = window.setTimeout(() => {
            setShowControls(false)
        }, 2200)
        return () => window.clearTimeout(timer)
    }, [isFullscreen, isPlaying, isDragging, isProgressHovered, currentTime])

    useEffect(() => {
        const onFullscreenChange = () => {
            const shell = playerShellRef.current
            setIsFullscreen(!!shell && document.fullscreenElement === shell)
            setShowControls(true)
        }
        document.addEventListener('fullscreenchange', onFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
    }, [])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        setPipSupported(typeof document !== 'undefined' && document.pictureInPictureEnabled)
        const onEnterPiP = () => setIsPictureInPicture(true)
        const onLeavePiP = () => setIsPictureInPicture(false)
        video.addEventListener('enterpictureinpicture', onEnterPiP)
        video.addEventListener('leavepictureinpicture', onLeavePiP)
        return () => {
            video.removeEventListener('enterpictureinpicture', onEnterPiP)
            video.removeEventListener('leavepictureinpicture', onLeavePiP)
        }
    }, [currentVideo])

    useEffect(() => {
        if (!currentVideo || !('mediaSession' in navigator)) return
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentVideo.title,
            artist: 'MoshAvi',
            album: 'Past Sets',
            artwork: currentVideo.poster ? [{ src: currentVideo.poster }] : undefined,
        })
        navigator.mediaSession.setActionHandler('play', () => {
            const video = videoRef.current
            if (!video) return
            void video.play()
        })
        navigator.mediaSession.setActionHandler('pause', () => {
            videoRef.current?.pause()
        })
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            const amount = details.seekOffset ?? SKIP_SECONDS
            seekBy(-amount, 'mediaSession')
        })
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const amount = details.seekOffset ?? SKIP_SECONDS
            seekBy(amount, 'mediaSession')
        })
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (typeof details.seekTime === 'number') {
                seekTo(details.seekTime, 'mediaSession')
            }
        })
        return () => {
            navigator.mediaSession.setActionHandler('play', null)
            navigator.mediaSession.setActionHandler('pause', null)
            navigator.mediaSession.setActionHandler('seekbackward', null)
            navigator.mediaSession.setActionHandler('seekforward', null)
            navigator.mediaSession.setActionHandler('seekto', null)
        }
    }, [currentVideo, seekBy, seekTo])

    useEffect(() => {
        return () => {
            if (skipFeedbackTimerRef.current) {
                window.clearTimeout(skipFeedbackTimerRef.current)
            }
        }
    }, [])

    const handleVideoClick = () => {
        if (didDragRef.current) {
            didDragRef.current = false
            return
        }
        togglePlayback()
    }

    const getProgressPosition = (clientX: number, clientY?: number) => {
        const progressBar = progressRef.current
        const video = videoRef.current
        if (!progressBar || !video || !video.duration) return { pos: 0, time: 0 }
        const rect = progressBar.getBoundingClientRect()
        const rawPos = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        let pos = rawPos
        const scrubSession = scrubSessionRef.current
        if (typeof clientY === 'number' && scrubSession) {
            const deltaY = Math.abs(clientY - scrubSession.startY)
            if (deltaY > FINE_SCRUB_Y_THRESHOLD) {
                pos = Math.min(1, Math.max(0, scrubSession.startPos + (rawPos - scrubSession.startPos) * FINE_SCRUB_FACTOR))
                setIsFineScrubbing(true)
            } else {
                setIsFineScrubbing(false)
            }
        }
        return { pos, time: pos * video.duration }
    }

    const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { pos, time } = getProgressPosition(e.clientX)
        setProgressHoverTime(time)
        setScrubPreviewPos(pos)
    }

    const handleProgressMouseLeave = () => {
        setIsProgressHovered(false)
        setProgressHoverTime(null)
        if (!isDragging) {
            setScrubPreviewPos(null)
        }
    }

    const beginScrub = (clientX: number, clientY: number) => {
        const { pos, time } = getProgressPosition(clientX, clientY)
        setIsDragging(true)
        setScrubPreviewPos(pos)
        setScrubPreviewTime(time)
        didDragRef.current = false
        scrubSessionRef.current = { startPos: pos, startY: clientY }
        seekTo(time, 'drag')
    }

    const updateScrub = (clientX: number, clientY: number) => {
        const { pos, time } = getProgressPosition(clientX, clientY)
        setScrubPreviewPos(pos)
        setScrubPreviewTime(time)
        didDragRef.current = true
        seekTo(time, 'drag')
    }

    const endScrub = () => {
        setIsDragging(false)
        setIsFineScrubbing(false)
        scrubSessionRef.current = null
        setProgressHoverTime(null)
    }

    const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        notifyInteraction()
        beginScrub(e.clientX, e.clientY)
        const onPointerMove = (moveEvent: PointerEvent) => {
            updateScrub(moveEvent.clientX, moveEvent.clientY)
        }
        const onPointerUp = () => {
            endScrub()
            document.removeEventListener('pointermove', onPointerMove)
            document.removeEventListener('pointerup', onPointerUp)
        }
        document.addEventListener('pointermove', onPointerMove)
        document.addEventListener('pointerup', onPointerUp)
    }

    const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!duration) return
        notifyInteraction()
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            seekBy(e.shiftKey ? 1 : KEYBOARD_SEEK_SECONDS, 'keyboard')
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            seekBy(e.shiftKey ? -1 : -KEYBOARD_SEEK_SECONDS, 'keyboard')
        } else if (e.key === 'Home') {
            e.preventDefault()
            seekTo(0, 'keyboard')
        } else if (e.key === 'End') {
            e.preventDefault()
            seekTo(duration, 'keyboard')
        }
    }

    const handleDoubleTapSeek = (direction: 'backward' | 'forward') => (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        notifyInteraction()
        const now = Date.now()
        const lastTap = direction === 'backward' ? leftTapAtRef.current : rightTapAtRef.current
        if (now - lastTap <= DOUBLE_TAP_MS) {
            if (direction === 'backward') {
                seekBy(-SKIP_SECONDS, 'doubleTap')
                leftTapAtRef.current = 0
            } else {
                seekBy(SKIP_SECONDS, 'doubleTap')
                rightTapAtRef.current = 0
            }
            indicateSkip(direction)
            if ('vibrate' in navigator) {
                navigator.vibrate(14)
            }
            return
        }
        if (direction === 'backward') {
            leftTapAtRef.current = now
        } else {
            rightTapAtRef.current = now
        }
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
        notifyInteraction()

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

    const toggleFullscreen = async () => {
        notifyInteraction()
        const shell = playerShellRef.current
        if (!shell) return
        if (document.fullscreenElement === shell) {
            await document.exitFullscreen()
            return
        }
        await shell.requestFullscreen()
    }

    const togglePictureInPicture = async () => {
        notifyInteraction()
        const video = videoRef.current
        if (!video || !document.pictureInPictureEnabled) return
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture()
            return
        }
        await video.requestPictureInPicture()
    }

    const handlePlayerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT') return
        if (!videoRef.current) return
        notifyInteraction()
        switch (e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault()
                togglePlayback()
                break
            case 'j':
                e.preventDefault()
                seekBy(-SKIP_SECONDS, 'keyboard')
                break
            case 'l':
                e.preventDefault()
                seekBy(SKIP_SECONDS, 'keyboard')
                break
            case 'arrowleft':
                e.preventDefault()
                seekBy(-KEYBOARD_SEEK_SECONDS, 'keyboard')
                break
            case 'arrowright':
                e.preventDefault()
                seekBy(KEYBOARD_SEEK_SECONDS, 'keyboard')
                break
            case 'm':
                e.preventDefault()
                toggleMute()
                break
            case 'f':
                e.preventDefault()
                void toggleFullscreen()
                break
            default:
                break
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
        setIsBuffering(false)
        setIsSeeking(false)
        setIsPictureInPicture(false)
        setShowControls(true)
        if (!isIOS) {
            setVolume(0.7)
            setLastVolume(0.7)
        }
    }

    return (
        <main className="min-h-screen p-2 md:p-4 max-w-content-wide mx-auto">
            <h1 className="text-3xl mb-6 font-poiret-one text-center md:text-left">Past Sets</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Video Player */}
                <div className="w-full md:w-2/3">
                    {currentVideo && (
                        <div
                            ref={playerShellRef}
                            className={`bg-gray-900 rounded-lg overflow-hidden ${isFullscreen ? 'w-full h-full flex flex-col justify-center bg-black' : ''}`}
                            onPointerMove={notifyInteraction}
                            onPointerDown={notifyInteraction}
                            onKeyDown={handlePlayerKeyDown}
                            tabIndex={0}
                            aria-label="Sets video player"
                        >
                            <div
                                className={`relative aspect-video ${showControls || !isFullscreen ? 'cursor-pointer' : 'cursor-none'}`}
                                onClick={handleVideoClick}
                                onMouseEnter={() => setIsVideoHovered(true)}
                                onMouseLeave={() => setIsVideoHovered(false)}
                            >
                                <button
                                    type="button"
                                    className="absolute inset-y-0 left-0 w-1/3 z-20 bg-transparent"
                                    aria-label={`Double tap left side to skip back ${SKIP_SECONDS} seconds`}
                                    onPointerUp={handleDoubleTapSeek('backward')}
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 w-1/3 z-20 bg-transparent"
                                    aria-label={`Double tap right side to skip forward ${SKIP_SECONDS} seconds`}
                                    onPointerUp={handleDoubleTapSeek('forward')}
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
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
                                {(isBuffering || isSeeking) && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 pointer-events-none">
                                        <div className="w-10 h-10 rounded-full border-4 border-white/50 border-t-white animate-spin" aria-label="Buffering video" />
                                    </div>
                                )}
                                {skipFeedback && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                                        <div
                                            key={skipFeedback.token}
                                            className={`px-4 py-2 rounded-full bg-black/55 text-white font-medium text-sm ${
                                                skipFeedback.direction === 'backward' ? '-translate-x-24' : 'translate-x-24'
                                            }`}
                                        >
                                            {skipFeedback.direction === 'backward' ? `-${SKIP_SECONDS}s` : `+${SKIP_SECONDS}s`}
                                        </div>
                                    </div>
                                )}
                                {/* Hover overlay: show play when paused, pause when playing */}
                                {(isVideoHovered || !isPlaying || !showControls) && (
                                    <div className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity ${isVideoHovered && isPlaying ? 'bg-black/30' : 'bg-black/0'}`}>
                                        <div className={`bg-white rounded-full transition-opacity ${isVideoHovered ? 'bg-opacity-30' : 'bg-opacity-20'} p-5 hover:bg-opacity-40`}>
                                            {isPlaying ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16">
                                                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16">
                                                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Custom controls */}
                            <div className={`p-4 bg-black/70 transition-opacity ${isFullscreen && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                <div className="relative mb-3 group">
                                    {/* Hover time tooltip */}
                                    {isProgressHovered && progressHoverTime !== null && !isDragging && (
                                        <div
                                            className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-black/90 rounded text-white text-xs whitespace-nowrap transform -translate-x-1/2"
                                            style={{ left: `${getBubbleLeftPercent(duration > 0 ? progressHoverTime / duration : 0)}%` }}
                                        >
                                            {formatTime(progressHoverTime)}
                                        </div>
                                    )}
                                    {isDragging && scrubPreviewTime !== null && scrubPreviewPos !== null && (
                                        <div
                                            className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-black rounded text-white text-xs whitespace-nowrap transform -translate-x-1/2 border border-white/20"
                                            style={{ left: `${getBubbleLeftPercent(scrubPreviewPos)}%` }}
                                        >
                                            {formatTime(scrubPreviewTime)}
                                        </div>
                                    )}
                                    <div
                                        ref={progressRef}
                                        className={`relative w-full rounded cursor-pointer transition-all touch-none ${isProgressHovered || isDragging ? 'h-3' : 'h-2'} bg-gray-700`}
                                        role="slider"
                                        tabIndex={0}
                                        aria-label="Seek video timeline"
                                        aria-valuemin={0}
                                        aria-valuemax={Math.floor(duration)}
                                        aria-valuenow={Math.floor(currentTime)}
                                        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                                        onPointerDown={handleProgressPointerDown}
                                        onMouseEnter={() => { setIsProgressHovered(true); }}
                                        onMouseMove={handleProgressMouseMove}
                                        onMouseLeave={handleProgressMouseLeave}
                                        onKeyDown={handleProgressKeyDown}
                                    >
                                        {/* Buffered segment */}
                                        <div
                                            className="absolute inset-0 rounded bg-gray-600"
                                            style={{ width: `${bufferedPercent}%` }}
                                        />
                                        {/* Progress fill */}
                                        <div
                                            className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-yellow-300 via-purple-500 to-cyan-600"
                                            style={{ width: `${progress}%` }}
                                        />
                                        {/* Thumb */}
                                        <div
                                            className={`absolute top-1/2 rounded-full bg-white shadow cursor-grab active:cursor-grabbing transition-all ${
                                                isDragging ? 'w-6 h-6 -mt-3 border-2 border-purple-400' : 'w-3.5 h-3.5 -mt-[7px]'
                                            }`}
                                            style={{ left: `calc(${progress}% - ${isDragging ? '12px' : '7px'})` }}
                                        />
                                    </div>
                                    {isFineScrubbing && (
                                        <div className="text-[11px] text-gray-300 mt-1">Fine scrubbing</div>
                                    )}
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
                                        <button
                                            onClick={() => {
                                                seekBy(-SKIP_SECONDS, 'button')
                                                indicateSkip('backward')
                                            }}
                                            className="text-white hover:text-gray-300 focus-ring rounded p-1 text-xs"
                                            aria-label={`Skip backward ${SKIP_SECONDS} seconds`}
                                        >
                                            -{SKIP_SECONDS}s
                                        </button>
                                        <button
                                            onClick={() => {
                                                seekBy(SKIP_SECONDS, 'button')
                                                indicateSkip('forward')
                                            }}
                                            className="text-white hover:text-gray-300 focus-ring rounded p-1 text-xs"
                                            aria-label={`Skip forward ${SKIP_SECONDS} seconds`}
                                        >
                                            +{SKIP_SECONDS}s
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

                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                                        <button
                                            onClick={() => void togglePictureInPicture()}
                                            className="text-white hover:text-gray-300 focus-ring rounded p-1"
                                            aria-label={isPictureInPicture ? 'Exit picture in picture' : 'Enter picture in picture'}
                                            disabled={!pipSupported}
                                        >
                                            {isPictureInPicture ? 'PiP Off' : 'PiP'}
                                        </button>
                                        <button
                                            onClick={() => void toggleFullscreen()}
                                            className="text-white hover:text-gray-300 focus-ring rounded p-1"
                                            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                        >
                                            {isFullscreen ? 'Exit Full' : 'Full'}
                                        </button>
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
                                <>
                                    <p className="text-red-400">Something went wrong loading sets.</p>
                                    <p className="sr-only">{error}</p>
                                </>
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