// News for parents and students. The newest pinned one that has not expired shows as a banner on the home page.
// type: 'batch', 'notice' or 'holiday'. date: 'YYYY-MM-DD'. expires: the last day it counts as current (or leave it out).
// SAMPLE entries: replace them with your real announcements.
export const announcements = [
    { id: 'a3', type: 'batch', pinned: true, date: '2026-10-10', expires: '2026-12-31', title: 'New A/L 2029 theory batch starts in January', body: 'Registration is open. Send a request from the form below or message us on WhatsApp to reserve a place.', imageAttached: false, image: '', alt: '2029 Theory class' },
    { id: 'a2', type: 'notice', pinned: true, date: '2026-10-15', expires: '2026-11-30', title: 'A/L 2027 Revision Class Plan', body: 'Full Test paper will held on below days', imageAttached: true, image: '/images/announcement-oct-revision.webp', alt: '2027 Revision Class Plan' },
    { id: 'a1', type: 'notice', pinned: true, date: '2026-09-28', expires: '2026-12-31',title: 'A/L 2028 Theory Class Plan', body: 'Below lessons cover on upcoming weeks', imageAttached: true, image: '/images/announcement-oct.webp', alt: '2028 Theory Class Plan' },
]

export const isActive = (a) => !a.expires || Date.parse(`${a.expires}T23:59:59`) >= Date.now()
export const newestFirst = (a, b) => b.date.localeCompare(a.date)
