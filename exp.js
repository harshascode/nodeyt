const { execFile } = require('child_process');

/**
 * Extracts a direct YouTube streaming link specifically signed for a user's IP.
 * 
 * @param {string} videoUrl - The standard YouTube video URL
 * @param {string} userIp - The client's IPv4 or IPv6 address
 * @returns {Promise<string>} - Resolves with the direct .googlevideo.com URL
 */
function getStreamingLink(videoUrl, userIp) {
    return new Promise((resolve, reject) => {
        // Define the yt-dlp arguments
        const args = [
            // 1. Get the direct URL instead of downloading the video
            '--get-url',

            // 2. Force a combined stream (Video + Audio in one link, max 720p). 
            // This is required so the link is instantly playable in a standard browser tab.
            '-f', 'best[ext=mp4]',

            // 3. The X-Forwarded-For trick: Tell YouTube the request is "from" the user's IP
            '--xff', `${userIp}/32`,

            // 4. The Portable Client trick: Emulate clients that get less strict IP locks.
            // Emulating 'ios' and 'tv' clients often bypasses standard web IP restrictions.
            '--extractor-args', 'youtube:player_client=ios,tv,default',

            // 5. Force the server to use its IPv6 connection (prevents IPv4 resolution timeouts)
            // '--force-ipv6',

            // 6. The target video URL
            videoUrl
        ];

        // Execute yt-dlp using execFile (safer than exec, prevents shell injection)
        execFile('yt-dlp', args, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
            }

            // The direct URL is returned in stdout. Trim whitespace and newlines.
            const directUrl = stdout.trim();

            // Validate that we actually got a streaming link back
            if (!directUrl || !directUrl.includes('googlevideo.com')) {
                return reject(new Error('Failed to retrieve a valid googlevideo.com link.'));
            }

            resolve(directUrl);
        });
    });
}

// === Example Implementation ===
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=mXkHB4z5T0Y'; // Replace with dynamic user input
const USER_IP = '38.224.125.229'; // Replace with the actual IP extracted from your backend request (e.g., req.ip)

getStreamingLink(YOUTUBE_URL, USER_IP)
    .then(link => {
        console.log("Success! Send this link to the user's browser:");
        console.log(link);
    })
    .catch(err => {
        console.error("Extraction failed:", err.message);
    });