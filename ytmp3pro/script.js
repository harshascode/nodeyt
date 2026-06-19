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
