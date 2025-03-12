export type VideoSet = {
    id: number
    title: string
    date: string
    src: string
    poster: string
}

export const videoSets: VideoSet[] = [
    {
        id: 1,
        title: 'MoshAvi #001',
        date: '11.08.2023',
        src: '/media/sets/MoshAvi-001.mp4',
        poster: '/media/sets/MoshAvi-001.jpg'
    },
    {
        id: 2,
        title: 'MoshAvi #002',
        date: '26.04.2024',
        src: '/media/sets/MoshAvi-002.mp4',
        poster: '/media/sets/MoshAvi-002.jpg'
    },
    {
        id: 3,
        title: 'MoshAvi #003',
        date: '18.10.2024',
        src: '/media/sets/MoshAvi-003.mp4',
        poster: '/media/sets/MoshAvi-003.jpg'
    }
]