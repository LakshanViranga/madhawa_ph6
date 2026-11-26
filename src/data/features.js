// Switches for parts of the site that are not ready yet.
export const features = {
    // false: every /lms address shows the "Coming soon" page and student login buttons carry a "Soon" tag.
    // true: the real student login, quiz and progress pages open. (Also change the routes in your router, see router.example.js.)
    studentPortal: true,
    // Optional. For example 'January 2027'. Can be { en: '...', si: '...', ta: '...' }. Leave empty to show a general message.
    portalOpening: '',
}
