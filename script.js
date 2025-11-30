const getBaseUrl = () => {
    if (window.location.origin.includes('github.io')) {
        let pathname = window.location.pathname;
        pathname = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
        if (pathname && pathname !== '/') {
            return `${window.location.origin}${pathname}/learnings/`;
        }
        return `${window.location.origin}/ari-learns/learnings/`;
    }
    return './learnings/';
};
const RAW_GITHUB_URL = "https://raw.githubusercontent.com/arihara-sudhan/learn-with-ari/refs/heads/main/learnings/";

const getImageBaseUrl = () => {
    if (window.location.origin.includes('github.io')) {
        const pathParts = window.location.pathname.split('/');
        const basePath = pathParts.slice(0, -1).join('/') || '';
        return `${window.location.origin}${basePath}/images/`;
    }
    return './images/';
};
let activeButton = null;
const contentCache = new Map();
let navigationItems = []; // Store navigation items from navigation.json
const DATE_REGEX = /(-+\s*\[(\d{2}\/\d{2}\/\d{4})\])/g;
const SOURCE_REGEX = /^SOURCE:\s*(.+?)(?:\r?\n|$)/m;
const DASH_LINE_REGEX = /^[- ]+$/;
const SOURCE_LINE_REGEX = /^SOURCE:/i;
const IMG_URL_REGEX = /^IMG_URL\s*@?\s*(.+)$/i;
// Matches: --BEGIN--DATE--TOPIC-- or --BEGIN--TOPIC--DATE (e.g., --BEGIN--23/11/2025--CRISPR-- or --BEGIN--NLP--12/04/2025)
// Updated to allow spaces in topic names (e.g., "TIME COMPLEXITY")
const SNIPPET_BEGIN_REGEX = /--BEGIN--(?:(\d{2}\/\d{2}\/\d{4})--([^--]+)--|([^--]+)--(\d{2}\/\d{2}\/\d{4}))/g;
const SNIPPET_END_REGEX = /--END--/g;
const CAROUSEL_BEGIN_REGEX = /^--CAROUSEL--$/i;
const CAROUSEL_END_REGEX = /^--CAROUSEL--$/i;
const EMBED_GIT_REGEX = /^--EMBED-GIT--$/i;
const VALID_COLOR_NAMES = ['pink', 'yellow', 'blue', 'green', 'red', 'orange', 'purple', 'cyan', 'gray', 'grey', 'white', 'black', 'lightblue', 'lightgreen', 'lightyellow', 'lightpink', 'lightcyan', 'lightgray', 'lightgrey', 'darkblue', 'darkgreen', 'darkred', 'darkorange', 'darkpurple', 'brown', 'gold', 'silver', 'magenta', 'lime', 'aqua', 'navy', 'teal', 'maroon', 'olive', 'coral', 'salmon', 'violet', 'indigo', 'turquoise', 'tan', 'beige', 'khaki', 'plum', 'orchid', 'crimson', 'azure'];
const BRACKET_COLOR_REGEX = new RegExp(`\\[(${VALID_COLOR_NAMES.join('|')})\\](.*?)\\[/\\1\\]`, 'gis');

