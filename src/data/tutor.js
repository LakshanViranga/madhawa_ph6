// The tutor's details. Header, footer, contact section and every page read from here.
export const tutor = {
    name: 'Ravishka Amarasekare',
    tagline: 'A/L Physics classes Sri Lanka | Physical and Online Both | Sinhala Medium',
    whatsapp: '+94740593882', // country code and number, no + or spaces
    phone: '074 059 3882',
    address: '', // REPLACE with your class address. Leave empty to hide it.
    hours: '', // for example 'Saturday and Sunday, 8.00 am to 6.00 pm'. Leave empty to hide it.
    mapQuery: 'Victory College - Embilipitiya', // REPLACE with the address as you would type it in Google Maps. Leave empty to hide the map.
    // Only the ones with a link are shown in the footer.
    socials: [
        { key: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/Ravishkadamarasekara' }, // for example 'https://www.facebook.com/your-page'
        { key: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/@ravishkadphysics' }, // for example 'https://www.youtube.com/@your-channel'
        { key: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/@ravishka.dilshan90' }, // for example 'https://www.tiktok.com/@your-name'
        { key: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/raviz_amarasekara' },
    ],
}

// Shown at the bottom of every public page. Add the developer's website to url to make the name a link.
export const credit = { name: 'NextBe Digital', url: 'https://www.facebook.com/nexbedigitalsl' }

// A WhatsApp link, optionally with a ready-written message
export const waLink = (text = '') => `https://wa.me/${tutor.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
