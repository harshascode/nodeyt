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
    pl: '/pl/',
    vi: '/vi/',
    th: '/th/',
    fa: '/fa/',
    ur: '/ur/',
    bn: '/bn/',
    ta: '/ta/',
    te: '/te/',
    mr: '/mr/',
    ms: '/ms/',
    sv: '/sv/',
    no: '/no/',
    da: '/da/',
    fi: '/fi/',
    he: '/he/',
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
        if (code.startsWith('pl')) return LANGUAGE_PATHS.pl;
        if (code.startsWith('vi')) return LANGUAGE_PATHS.vi;
        if (code.startsWith('th')) return LANGUAGE_PATHS.th;
        if (code.startsWith('fa')) return LANGUAGE_PATHS.fa;
        if (code.startsWith('ur')) return LANGUAGE_PATHS.ur;
        if (code.startsWith('bn')) return LANGUAGE_PATHS.bn;
        if (code.startsWith('ta')) return LANGUAGE_PATHS.ta;
        if (code.startsWith('te')) return LANGUAGE_PATHS.te;
        if (code.startsWith('mr')) return LANGUAGE_PATHS.mr;
        if (code.startsWith('ms')) return LANGUAGE_PATHS.ms;
        if (code.startsWith('sv')) return LANGUAGE_PATHS.sv;
        if (code.startsWith('no')) return LANGUAGE_PATHS.no;
        if (code.startsWith('nb')) return LANGUAGE_PATHS.no;
        if (code.startsWith('nn')) return LANGUAGE_PATHS.no;
        if (code.startsWith('da')) return LANGUAGE_PATHS.da;
        if (code.startsWith('fi')) return LANGUAGE_PATHS.fi;
        if (code.startsWith('he')) return LANGUAGE_PATHS.he;
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

const videoUrlInput = document.getElementById('videoUrl');
videoUrlInput.addEventListener('input', hideValidationError);
videoUrlInput.addEventListener('focus', hideValidationError);

// 1. Handle the MP3/MP4 Toggle
const formatButtons = document.querySelectorAll('.format-btn');

formatButtons.forEach(button => {
    button.addEventListener('click', function () {
        formatButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});

const SEARCH_API = 'https://hono-search-node.vercel.app/api/search';
const OUTAGE_REDIRECT_URL = 'https://cnvmp3.com/';
let currentVideoUrl = '';
let outageRedirectTimer = null;
let outageCountdownTimer = null;

function extractVideoQuery(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';

    let normalized = raw;
    if (!/^(https?:)?\/\//i.test(normalized)) {
        if (/^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com)\//i.test(normalized)) {
            normalized = `https://${normalized}`;
        } else {
            return '';
        }
    }

    try {
        const url = new URL(normalized);
        const host = url.hostname.toLowerCase();

        if (!(host === 'youtu.be' || host.endsWith('.youtu.be') || host.includes('youtube.com'))) {
            return '';
        }

        if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
            return url.pathname.split('/').filter(Boolean)[0] || '';
        }

        if (url.pathname === '/watch' && url.searchParams.has('v')) {
            return url.searchParams.get('v') || '';
        }

        const shortsMatch = url.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/);
        if (shortsMatch) {
            return shortsMatch[2] || '';
        }
    } catch (error) {
        return '';
    }

    return '';
}

function setLoading(message) {
    hideValidationError();
    document.getElementById('inputContainer').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'flex';
    document.getElementById('spinner').style.display = 'block';
    document.getElementById('status').innerText = message;
}

function ensureValidationErrorElement() {
    let errorEl = document.getElementById('formError');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'formError';
        errorEl.className = 'form__error--message';
        errorEl.setAttribute('role', 'alert');
        errorEl.style.display = 'none';
        const inputContainer = document.getElementById('inputContainer');
        inputContainer.parentNode.insertBefore(errorEl, inputContainer.nextSibling);
    }
    return errorEl;
}

function showValidationError(message) {
    const errorEl = ensureValidationErrorElement();
    errorEl.innerText = message;
    errorEl.style.display = 'block';
}

function hideValidationError() {
    const errorEl = document.getElementById('formError');
    if (errorEl) errorEl.style.display = 'none';
}

function closeOutagePopup() {
    if (outageRedirectTimer) {
        clearTimeout(outageRedirectTimer);
        outageRedirectTimer = null;
    }
    if (outageCountdownTimer) {
        clearInterval(outageCountdownTimer);
        outageCountdownTimer = null;
    }

    const overlay = document.getElementById('outageOverlay');
    if (overlay) overlay.remove();
}

function showOutagePopup() {
    let overlay = document.getElementById('outageOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'outageOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;box-sizing:border-box;';
        overlay.innerHTML = '<div style="position:relative;background:#fff;max-width:420px;width:100%;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:Arial,sans-serif;text-align:center;"><button type="button" aria-label="Close popup" id="outageCloseBtn" style="position:absolute;top:10px;right:10px;border:none;background:transparent;font-size:24px;line-height:1;color:#7a7a7a;cursor:pointer;padding:4px;">×</button><h2 style="margin:0 0 12px;color:#121212;">Website currently unavailable</h2><p id="outageMessage" style="margin:0 0 8px;color:#4b4b4b;line-height:1.5;">Redirecting you to cnvmp3.com in 5 seconds...</p><p style="margin:0;color:#7a7a7a;font-size:13px;">Please wait while we move you to the working download page.</p></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('#outageCloseBtn').addEventListener('click', closeOutagePopup);
    }
    return overlay;
}

function startOutageRedirect() {
    if (outageRedirectTimer || outageCountdownTimer) return;

    const overlay = showOutagePopup();
    const message = overlay.querySelector('#outageMessage');
    let seconds = 5;
    message.innerText = `Redirecting you to cnvmp3.com in ${seconds} seconds...`;

    outageCountdownTimer = window.setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
            closeOutagePopup();
            window.location.href = OUTAGE_REDIRECT_URL;
            return;
        }
        message.innerText = `Redirecting you to cnvmp3.com in ${seconds} seconds...`;
    }, 1000);

    outageRedirectTimer = window.setTimeout(() => {
        closeOutagePopup();
        window.location.href = OUTAGE_REDIRECT_URL;
    }, 5000);
}

function setDownloadButtons() {
    const mainBtn = document.getElementById('downloadBtn');
    mainBtn.disabled = false;
    mainBtn.style.opacity = '1';
    mainBtn.style.cursor = 'pointer';
    mainBtn.type = 'button';
    mainBtn.innerText = 'Download';
    mainBtn.onclick = startOutageRedirect;

    document.getElementById('formatToggle').style.display = 'none';
    document.getElementById('downloadMoreBtn').style.display = 'block';
}

function showError(message) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('inputContainer').style.display = 'block';
    showValidationError(message);
    const mainBtn = document.getElementById('downloadBtn');
    mainBtn.disabled = false;
    mainBtn.style.opacity = '1';
    mainBtn.style.cursor = 'pointer';
}

// 2. Form Submission Handler
async function handleFormSubmit() {
    const urlInput = document.getElementById('videoUrl').value.trim();
    if (!urlInput) {
        showError('Please enter a YouTube video URL.');
        return;
    }

    const query = extractVideoQuery(urlInput);
    if (!query) {
        showError('Please enter a valid YouTube video URL.');
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
    startOutageRedirect();
}

function triggerAudioDownload(urlInput) {
    startOutageRedirect();
}