function colorizeText(text) {
    // First, escape all angle brackets in the original text (for code syntax)
    let processed = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Then process color tags - unescape the brackets inside color tags and create HTML spans
    BRACKET_COLOR_REGEX.lastIndex = 0;
    processed = processed.replace(BRACKET_COLOR_REGEX, (match, colorName, innerText) => {
        // Unescape the inner text (it was escaped above, but we want it as-is inside the span)
        const unescapedInnerText = innerText.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        // Re-escape only for HTML safety
        const escapedInnerText = unescapedInnerText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<span style="color:${colorName.toLowerCase()}">${escapedInnerText}</span>`;
    });
    
    return processed;
}

function processCarousel(images, fileName, carouselId) {
    if (!images || images.length === 0) return '';
    
    const imageBaseUrl = getImageBaseUrl();
    
    let carouselHTML = `<div class="carousel-container" id="${carouselId}"><div class="carousel-wrapper">`;
    
    images.forEach((img, index) => {
        const trimmedImg = img.trim();
        if (!trimmedImg) return;
        
        let url = trimmedImg;
        if (!/^https?:\/\//.test(trimmedImg) && !trimmedImg.includes('/')) {
            url = `${imageBaseUrl}${fileName}/${trimmedImg}`;
        }
        
        const activeClass = index === 0 ? 'active' : '';
        carouselHTML += `<div class="carousel-slide ${activeClass}"><img src="${url}" loading="lazy" alt="Carousel image ${index + 1}" /></div>`;
    });
    
    carouselHTML += `</div><button class="carousel-btn carousel-btn-prev" onclick="carouselPrev('${carouselId}')">‹</button><button class="carousel-btn carousel-btn-next" onclick="carouselNext('${carouselId}')">›</button></div>`;
    
    return carouselHTML;
}

async function processContentLines(lines, fileName) {
    const result = [];
    let inCarousel = false;
    let carouselImages = [];
    let carouselId = null;
    let waitingForEmbedUrl = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const isCarouselBegin = CAROUSEL_BEGIN_REGEX.test(trimmedLine);
        const isCarouselEnd = CAROUSEL_END_REGEX.test(trimmedLine);
        const isEmbedGit = EMBED_GIT_REGEX.test(trimmedLine);
        
        if (isCarouselBegin && !inCarousel) {
            inCarousel = true;
            carouselImages = [];
            carouselId = `carousel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        } else if (isCarouselEnd && inCarousel) {
            inCarousel = false;
            if (carouselImages.length > 0) {
                result.push(processCarousel(carouselImages, fileName, carouselId));
            }
            carouselImages = [];
            carouselId = null;
        } else if (inCarousel) {
            if (trimmedLine) {
                carouselImages.push(trimmedLine);
            }
        } else if (isEmbedGit) {
            waitingForEmbedUrl = true;
        } else if (waitingForEmbedUrl) {
            // Next line after --EMBED-GIT-- should be the URL
            if (trimmedLine && /^https?:\/\//.test(trimmedLine)) {
                const codeHtml = await fetchAndEmbedCode(trimmedLine);
                result.push(codeHtml);
                waitingForEmbedUrl = false;
            } else {
                // Invalid URL, skip
                waitingForEmbedUrl = false;
            }
        } else {
            // Regular content processing
            // Check if line starts with IMG_URL
            if (/^IMG_URL/i.test(trimmedLine)) {
                IMG_URL_REGEX.lastIndex = 0;
                const imgMatch = trimmedLine.match(IMG_URL_REGEX);
                if (imgMatch) {
                    const imgValue = imgMatch[1].trim();
                    let url = imgValue;
                    if (!/^https?:\/\//.test(imgValue) && !imgValue.includes('/')) {
                        const imageBaseUrl = getImageBaseUrl();
                        url = `${imageBaseUrl}${fileName}/${imgValue}`;
                    }
                    result.push(`<img src="${url}" loading="lazy" style="border-radius:0.5rem;margin-top:0.2rem;margin-bottom:0;margin-left:auto;margin-right:auto;width:100%;max-width:100%;display:block;" />`);
                    continue;
                }
            }
            // Return line with colorization
            result.push(colorizeText(line));
        }
    }
    
    // Handle case where carousel wasn't closed
    if (inCarousel && carouselImages.length > 0) {
        result.push(processCarousel(carouselImages, fileName, carouselId));
    }
    
    return result.join('\n');
}

function convertGitHubUrlToRaw(url) {
    // Convert GitHub blob URL to raw URL
    // https://github.com/user/repo/blob/branch/path -> https://raw.githubusercontent.com/user/repo/branch/path
    if (url.includes('github.com') && url.includes('/blob/')) {
        url = url.replace('github.com', 'raw.githubusercontent.com');
        url = url.replace('/blob/', '/');
    }
    return url;
}

