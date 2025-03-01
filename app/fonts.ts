import { Poiret_One } from 'next/font/google'

export const poiretOne = Poiret_One({
    weight: '400', // Poiret One only has regular (400), but we’ll style it bold
    subsets: ['latin'],
    variable: '--font-poiret-one',
})