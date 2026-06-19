const LANGUAGE_PATHS = {
    en: '/',
    hi: '/hi/',
    fr: '/fr/',
    es: '/es/',
    de: '/de/',
    pt: '/pt/',
    ru: '/ru/',
    ja: '/ja/',
    ko: '/ko/',
    zh: '/zh/',
    ar: '/ar/',
    it: '/it/',
    tr: '/tr/',
    nl: '/nl/',
    id: '/id/',
};

function getSavedLanguagePath() {
    try {
        return localStorage.getItem('ytmp3-lang') || '';
    } catch (error) {
        return '';
    }
}

function detectBrowserLanguagePath() {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];

    for (const lang of langs) {
        const code = String(lang || '').toLowerCase();
        if (code.startsWith('hi')) return LANGUAGE_PATHS.hi;
        if (code.startsWith('fr')) return LANGUAGE_PATHS.fr;
        if (code.startsWith('es')) return LANGUAGE_PATHS.es;
        if (code.startsWith('de')) return LANGUAGE_PATHS.de;
        if (code.startsWith('pt')) return LANGUAGE_PATHS.pt;
        if (code.startsWith('ru')) return LANGUAGE_PATHS.ru;
        if (code.startsWith('ja')) return LANGUAGE_PATHS.ja;
        if (code.startsWith('ko')) return LANGUAGE_PATHS.ko;
        if (code.startsWith('zh')) return LANGUAGE_PATHS.zh;
        if (code.startsWith('ar')) return LANGUAGE_PATHS.ar;
        if (code.startsWith('it')) return LANGUAGE_PATHS.it;
        if (code.startsWith('tr')) return LANGUAGE_PATHS.tr;
        if (code.startsWith('nl')) return LANGUAGE_PATHS.nl;
        if (code.startsWith('id')) return LANGUAGE_PATHS.id;
        if (code.startsWith('en')) return LANGUAGE_PATHS.en;
    }

    return '';
}

function autoRedirectLanguage() {
    const pathname = window.location.pathname;
    if (pathname !== '/' && pathname !== '/index.html') return;

    const saved = getSavedLanguagePath();
    const preferred = saved || detectBrowserLanguagePath();
    if (preferred && preferred !== '/') {
        try {
            localStorage.setItem('ytmp3-lang', preferred);
        } catch (error) {}
        window.location.replace(preferred);
    }
}

autoRedirectLanguage();

// 1. Handle the MP3/MP4 Toggle
const formatButtons = document.querySelectorAll('.format-btn');

formatButtons.forEach(button => {
    button.addEventListener('click', function () {
        formatButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});

const SEARCH_API = 'https://hono-search-api.harshascode.deno.net/api/search';
let currentVideoUrl = '';

function extractVideoQuery(input) {
    try {
        const url = new URL(input);

        if (url.hostname.includes('youtu.be')) {
            return url.pathname.split('/').filter(Boolean)[0] || '';
        }

        if (url.searchParams.has('v')) {
            return url.searchParams.get('v');
        }

        const shortsMatch = url.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/);
        if (shortsMatch) {
            return shortsMatch[2];
        }
    } catch (error) {
        // User may paste only the video id/search query.
    }

    return input.replace(/^.*(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)/, '').split(/[?&#]/)[0].trim();
}

function setLoading(message) {
    document.getElementById('inputContainer').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'flex';
    document.getElementById('spinner').style.display = 'block';
    document.getElementById('status').innerText = message;
}

function setDownloadButtons() {
    const mainBtn = document.getElementById('downloadBtn');
    mainBtn.disabled = false;
    mainBtn.style.opacity = '1';
    mainBtn.style.cursor = 'pointer';
    mainBtn.type = 'button';
    mainBtn.innerText = 'Download MP3';
    mainBtn.onclick = () => triggerAudioDownload(currentVideoUrl);

    document.getElementById('formatToggle').style.display = 'none';
    document.getElementById('downloadMoreBtn').style.display = 'block';
}

function showError(message) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('status').innerText = message;
    const mainBtn = document.getElementById('downloadBtn');
    mainBtn.disabled = false;
    mainBtn.style.opacity = '1';
    mainBtn.style.cursor = 'pointer';
}

// 2. Form Submission Handler
async function handleFormSubmit() {
    const urlInput = document.getElementById('videoUrl').value.trim();
    if (!urlInput) return;

    const query = extractVideoQuery(urlInput);
    if (!query) {
        showError('Please enter a valid YouTube video link.');
        return;
    }

    currentVideoUrl = /^https?:\/\//i.test(urlInput) ? urlInput : `https://www.youtube.com/watch?v=${query}`;
    const mainBtn = document.getElementById('downloadBtn');
    mainBtn.disabled = true;
    mainBtn.style.opacity = '0.4';
    mainBtn.style.cursor = 'not-allowed';

    setLoading('Fetching video details...');

    try {
        const response = await fetch(`${SEARCH_API}?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search request failed');

        const results = await response.json();
        const video = Array.isArray(results) ? results[0] : null;
        if (!video) throw new Error('No video found');

        const thumbnail = (video.thumbnails || []).sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        document.getElementById('videoThumbnail').src = thumbnail ? thumbnail.url : '';
        document.getElementById('videoTitle').innerText = video.title || 'Untitled video';
        document.getElementById('videoAuthor').innerText = video.author ? `By ${video.author}` : '';
        document.getElementById('videoDuration').innerText = video.duration ? `Duration: ${video.duration}` : '';

        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('videoPreview').style.display = 'flex';
        setDownloadButtons();
    } catch (error) {
        showError('Could not load video details. Please check the link and try again.');
    }
}

// 3. Download Functions
function triggerVideoDownload(urlInput) {
    const apiUrl = `https://apiapi.ytmp3.pro/api/download?url=${encodeURIComponent(urlInput)}`;
    window.location.href = apiUrl;
}

function triggerAudioDownload(urlInput) {
    const apiUrl = `https://apiapi.ytmp3.pro/api/download?url=${encodeURIComponent(urlInput)}`;
    window.location.href = apiUrl;
}