async function fetchAndEmbedCode(url) {
    try {
        const rawUrl = convertGitHubUrlToRaw(url);
        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        const code = await response.text();
        
        // Extract filename from URL
        const urlParts = rawUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
        
        // Map file extensions to Prism language names
        const languageMap = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript',
            'tsx': 'tsx',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sh': 'bash',
            'bash': 'bash',
            'html': 'markup',
            'xml': 'markup',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'sql': 'sql',
            'r': 'r',
            'm': 'objectivec',
            'mm': 'objectivec',
            'vue': 'vue',
            'svelte': 'svelte'
        };
        
        const language = languageMap[extension] || extension || 'plain';
        
        // Escape code and split into lines
        // We'll highlight after insertion when Prism language components are loaded
        const escapedCode = escapeHtml(code);
        const codeLines = escapedCode.split(/\r?\n/);
        
        // Create Gist-style embed with header and line numbers
        // Store full code in data attribute for highlighting after language loads
        // Use a temporary div to properly escape for HTML attribute
        const tempDiv = document.createElement('div');
        tempDiv.textContent = code;
        const escapedCodeForAttr = tempDiv.innerHTML.replace(/"/g, '&quot;');
        
        const langClass = language ? `language-${language}` : '';
        let gistHtml = `<div class="gist-container" data-full-code="${escapedCodeForAttr}" data-language="${language}"><div class="gist-header"><span class="gist-file-name">${escapeHtml(fileName)}</span></div><div class="gist-content"><table class="gist-table"><tbody>`;
        
        codeLines.forEach((line, index) => {
            const lineNumber = index + 1;
            // Insert plain text first, will be highlighted after language loads
            gistHtml += `<tr><td class="gist-line-number" data-line-number="${lineNumber}"></td><td class="gist-line-content ${langClass}" data-language="${language}">${line || ' '}</td></tr>`;
        });
        
        gistHtml += `</tbody></table></div></div>`;
        return gistHtml;
    } catch (error) {
        return `<pre class="code-embed-error">Error loading code from ${url}: ${error.message}</pre>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightCodeBlocks(container) {
    if (typeof Prism === 'undefined') {
        console.warn('Prism not available');
        return;
    }
    
    // Find all gist containers
    const gistContainers = container.querySelectorAll('.gist-container');
    
    gistContainers.forEach(gistContainer => {
        const language = gistContainer.getAttribute('data-language');
        const fullCode = gistContainer.getAttribute('data-full-code');
        
        if (!language || !fullCode) return;
        
        // Check if language is loaded
        if (!Prism.languages[language]) {
            // Language not loaded yet, wait for autoloader
            // Prism autoloader loads when it sees language-* classes
            // Try again after a delay
            setTimeout(() => highlightCodeBlocks(container), 300);
            return;
        }
        
        // Language is loaded, highlight the code
        // Decode the HTML entity-encoded code from data attribute
        const decodeDiv = document.createElement('div');
        decodeDiv.innerHTML = fullCode;
        const decodedCode = decodeDiv.textContent;
        
        try {
            const highlighted = Prism.highlight(decodedCode, Prism.languages[language], language);
            const highlightedLines = highlighted.split('\n');
            
            const codeCells = gistContainer.querySelectorAll('.gist-line-content');
            
            // Update each cell with highlighted version
            codeCells.forEach((cell, index) => {
                if (highlightedLines[index] !== undefined) {
                    cell.innerHTML = highlightedLines[index] || ' ';
                }
            });
            
            console.log('Code highlighted successfully for language:', language);
        } catch (e) {
            console.warn('Failed to highlight code:', e, 'Language:', language, 'Available:', Object.keys(Prism.languages));
        }
    });
}

function extractSnippets(text) {
    // Debug: check if text contains BEGIN markers
    if (text.includes('--BEGIN--')) {
        console.log('Text contains --BEGIN-- markers');
        // Find first BEGIN marker position
        const firstBegin = text.indexOf('--BEGIN--');
        const sample = text.substring(firstBegin, Math.min(firstBegin + 50, text.length));
        console.log('Sample around first BEGIN:', sample);
    }
    
    // Find all BEGIN markers
    const beginMatches = [];
    SNIPPET_BEGIN_REGEX.lastIndex = 0;
    let beginMatch;
    while ((beginMatch = SNIPPET_BEGIN_REGEX.exec(text)) !== null) {
        console.log('Found BEGIN match:', beginMatch[0], 'at index', beginMatch.index);
        // Handle both formats: DATE--TOPIC-- (groups 1,2) or TOPIC--DATE (groups 3,4)
        const date = beginMatch[1] || beginMatch[4] || '';
        const topic = beginMatch[2] || beginMatch[3] || '';
        beginMatches.push({
            index: beginMatch.index,
            fullMatch: beginMatch[0],
            date: date,
            topic: topic,
            endIndex: beginMatch.index + beginMatch[0].length
        });
    }
    
    // Find all END markers
    const endMatches = [];
    SNIPPET_END_REGEX.lastIndex = 0;
    let endMatch;
    while ((endMatch = SNIPPET_END_REGEX.exec(text)) !== null) {
        endMatches.push({
            index: endMatch.index,
            endIndex: endMatch.index + endMatch[0].length
        });
    }
    
    // If no BEGIN markers found, return null to indicate no snippets
    if (beginMatches.length === 0) {
        return null;
    }
    
    // Extract content between matching BEGIN and END markers
    const snippets = [];
    let usedEndIndices = new Set();
    
    for (let i = 0; i < beginMatches.length; i++) {
        const begin = beginMatches[i];
        // Find the next unused END marker after this BEGIN marker
        const end = endMatches.find(e => e.index > begin.endIndex && !usedEndIndices.has(e.index));
        
        if (end) {
            // Mark this END marker as used
            usedEndIndices.add(end.index);
            // Extract content between BEGIN and END (excluding the markers themselves)
            const snippetContent = text.substring(begin.endIndex, end.index).trim();
            if (snippetContent) {
                snippets.push({
                    content: snippetContent,
                    date: begin.date,
                    topic: begin.topic
                });
            }
        } else {
            // If no END marker found, extract from BEGIN to end of text
            const snippetContent = text.substring(begin.endIndex).trim();
            if (snippetContent) {
                snippets.push({
                    content: snippetContent,
                    date: begin.date,
                    topic: begin.topic
                });
            }
        }
    }
    
    // Return array of snippets, or null if none found
    return snippets.length > 0 ? snippets : null;
}

async function loadLearnings(fileName) {
    // Temporarily clear cache for testing - remove this line after confirming it works
    contentCache.delete(fileName);
    
    if (contentCache.has(fileName)) {
        const contentDiv = document.getElementById("content");
        contentDiv.innerHTML = contentCache.get(fileName);
        updateActiveButton(fileName);
        return;
    }

    const fileUrl = `${RAW_GITHUB_URL}${fileName}.txt`;
    const fallbackUrl = `${getBaseUrl()}${fileName}.txt`;
    const contentDiv = document.getElementById("content");
    
    contentDiv.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; min-height: 50vh; width: 100%;"><img src="https://upload.wikimedia.org/wikipedia/commons/a/ad/YouTube_loading_symbol_3_%28transparent%29.gif" alt="Loading..." style="width: 80px; height: 80px;" /></div>';
    
    try {
        let response = await fetch(fileUrl);
        
        if (!response.ok && fileUrl !== fallbackUrl) {
            console.log(`Primary URL failed, trying fallback: ${fallbackUrl}`);
            response = await fetch(fallbackUrl);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status} - Failed to load from both ${fileUrl} and ${fallbackUrl}`);
        }
        let text = await response.text();
        
        // Extract snippets if BEGIN/END markers are present
        const snippets = extractSnippets(text);
        console.log('Snippets found:', snippets ? snippets.length : 0, snippets);
        
        // If snippets found, process them separately; otherwise use date-based parsing
        if (snippets && snippets.length > 0) {
            console.log('Processing', snippets.length, 'snippets...');
            let htmlContent = '';
            
            // Check for SOURCE citation at the beginning of the file (before first snippet)
            const firstBeginIndex = text.indexOf('--BEGIN--');
            if (firstBeginIndex > 0) {
                const textBeforeFirstSnippet = text.substring(0, firstBeginIndex);
                SOURCE_REGEX.lastIndex = 0;
                const fileSourceMatch = textBeforeFirstSnippet.match(SOURCE_REGEX);
                if (fileSourceMatch) {
                    const fileSource = fileSourceMatch[1].trim();
                    htmlContent += `<h2 id="source" style="text-align: center; margin: 0.3rem auto 1rem auto; width: 70%; color: black;">${fileSource}</h2>`;
                }
            }
            
            // Process each snippet as a separate div
            for (let i = 0; i < snippets.length; i++) {
                const snippet = snippets[i];
                console.log(`Processing snippet ${i + 1}/${snippets.length}:`, snippet.date, snippet.topic);
                let snippetContent = snippet.content;
                
                // Remove SOURCE lines from snippet content (don't show them inside snippets)
                snippetContent = snippetContent.replace(SOURCE_REGEX, '');
                
                // Process content lines with carousel support
                const allLines = snippetContent.split('\n');
                const processedContent = await processContentLines(allLines, fileName);
                
                if (processedContent.trim().length > 0) {
                    // Wrap snippet in div with black background and green text
                    htmlContent += `
                        <div class="snippet-container" style="background-color: black; color: lightgreen; padding: 0.5rem 1rem 1rem 1rem; margin: 1rem auto; width: 70%; border-radius: 0.5rem; position: relative;">
                            ${snippet.date ? `<span id="date" style="position: absolute; top: 0.5rem; right: 1rem; font-size: clamp(0.6rem, 1.5vw, 0.8rem); opacity: 0.8;">${snippet.date}</span>` : ''}
                            ${snippet.topic ? `<h2 id="topic" style="margin: 0; margin-top: -0.2rem; margin-bottom: 0; color: lightgreen; font-size: clamp(1.5rem, 4vw, 3rem); font-weight: bold;">${snippet.topic}</h2>` : ''}
                            <div class="code-content">${processedContent}</div>
                        </div>
                    `;
                }
            }
            
            contentDiv.innerHTML = htmlContent;
            
            // Highlight code blocks with Prism after insertion
            highlightCodeBlocks(contentDiv);
            
            contentCache.set(fileName, htmlContent);
            updateActiveButton(fileName);
            updateRoute(fileName);
            return;
        }

        DATE_REGEX.lastIndex = 0;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = DATE_REGEX.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            parts.push(match[2]); // Just the date
            lastIndex = DATE_REGEX.lastIndex;
        }
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }
        
        let htmlContent = '';
        if (parts.length > 0) {
            let firstSection = parts[0];
            SOURCE_REGEX.lastIndex = 0; // Reset regex
            const sourceMatch = firstSection.match(SOURCE_REGEX);
            let source = '';
            if (sourceMatch) {
                source = sourceMatch[1].trim();
                firstSection = firstSection.replace(SOURCE_REGEX, '');
            }
            // Remove lines that are only dashes, spaces, or hyphens
            const lines = firstSection.split('\n');
            firstSection = lines.filter(line => {
                const trimmed = line.trim();
                // Filter out empty lines and lines that are only dashes/spaces/hyphens
                return trimmed.length > 0 && !DASH_LINE_REGEX.test(trimmed) && !SOURCE_LINE_REGEX.test(trimmed);
            }).join('\n').trim();
            
            // Only add section if there's actual content (not just whitespace)
            if (firstSection && firstSection.replace(/\s+/g, '').length > 0) {
                if (source) {
                    htmlContent += `<h2 id="source">${source}</h2>`;
                }
                const contentLines = firstSection.split('\n');
                let content = await processContentLines(contentLines, fileName);
                htmlContent += `<div class="code-content">${content}</div>`;
            } else if (source) {
                // If only source exists without content, still show the source
                htmlContent += `<h2 id="source">SOURCE: ${source}</h2>`;
            }
        }

        // Process date sections: odd indices are dates, even indices are content
        for (let i = 1; i < parts.length; i += 2) {
            const date = parts[i];
            let content = parts[i + 1] || '';
            
            // Extract SOURCE line if present at the beginning of content
            let source = '';
            SOURCE_REGEX.lastIndex = 0; // Reset regex
            const sourceMatch = content.match(SOURCE_REGEX);
            if (sourceMatch) {
                source = sourceMatch[1].trim();
                // Remove SOURCE line from content
                content = content.replace(SOURCE_REGEX, '');
            }
            
            // Remove lines that are only dashes, spaces, hyphens, or SOURCE lines
            let content_cleaned = content;
            const allLines = content_cleaned.split('\n');
            content_cleaned = allLines.filter(line => {
                const trimmed = line.trim();
                // Filter out empty lines and lines that are only dashes/spaces/hyphens
                return trimmed.length > 0 && !DASH_LINE_REGEX.test(trimmed) && !SOURCE_LINE_REGEX.test(trimmed);
            }).join('\n').trim();
            
            // Only create section if there's actual content (not just whitespace)
            if (content_cleaned && content_cleaned.replace(/\s+/g, '').length > 0) {
                // Process content lines with carousel support
                const contentLines = content_cleaned.split('\n');
                content_cleaned = await processContentLines(contentLines, fileName);

                htmlContent += `
                    <div class="section">
                        ${source ? `<h2 id="source">${source}</h2>` : ''}
                        <h2 id="date">Date: ${date}</h2>
                        <div class="code-content">${content_cleaned}</div>
                    </div>
                `;
            }
        }

        contentDiv.innerHTML = htmlContent;
        
        // Highlight code blocks with Prism after insertion
        highlightCodeBlocks(contentDiv);
        
        // Cache the parsed content
        contentCache.set(fileName, htmlContent);
        
        updateActiveButton(fileName);
        
        // Update URL with route
        updateRoute(fileName);
    } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        const fileUrl = `${BASE_URL}${fileName}.txt`;
        const fallbackUrl = `${RAW_GITHUB_URL}${fileName}.txt`;
        contentDiv.innerHTML = `<pre style="text-align:center;padding:2rem;color:red;">
Error loading content: ${errorMsg}
<br><br>
File: ${fileName}.txt
<br>
Primary URL: ${fileUrl}
<br>
Fallback URL: ${fallbackUrl}
<br><br>
Please check if the file exists at one of the URLs above.
</pre>`;
        console.error('Error loading learnings:', error);
        console.error('Attempted URLs:', fileUrl, fallbackUrl);
    }
}

