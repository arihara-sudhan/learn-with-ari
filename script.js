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
const DATE_REGEX = /(-+\s*\[(\d{2}\/\d{2}\/\d{4})\])/g;
const SOURCE_REGEX = /^SOURCE:\s*(.+?)(?:\r?\n|$)/m;
const SEPARATOR_REGEX = /- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -/g;
const DASH_LINE_REGEX = /^[- ]+$/;
const SOURCE_LINE_REGEX = /^SOURCE:/i;
const IMG_URL_REGEX = /^IMG_URL\s*@?\s*(.+)$/i;
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

async function loadLearnings(fileName) {
    if (contentCache.has(fileName)) {
        const contentDiv = document.getElementById("content");
        contentDiv.innerHTML = contentCache.get(fileName);
        updateActiveButton(fileName);
        return;
    }

    const fileUrl = `${RAW_GITHUB_URL}${fileName}.txt`;
    const fallbackUrl = `${getBaseUrl()}${fileName}.txt`;
    const contentDiv = document.getElementById("content");
    
    contentDiv.innerHTML = '<pre style="text-align:center;padding:2rem;">Loading...</pre>';
    
    try {
        let response = await fetch(fileUrl);
        
        if (!response.ok && fileUrl !== fallbackUrl) {
            console.log(`Primary URL failed, trying fallback: ${fallbackUrl}`);
            response = await fetch(fallbackUrl);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status} - Failed to load from both ${fileUrl} and ${fallbackUrl}`);
        }
        const text = await response.text();

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
            // Remove separator patterns and lines that are only dashes, spaces, or hyphens
            firstSection = firstSection.replace(SEPARATOR_REGEX, "");
            const lines = firstSection.split('\n');
            firstSection = lines.filter(line => {
                const trimmed = line.trim();
                // Filter out empty lines and lines that are only dashes/spaces/hyphens
                return trimmed.length > 0 && !DASH_LINE_REGEX.test(trimmed) && !SOURCE_LINE_REGEX.test(trimmed);
            }).join('\n').trim();
            
            // Only add section if there's actual content (not just whitespace)
            if (firstSection && firstSection.replace(/\s+/g, '').length > 0) {
                if (source) {
                    htmlContent += `<h2 id="source">SOURCE: ${source}</h2>`;
                }
                const contentLines = firstSection.split('\n').filter(line => line.trim().length > 0);
                let content = contentLines.map(line => {
                    const trimmedLine = line.trim();
                    // Check if line starts with IMG_URL (case-insensitive)
                    if (/^IMG_URL/i.test(trimmedLine)) {
                        IMG_URL_REGEX.lastIndex = 0; // Reset regex
                        const imgMatch = trimmedLine.match(IMG_URL_REGEX);
                        if (imgMatch) {
                            const imgValue = imgMatch[1].trim();
                            let url = imgValue;
                            // If it's not already a full URL, construct the path
                            if (!/^https?:\/\//.test(imgValue) && !imgValue.includes('/')) {
                                const imageBaseUrl = getImageBaseUrl();
                                url = `${imageBaseUrl}${fileName}/${imgValue}`;
                            }
                            return `<img src="${url}" loading="lazy" style="border-radius:0.5rem;margin-top:0.2rem;margin-bottom:0.2rem;margin-left:auto;margin-right:auto;width:100%;max-width:100%;display:block;border:1px solid lightgreen;" />`;
                        }
                    }
                    return colorizeText(line);
                }).join('\n');
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
            
            // Clean up separator lines and trim
            let content_cleaned = content.replace(SEPARATOR_REGEX, "");
            
            // Remove lines that are only dashes, spaces, hyphens, or SOURCE lines
            const allLines = content_cleaned.split('\n');
            content_cleaned = allLines.filter(line => {
                const trimmed = line.trim();
                // Filter out empty lines and lines that are only dashes/spaces/hyphens
                return trimmed.length > 0 && !DASH_LINE_REGEX.test(trimmed) && !SOURCE_LINE_REGEX.test(trimmed);
            }).join('\n').trim();
            
            // Only create section if there's actual content (not just whitespace)
            if (content_cleaned && content_cleaned.replace(/\s+/g, '').length > 0) {
                // Process content lines (filter out empty lines first)
                const validLines = content_cleaned.split('\n').filter(line => line.trim().length > 0);
                content_cleaned = validLines.map(line => {
                    const trimmedLine = line.trim();
                    // Check if line starts with IMG_URL (case-insensitive)
                    if (/^IMG_URL/i.test(trimmedLine)) {
                        IMG_URL_REGEX.lastIndex = 0; // Reset regex
                        const imgMatch = trimmedLine.match(IMG_URL_REGEX);
                        if (imgMatch) {
                            const imgValue = imgMatch[1].trim();
                            let url = imgValue;
                            // If it's not already a full URL, construct the path
                            if (!/^https?:\/\//.test(imgValue) && !imgValue.includes('/')) {
                                const imageBaseUrl = getImageBaseUrl();
                                url = `${imageBaseUrl}${fileName}/${imgValue}`;
                            }
                            return `<img src="${url}" loading="lazy" style="border-radius:0.5rem;margin-top:0.2rem;margin-bottom:0.2rem;margin-left:auto;margin-right:auto;width:100%;max-width:100%;display:block;border:1px solid lightgreen;" />`;
                        }
                    }
                    return colorizeText(line);
                }).join('\n');

                htmlContent += `
                    <div class="section">
                        ${source ? `<h2 id="source">SOURCE: ${source}</h2>` : ''}
                        <h2 id="date">Date: ${date}</h2>
                        <div class="code-content">${content_cleaned}</div>
                    </div>
                `;
            }
        }

        contentDiv.innerHTML = htmlContent;
        
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
    if (activeButton) {
        activeButton.style.backgroundColor = "black";
        activeButton.style.color = "lightgreen";
    }

    const clickedButton = document.querySelector(`h2[data-id="${topic}"]`);
    if (clickedButton) {
        clickedButton.style.backgroundColor = "red";
        clickedButton.style.color = "white";
        activeButton = clickedButton;
    }
}

// Update URL route
function updateRoute(fileName) {
    const currentPath = window.location.pathname;
    
    // Get base path (everything except the route)
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html');
    
    // Determine base path
    let basePath = '';
    if (pathParts.length > 0) {
        // If current route is one of the navigation items, remove it to get base
        const navigationIds = ['nlp', 'classicalml', 'rag', 'linear-algebra', 'advanced-dsa', 'advanced-db', 'crispr'];
        if (pathParts.length > 0 && navigationIds.includes(pathParts[pathParts.length - 1])) {
            // Current path has a route, remove it to get base
            pathParts.pop();
        }
        // Construct base path from remaining parts
        if (pathParts.length > 0) {
            basePath = '/' + pathParts.join('/');
        }
    }
    
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
        loadLearnings(route);
    } else {
        // Load default if no route (first item from navigation)
        // Note: navigation should already be loaded, so just load default
        const tagsDiv = document.getElementById('tags');
        const firstButton = tagsDiv.querySelector('h2[data-id]');
        if (firstButton) {
            const firstId = firstButton.getAttribute('data-id');
            loadLearnings(firstId);
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
        const navigationItems = await response.json();
        const tagsDiv = document.getElementById('tags');
        
        navigationItems.forEach(item => {
            const button = document.createElement('h2');
            button.textContent = item.label;
            button.setAttribute('data-id', item.id);
            button.setAttribute('onclick', `loadLearnings('${item.id}')`);
            tagsDiv.appendChild(button);
        });
        
        // Check if there's a route in the URL
        const route = getRouteFromUrl();
        if (route) {
            // Load content based on route
            const itemExists = navigationItems.some(item => item.id === route);
            if (itemExists) {
                loadLearnings(route);
            } else {
                // Invalid route, load default
                if (navigationItems.length > 0) {
                    loadLearnings(navigationItems[0].id);
                }
            }
        } else {
            // No route, load default content
            if (navigationItems.length > 0) {
                loadLearnings(navigationItems[0].id);
            }
        }
    } catch (error) {
        const tagsDiv = document.getElementById('tags');
        tagsDiv.innerHTML = '<pre style="color:red;">Error loading navigation. Please check navigation.json exists.</pre>';
        console.error('Navigation loading error:', error);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    loadNavigation();
});
