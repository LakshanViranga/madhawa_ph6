// SAMPLE details. Replace every one with your real information before the site goes live.
// Any text can be written as { en: '...', si: '...', ta: '...' } to translate it. A plain string shows in every language.
// mode: 'physical' (in person), 'online' or 'both'.
// The card shows title, note, day, medium and mode. "More info" also shows about, topics, includes and audience.
export const classes = [
    {
        id: 'al27', title: 'A/L 2027 Theory', medium: 'Sinhala', day: 'Sat/Sun, 8.00am - 12.00pm', mode: 'Victor College - Embilipitiya', img: '/images/20-theory.webp',
        note: 'Full syllabus, weekly quiz, printed notes.',
        about: 'A complete A/L Physics course for the 2027 exam. Every topic is taught the same way: the idea first, then the equation, then exam-style questions.',
        topics: ['Mechanics', 'Oscillations and waves', 'Thermal physics', 'Electricity and magnetism', 'Electronics', 'Matter and radiation'],
        includes: ['Weekly quiz with marks and progress', 'Printed notes for every topic', 'Past paper practice', 'A discussion video for every quiz'],
        audience: 'Students who will sit the A/L exam in 2027.',
    },
    {
        id: 'al27r', title: 'A/L 2027 Revision and Paper Class', medium: 'Sinhala', day: 'Fri, 8.00am - 5.00pm', mode: 'Victor College - Embilipitiya', img: '/images/revision.webp',
        note: 'Past papers and model papers, topic by topic.',
        about: 'A focused revision class for students who have finished the syllabus and want to sharpen their exam technique.',
        topics: ['Topic-wise past paper discussion', 'Model papers under exam time', 'Common mistakes and how to avoid them', 'Quick revision of key formulas'],
        includes: ['Weekly quiz with marks and progress', 'Model papers with discussion', 'Online option for students who cannot travel'],
        audience: 'Students who will sit the A/L exam in 2027.',
    },
    {
        id: 'al27on', title: '2027 Zero to Hero Revision', medium: 'Sinhala', day: 'Sun, 7.00pm - 10.00pm', mode: 'Online (Zoom)', img: '/images/zero.webp',
        note: 'Physics section of O/L Science, from the basics.',
        about: 'The physics part of O/L Science explained step by step, starting from the basics, so students build confidence early.',
        topics: ['Motion and forces', 'Work, energy and power', 'Light', 'Heat', 'Electricity'],
        includes: ['Weekly quiz with marks and progress', 'Printed notes', 'Practice questions in the O/L style'],
        audience: 'Students preparing for the O/L exam.',
    },
    {
        id: 'al28', title: 'A/L 2028 Theory', medium: 'Sinhala', day: 'Sat/Sun, 1.00pm - 5.00pm', mode: 'Victor College - Embilipitiya', img: '/images/2028-theory.webp',
        note: 'Full syllabus, weekly quiz, printed notes.',
        about: 'A complete A/L Physics course for the 2027 exam. Every topic is taught the same way: the idea first, then the equation, then exam-style questions.',
        topics: ['Mechanics', 'Oscillations and waves', 'Thermal physics', 'Electricity and magnetism', 'Electronics', 'Matter and radiation'],
        includes: ['Weekly quiz with marks and progress', 'Printed notes for every topic', 'Past paper practice', 'A discussion video for every quiz'],
        audience: 'Students who will sit the A/L exam in 2028.',
    },
]

// Weekly timetable. classId links a row to its class, so "More info" can show that class's times.
// where: 'physical', 'online' or 'both'. Keep it in day order.
export const timetable = [
    { classId: 'al27', day: 'Saturday/Sunday', time: '8.00 am to 12.00 pm', class: '2027 A/L Theory', where: 'Victory College - Embilipitiya' },
    { classId: 'al27r', day: 'Friday', time: '8.00 am to 5.00 pm', class: 'A/L 2027 Revision and Paper Class', where: 'Victory College - Embilipitiya' },
    { classId: 'al27on', day: 'Sunday', time: '7.00 pm to 10.00 pm', class: '2027 Zero to Hero Revision', where: 'Online - Zoom' },
    { classId: 'al28', day: 'Saturday/Sunday', time: '1.00 pm to 5.00 pm', class: 'A/L 2028 Theory', where: 'Victory College - Embilipitiya' },
]
