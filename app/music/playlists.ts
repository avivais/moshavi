// The minimal data structure for playlists
export type PlaylistEntry = {
    month: number // 1-12 for Jan-Dec
    year: number
    embedId: string
}

// Helper function to get month name
export const getMonthName = (month: number): string => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
}

// The only data you need to add manually - just month number, year, and embedId
export const playlistEntries: PlaylistEntry[] = [
    { month: 8, year: 2023, embedId: 'PLeRFN0o7R_lMQweVPurLaTWWiMDusLB2L' },
    { month: 9, year: 2023, embedId: 'PLeRFN0o7R_lPvVh-7XusF34LHC8hf02K9' },
    { month: 10, year: 2023, embedId: 'PLeRFN0o7R_lO1-_bf8Wn2ml7ArTx4PU3v' },
    { month: 11, year: 2023, embedId: 'PLeRFN0o7R_lOMvegW89KLEZtjbHkb4HUT' },
    { month: 12, year: 2023, embedId: 'PLeRFN0o7R_lNRXBNV2GbG9ZzVZpv9_MYl' },
    { month: 1, year: 2024, embedId: 'PLeRFN0o7R_lN_dvZNR_-nTF3EEROjTcwd' },
    { month: 2, year: 2024, embedId: 'PLeRFN0o7R_lPIc9z0gvszJK5vm4x6X3cA' },
    { month: 3, year: 2024, embedId: 'PLeRFN0o7R_lOMUr1tDy5k228mEbHbjSBK' },
    { month: 4, year: 2024, embedId: 'PLeRFN0o7R_lMXeX6OaWh9i3TwTXsaV8Qy' },
    { month: 5, year: 2024, embedId: 'PLeRFN0o7R_lNVQtqdXPQAUrzlgmt3g_e7' },
    { month: 6, year: 2024, embedId: 'PLeRFN0o7R_lOTpSY0mPr4WpYGrO7cjzS' },
    { month: 7, year: 2024, embedId: 'PLeRFN0o7R_lMV-8vmHGLURXsS0YDUE-qB' },
    { month: 8, year: 2024, embedId: 'PLeRFN0o7R_lPxmcka1HPl6tDW2uJyeWWB' },
    { month: 9, year: 2024, embedId: 'PLeRFN0o7R_lPQ2VULu8xJR7Kvau6LIUTq' },
    { month: 10, year: 2024, embedId: 'PLeRFN0o7R_lMsP9Lqoc9UnZDpfhuNam-3' },
    { month: 11, year: 2024, embedId: 'PLeRFN0o7R_lMxh6N0-4FvIkK2BZLEr50H' },
    { month: 12, year: 2024, embedId: 'PLeRFN0o7R_lOoy-nkYlpmS4yaxxJ-c_CH' },
    { month: 1, year: 2025, embedId: 'PLeRFN0o7R_lNO5VUdHDDSiU6gAr-bhmum' },
    { month: 2, year: 2025, embedId: 'PLeRFN0o7R_lOwAZLh3Kvg59DyhfDRS251' },

]

// Full playlist type used by the component
export type Playlist = {
    id: number
    month: string
    year: number
    embedId: string
}

// Transform the minimal entries into the full playlist objects
export const playlists: Playlist[] = playlistEntries.map((entry, index) => ({
    id: index + 1,
    month: getMonthName(entry.month),
    year: entry.year,
    embedId: entry.embedId,
}))