function updateActiveButton(topic) {
    const select = document.getElementById('topic-select');
    if (select) {
        select.value = topic;
    }
}

// Update URL route
function updateRoute(fileName) {
    const currentPath = window.location.pathname;
    
    // Get navigation IDs from loaded navigation items
    const navigationIds = navigationItems.map(item => item.id);
    
    // Split path and filter out empty strings and index.html
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html');
    
    // Find the base path: everything before the first navigation ID
    let basePathParts = [];
    let foundRoute = false;
    
    for (let i = 0; i < pathParts.length; i++) {
        if (navigationIds.includes(pathParts[i])) {
            // Found a route, stop here - base path is everything before this
            foundRoute = true;
            break;
        }
        basePathParts.push(pathParts[i]);
    }
    
    // If no route found, the entire path is the base (or empty if root)
    if (!foundRoute) {
        basePathParts = pathParts;
    }
    
    // Construct base path
    const basePath = basePathParts.length > 0 ? '/' + basePathParts.join('/') : '';
    
    // New path: base + single route (replace any existing route)
    const newPath = basePath ? `${basePath}/${fileName}` : `/${fileName}`;
    
    // Only update if path is different
    if (currentPath !== newPath) {
        window.history.pushState({ fileName: fileName }, '', newPath);
    }
}

