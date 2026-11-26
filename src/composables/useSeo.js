import { watchEffect } from 'vue'

// Set VITE_SITE_URL in .env, for example https://www.your-domain.lk (no slash at the end).
const SITE = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '')

function setTag(selector, make, attr, value) {
    let el = document.head.querySelector(selector)
    if (!el) { el = make(); document.head.append(el) }
    el.setAttribute(attr, value)
}
const meta = (key, name, content) =>
    setTag(`meta[${key}="${name}"]`, () => { const m = document.createElement('meta'); m.setAttribute(key, name); return m }, 'content', content)

// Updates the browser tab title, the search description and the share tags when a page opens
// (and again when the language changes). Search engines like Google read these.
// Note: WhatsApp reads only the tags in index.html, so every link shares the home page preview.
//   useSeo(() => ({ title: 'Gallery | Name', description: '...', path: '/gallery', image: '/og-image.jpg', noindex: false }))
export function useSeo(getOptions) {
    watchEffect(() => {
        const { title, description = '', path = '/', image = '/og-image.jpg', noindex = false } = getOptions()
        const url = SITE + path
        const img = image.startsWith('http') ? image : SITE + image
        document.title = title
        meta('name', 'description', description)
        meta('name', 'robots', noindex ? 'noindex' : 'index, follow')
        meta('property', 'og:title', title)
        meta('property', 'og:description', description)
        meta('property', 'og:url', url)
        meta('property', 'og:image', img)
        if (SITE) setTag('link[rel="canonical"]', () => { const l = document.createElement('link'); l.rel = 'canonical'; return l }, 'href', url)
    })
}
