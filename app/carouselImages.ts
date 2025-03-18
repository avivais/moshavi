// Define the type for each image object
export interface CarouselImage {
    src: string;
    alt: string;
    width: number;
    height: number;
  }

  export const carouselImages: CarouselImage[] = [
    {
      src: '/media/carousel/party-pic-1.jpg',
      alt: 'Party Pic 1',
      width: 1200,
      height: 800,
    },
    {
      src: '/media/carousel/party-pic-2.jpg',
      alt: 'Party Pic 2',
      width: 1200,
      height: 800,
    },
    {
      src: '/media/carousel/party-pic-3.jpg',
      alt: 'Party Pic 3',
      width: 1200,
      height: 800,
    },
    {
      src: '/media/carousel/party-pic-4.jpg',
      alt: 'Party Pic 4',
      width: 1200,
      height: 800,
    },
  ];