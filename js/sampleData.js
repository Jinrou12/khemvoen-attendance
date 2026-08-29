// Default dataset: 15 Classes, 7 Monks/Students per class = 105 total
const DEFAULT_CLASSES = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `ថ្នាក់ទី ${toKhmerNum(i + 1)}`,
    room: `បន្ទប់ ${toKhmerNum(i + 1)}`,
    monksCount: 7
}));

function toKhmerNum(num) {
    if (num === null || num === undefined) return '';
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(d => khmerDigits[parseInt(d)] !== undefined ? khmerDigits[parseInt(d)] : d).join('');
}

const FIRST_NAMES = [
    'សុវណ្ណ', 'ជិនបុត្រ', 'ចន្ទមោលី', 'ធម្មរក្ខិត', 'សិរិមង្គល', 
    'ញាណវង្ស', 'ធម្មវង្ស', 'បុញ្ញកុសល', 'ខេមរៈ', 'មហានាគ',
    'ពុទ្ធិស័ក្តិ', 'សក្យបុត្រ', 'ធម្មរតនៈ', 'សិរីវឌ្ឍនៈ', 'វជិរញាណ'
];

const LAST_NAMES = [
    'រតនៈ', 'មុនី', 'ចេស្ដា', 'វឌ្ឍនៈ', 'បុញ្ញោ',
    'ញាណ', 'កុសល', 'ធម៌', 'សក្ដិ', 'វង្ស',
    'សោភ័ណ', 'វិរិយៈ', 'មេត្តា', 'បញ្ញា', 'មង្គល'
];

const TITLES = ['ភិក្ខុ', 'សាមណេរ', 'សាមណេរ', 'សាមណេរ', 'សាមណេរ', 'សិស្ស', 'សិស្ស'];

function generateInitialStudents() {
    const students = [];
    let idCounter = 1;

    for (let c = 1; c <= 15; c++) {
        for (let s = 1; s <= 7; s++) {
            const title = TITLES[(s - 1) % TITLES.length];
            const firstName = FIRST_NAMES[(c * 3 + s) % FIRST_NAMES.length];
            const lastName = LAST_NAMES[(c * 2 + s * 5) % LAST_NAMES.length];
            students.push({
                id: `S${String(idCounter).padStart(3, '0')}`,
                classId: c,
                number: s,
                title: title,
                name: `${title} ${firstName}${lastName}`,
                phone: `09${(c % 9) + 1} ${(100 + s * 12).toString()} ${(200 + c * 34).toString()}`,
                note: ''
            });
            idCounter++;
        }
    }
    return students;
}

function getStoredData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
        console.error('LocalStorage read error:', e);
        return fallback;
    }
}

function setStoredData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('LocalStorage write error:', e);
    }
}
