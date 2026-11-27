// Shrinks your photos for the web.
//   1. Put the ORIGINAL photos in a folder called images-source (next to package.json). Do not put it in public/.
//   2. Run:  node scripts/optimize-images.mjs
//   3. The small WebP files appear in public/images. Your originals are never changed.
//      Gallery photos (names starting with gallery-) also get a small tile version, for example gallery-1-thumb.webp.
// Needs sharp:  npm i -D sharp
// Optional: node scripts/optimize-images.mjs <source folder> <output folder>
import { readdir, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE = process.argv[2] || 'image-source'
const OUTPUT = process.argv[3] || 'public/images'
const QUALITY = 80
const DEFAULT_WIDTH = 1200
const THUMB = { prefix: 'gallery-', width: 640, quality: 75 } // the tile shown in the gallery grid

// Widest the picture is ever shown (in pixels) doubled for sharp phone screens. First match wins.
const WIDTHS = [
    ['hero', 600], ['profile', 600], ['class-', 900], ['student-', 240], ['parent-', 240], ['topper-', 240], ['gallery-', 1400],
]
const widthFor = (name) => WIDTHS.find(([prefix]) => name.startsWith(prefix))?.[1] ?? DEFAULT_WIDTH
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`

let files
try {
    files = (await readdir(SOURCE)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
} catch {
    console.error(`Could not find the folder "${SOURCE}". Create it and put your original photos inside.`)
    process.exit(1)
}
if (!files.length) {
    console.error(`No photos (.jpg, .png or .webp) found in "${SOURCE}".`)
    process.exit(1)
}
await mkdir(OUTPUT, { recursive: true })

let before = 0
let after = 0
for (const file of files.sort()) {
    const name = path.parse(file).name
    const input = path.join(SOURCE, file)
    const output = path.join(OUTPUT, `${name}.webp`)
    const info = await sharp(input)
        .rotate() // follow the camera's orientation, then the data is removed below
        .resize({ width: widthFor(name), withoutEnlargement: true })
        .webp({ quality: QUALITY }) // metadata (location, camera) is dropped by default
        .toFile(output)
    const original = (await stat(input)).size
    before += original
    after += info.size
    console.log(`${file.padEnd(28)} ${kb(original).padStart(8)} -> ${kb(info.size).padStart(7)}   ${info.width}x${info.height}`)

    if (name.startsWith(THUMB.prefix)) {
        const small = await sharp(input)
            .rotate()
            .resize({ width: THUMB.width, withoutEnlargement: true })
            .webp({ quality: THUMB.quality })
            .toFile(path.join(OUTPUT, `${name}-thumb.webp`))
        after += small.size
        console.log(`  + ${`${name}-thumb.webp`.padEnd(24)}            ${kb(small.size).padStart(7)}   ${small.width}x${small.height}`)
    }
}
console.log(`\n${files.length} photos: ${kb(before)} -> ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)`)