// Get route from URL
function getRouteFromUrl() {
    const path = window.location.pathname;
    // Split path and filter out empty strings
    const pathParts = path.split('/').filter(p => p && p !== 'index.html');
    
    // If path is like /learn-with-ari/advanced-db, get the last part
    // If path is like /advanced-db, get that part
    // If path is like /, return null (home page)
    if (pathParts.length === 0) {
        return null;
    }
    
    // Get the last part (the route)
    const route = pathParts[pathParts.length - 1];
    
    // Return route if it exists and is not just 'learn-with-ari'
    return (route && route !== 'learn-with-ari') ? route : null;
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    const route = getRouteFromUrl();
    if (route) {
        const select = document.getElementById('topic-select');
        if (select) {
            select.value = route;
        }
        loadLearnings(route);
    } else {
        // Load default if no route (first item from navigation)
        // Note: navigation should already be loaded, so just load default
        const select = document.getElementById('topic-select');
        if (select && navigationItems.length > 0) {
            select.value = navigationItems[0].id;
            loadLearnings(navigationItems[0].id);
        }
    }
});

async function loadNavigation() {
    try {
        // Try relative path first (for GitHub Pages), fallback to base path
        let navUrl = './navigation.json';
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            navUrl = './navigation.json';
        }
        
        const response = await fetch(navUrl);
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        navigationItems = await response.json(); // Store globally
        const tagsDiv = document.getElementById('tags');
        
        // Create dropdown select element
        const select = document.createElement('select');
        select.id = 'topic-select';
        
        navigationItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.label;
            select.appendChild(option);
        });
        
        // Add change event listener
        select.addEventListener('change', function() {
            loadLearnings(this.value);
        });
        
        tagsDiv.appendChild(select);
        
        // Check if there's a route in the URL
        const route = getRouteFromUrl();
        if (route) {
            // Load content based on route
            const itemExists = navigationItems.some(item => item.id === route);
            if (itemExists) {
                select.value = route;
                loadLearnings(route);
            } else {
                // Invalid route, load default
                if (navigationItems.length > 0) {
                    select.value = navigationItems[0].id;
                    loadLearnings(navigationItems[0].id);
                }
            }
        } else {
            // No route, load default content
            if (navigationItems.length > 0) {
                select.value = navigationItems[0].id;
                loadLearnings(navigationItems[0].id);
            }
        }
    } catch (error) {
        const tagsDiv = document.getElementById('tags');
        tagsDiv.innerHTML = '<pre style="color:red;">Error loading navigation. Please check navigation.json exists.</pre>';
        console.error('Navigation loading error:', error);
    }
}

// Carousel navigation functions
function carouselPrev(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    let currentIndex = -1;
    slides.forEach((slide, index) => {
        if (slide.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    if (currentIndex === -1) return;
    
    // Remove active class from current slide
    slides[currentIndex].classList.remove('active');
    
    // Calculate previous index (wrap around)
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
    slides[prevIndex].classList.add('active');
}

function carouselNext(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    let currentIndex = -1;
    slides.forEach((slide, index) => {
        if (slide.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    if (currentIndex === -1) return;
    
    // Remove active class from current slide
    slides[currentIndex].classList.remove('active');
    
    // Calculate next index (wrap around)
    const nextIndex = (currentIndex + 1) % slides.length;
    slides[nextIndex].classList.add('active');
}

document.addEventListener("DOMContentLoaded", function () {
    loadNavigation();
});
