// src/data/locations.js
// One entry per physical class venue. Replace the sample values with your real ones.
// In src/data/classes.js, add `venue: 'colombo'` (an id from below) to each timetable row
// held at a venue, so the schedule can be filtered by location.
export const locations = [
    {
        id: 'pelmadulla',
        name: 'Pelmadulla',
        place: 'Institute name, street',
        address: 'Full address here',
        days: 'Sat, Sun',
        mapQuery: 'Institute name, Colombo',
        phone: '',
    },
    {
        id: 'balangoda',
        name: 'Balangoda',
        place: 'Institute name, street',
        address: 'Full address here',
        days: 'Wed, Fri',
        mapQuery: 'Institute name, Negombo',
        phone: '',
    },
    {
        id: 'rathnapura',
        name: 'Rathnapura',
        place: 'Institute name, street',
        address: 'Full address here',
        days: 'Sun',
        mapQuery: 'Institute name, Kandy',
        phone: '',
    },
]
