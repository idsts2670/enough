import express from 'express';
import rateLimit from 'express-rate-limit';
import ipaddr from 'ipaddr.js';

import { config } from './load-config';
import { requestLoggerMiddleware } from './util/middlewares';
import { validateSession } from './util/validate-user';

const app = express();
const PLUGIN_STORE_ALLOWLIST_URL =
  'https://raw.githubusercontent.com/actualbudget/plugin-store/refs/heads/main/plugins.json';

app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    legacyHeaders: false,
    standardHeaders: true,
  }),
);

// Cache for the allowlist to avoid fetching it on every request
let allowlistedRepos = [];
let lastAllowlistFetch = 0;
const ALLOWLIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Export cache clearing function for testing
export const clearAllowlistCache = () => {
  allowlistedRepos = [];
  lastAllowlistFetch = 0;
};

async function fetchAllowlist() {
  const now = Date.now();
  if (
    now - lastAllowlistFetch < ALLOWLIST_CACHE_TTL &&
    allowlistedRepos.length > 0
  ) {
    return allowlistedRepos;
  }

  try {
    const response = await fetch(PLUGIN_STORE_ALLOWLIST_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch allowlist: ${response.status}`);
    }
    const plugins = await response.json();
    allowlistedRepos = plugins.map(plugin => plugin.url);
    lastAllowlistFetch = now;
    console.log('Updated plugin allowlist:', allowlistedRepos);
    return allowlistedRepos;
  } catch (error) {
    console.error('Failed to fetch plugin allowlist:', error);
    // Return empty array if fetch fails to be safe
    allowlistedRepos = [];
    return allowlistedRepos;
  }
}

function isBlockedHostname(hostname) {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname.endsWith('.local')
  ) {
    console.warn(`Blocked request to local hostname: ${hostname}`);
    return true;
  }

  // Block private/local IP addresses
  if (ipaddr.isValid(hostname)) {
    const ip = ipaddr.parse(hostname);
    if (
      [
        'private',
        'loopback',
        'linkLocal',
        'uniqueLocal',
        'unspecified',
      ].includes(ip.range())
    ) {
      console.warn(`Blocked request to private/localhost IP: ${hostname}`);
      return true;
    }
  }

  return false;
}

function getAllowlistedRepo(repoUrl) {
  try {
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'github.com' ||
      pathParts.length < 2
    ) {
      return null;
    }

    return {
      owner: pathParts[0],
      repo: pathParts[1].replace(/\.git$/i, ''),
    };
  } catch (error) {
    console.warn(
      'Invalid repository URL in allowlist:',
      repoUrl,
      error.message,
    );
    return null;
  }
}

function matchesPath(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Return a URL only after it has been normalized and matched to the plugin
 * allowlist. Callers must use the returned URL for network requests.
 */
function getAllowedProxyUrl(targetUrl) {
  let url;
  try {
    url = new URL(targetUrl);
  } catch (e) {
    console.warn('Invalid target URL:', targetUrl, e.message);
    return null;
  }

  url.username = '';
  url.password = '';
  url.hash = '';

  if (isBlockedHostname(url.hostname)) {
    return null;
  }

  if (url.protocol !== 'https:') {
    console.warn('Blocked non-HTTPS proxy URL:', url.toString());
    return null;
  }

  if (url.toString() === PLUGIN_STORE_ALLOWLIST_URL) {
    return url;
  }

  for (const repoUrl of allowlistedRepos) {
    const repo = getAllowlistedRepo(repoUrl);
    if (!repo) {
      continue;
    }

    const repoPath = `/${repo.owner}/${repo.repo}`;

    if (
      (url.hostname === 'github.com' &&
        (matchesPath(url.pathname, repoPath) ||
          url.pathname.startsWith(`${repoPath}/releases/`))) ||
      (url.hostname === 'api.github.com' &&
        matchesPath(url.pathname, `/repos/${repo.owner}/${repo.repo}`)) ||
      (url.hostname === 'raw.githubusercontent.com' &&
        url.pathname.startsWith(`${repoPath}/`))
    ) {
      return url;
    }
  }

  return null;
}

app.use('/', async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Actual-Token');
    res.set('Access-Control-Max-Age', '600');
    return res.status(204).end();
  }

  const targetUrlString = req.query.url;

  if (!targetUrlString) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  if (typeof targetUrlString !== 'string') {
    return res.status(400).json({ error: 'Invalid url parameter' });
  }

  // Validate session/token
  const session = await validateSession(req, res);
  if (!session) {
    return; // validateSession already sent the response
  }

  let parsedTargetUrl;
  try {
    parsedTargetUrl = new URL(targetUrlString);
  } catch {
    return res.status(400).json({ error: 'Invalid url parameter' });
  }

  // Fetch the latest allowlist
  try {
    await fetchAllowlist();
  } catch (error) {
    console.error('Failed to fetch allowlist:', error);
    return res.status(403).json({
      error: 'URL not allowed',
      message: 'Unable to verify allowlist',
    });
  }

  // Check if the URL is allowed
  const url = getAllowedProxyUrl(parsedTargetUrl.toString());
  if (!url) {
    console.warn('Blocked request to unauthorized URL:', parsedTargetUrl.href);
    return res.status(403).json({
      error: 'URL not allowed',
      message:
        'Only allowlisted plugin repositories are allowed (localhost only in development)',
    });
  }

  try {
    // Extract method, body, and headers from the request body (sent by loot-core)
    const {
      method = 'GET',
      body,
      headers: customHeaders = {},
    } = req.body || {};

    const methodNormalized =
      typeof method === 'string' ? method.toUpperCase() : 'GET';
    if (!['GET', 'HEAD'].includes(methodNormalized)) {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const requestHeaders = {
      ...req.headers,
      ...customHeaders,
      host: url.host,
    };

    // Remove headers that shouldn't be forwarded
    delete requestHeaders['x-actual-token'];
    delete requestHeaders['content-length'];
    delete requestHeaders['cookie'];
    delete requestHeaders['cookie2'];

    // Add GitHub authentication if token is configured and request is to GitHub
    const githubToken = config.get('github.token');
    if (
      githubToken &&
      (url.hostname === 'api.github.com' ||
        url.hostname === 'raw.githubusercontent.com' ||
        (url.hostname === 'github.com' && url.pathname.includes('/releases/')))
    ) {
      requestHeaders['Authorization'] = `Bearer ${githubToken}`;
      requestHeaders['User-Agent'] = 'Actual-Budget-Plugin-System';
      console.log(
        `Using GitHub authentication for request to: ${url.hostname}`,
      );
    }

    const response = await fetch(url.toString(), {
      method: methodNormalized,
      headers: requestHeaders,
      body: ['GET', 'HEAD'].includes(methodNormalized)
        ? undefined
        : typeof body === 'string'
          ? body
          : JSON.stringify(body),
    });

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';

    res.set('Access-Control-Allow-Origin', '*');
    res.status(response.status);

    // Try to detect if this might be JSON content based on URL or content
    const urlString = url.toString().toLowerCase();
    const isLikelyJson =
      contentType?.includes('application/json') ||
      urlString.includes('.json') ||
      urlString.includes('/manifest') ||
      urlString.includes('manifest.json') ||
      urlString.includes('package.json');

    if (isLikelyJson) {
      // For JSON responses, return the actual content
      res.set('Content-Type', 'application/json');
      const text = await response.text();
      try {
        res.json(JSON.parse(text));
      } catch {
        // If it's not valid JSON, treat as text
        res.set('Content-Type', contentType || 'text/plain');
        res.send(text);
      }
    } else if (contentType?.includes('text/')) {
      // For text responses, return as plain text
      res.set('Content-Type', contentType);
      const text = await response.text();
      res.send(text);
    } else {
      // For actual binary responses, return as JSON format
      res.set('Content-Type', 'application/json');
      const buffer = await response.arrayBuffer();
      const binaryData = {
        data: Array.from(new Uint8Array(buffer)),
        contentType,
        isBinary: true,
      };
      res.json(binaryData);
    }
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Error proxying request', details: err.message });
  }
});

export { app as handlers };
