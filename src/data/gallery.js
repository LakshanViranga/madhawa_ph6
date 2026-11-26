// Gallery photos. Put the files in public/images/ and edit this list.
// album must be one of `albums` below. alt describes the photo for screen readers (and search engines).
export const albums = ['classes', 'results', 'events'] // labels come from gallery.<name> in the language files

export const photos = [
    { src: '/images/gallery-1.webp', album: 'classes', alt: 'Students listening during a mechanics lesson', caption: 'Mechanics theory class' },
    { src: '/images/gallery-2.webp', album: 'classes', alt: 'The tutor explaining a diagram on the board', caption: '' },
    { src: '/images/gallery-3.webp', album: 'classes', alt: 'Students working through past paper questions', caption: 'Past paper practice' },
    { src: '/images/gallery-4.webp', album: 'classes', alt: 'A small group discussing a problem together', caption: '' },
    { src: '/images/gallery-5.webp', album: 'classes', alt: 'Revision class before the A/L exam', caption: 'Revision class' },
    { src: '/images/gallery-6.webp', album: 'classes', alt: 'Weekly quiz in progress', caption: 'Weekly quiz' },
    { src: '/images/gallery-7.webp', album: 'results', alt: 'Students holding their A/L result certificates', caption: 'A/L results day' },
    { src: '/images/gallery-8.webp', album: 'results', alt: 'Top students with the tutor', caption: '' },
    { src: '/images/gallery-9.webp', album: 'results', alt: 'Prize giving ceremony', caption: 'Prize giving' },
    { src: '/images/gallery-10.webp', album: 'events', alt: 'Students on a science field visit', caption: 'Field visit' },
    { src: '/images/gallery-11.webp', album: 'events', alt: 'New batch orientation day', caption: 'New batch orientation' },
    { src: '/images/gallery-12.jpg', album: 'events', alt: 'End of year class gathering', caption: '' },
]

// The small tile that goes with a photo. If gallery-1.jpg is the big photo, the tile is gallery-1-thumb.webp
// (made by scripts/optimize-images.mjs). Tiles load fast; the big photo loads only when someone opens it.
export const thumb = (src) => src.replace(/\.(webp|jpe?g|png)$/i, '-thumb.webp')

// Use as @error="thumbFallback($event, photo.src)". If the tile file is missing it shows the big photo instead,
// and if that is missing too it hides the broken image (the grey label shows).
export function thumbFallback(event, src) {
    const img = event.target
    if (img.dataset.full) { img.style.display = 'none'; return }
    img.dataset.full = '1'
    img.src = src
}

// The small strip shown on the home page
export const featured = photos.slice(0, 6)
