import type { Issue, ValidatorResult } from '../types';

export async function validateIndexing(url: string): Promise<ValidatorResult> {
  const issues: Issue[] = [];
  const now = new Date().toISOString();

  try {
    // Fetch the page with redirect following disabled to detect chains
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEO-Solver/1.0 (Indexing Validator)',
      },
      redirect: 'manual',
    });

    // Check for redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Check for redirect chains
        const chainIssue = await checkRedirectChain(url, location, now);
        if (chainIssue) {
          issues.push(chainIssue);
        }
      }
      // Follow redirect to check final page
      const finalResponse = await fetch(url, {
        headers: {
          'User-Agent': 'SEO-Solver/1.0 (Indexing Validator)',
        },
      });
      return await validateFinalResponse(finalResponse, url, issues, now);
    }

    return await validateFinalResponse(response, url, issues, now);
  } catch (error) {
    console.error(`Error validating indexing for ${url}:`, error);
    return { issues: [], urls_checked: 1 };
  }
}

async function validateFinalResponse(
  response: Response,
  url: string,
  existingIssues: Issue[],
  now: string
): Promise<ValidatorResult> {
  const issues = [...existingIssues];

  // Check HTTP status codes
  if (response.status === 404) {
    issues.push({
      id: '',
      url,
      category: 'indexing',
      type: 'not_found_404',
      severity: 'error',
      details: {
        message: 'Page returns 404 Not Found',
        status_code: 404,
      },
      auto_fixable: false,
      suggested_fix: 'Either restore the page content or set up a redirect to a relevant page',
      detected_at: now,
    });
    return { issues, urls_checked: 1 };
  }

  if (response.status >= 500) {
    issues.push({
      id: '',
      url,
      category: 'indexing',
      type: 'server_error_5xx',
      severity: 'error',
      details: {
        message: `Page returns server error ${response.status}`,
        status_code: response.status,
      },
      auto_fixable: false,
      suggested_fix: 'Fix the server error. Check server logs for details.',
      detected_at: now,
    });
    return { issues, urls_checked: 1 };
  }

  if (!response.ok) {
    // Other non-200 responses
    return { issues, urls_checked: 1 };
  }

  const html = await response.text();

  // Check for canonical tag
  const canonicalIssue = checkCanonical(html, url, now);
  if (canonicalIssue) {
    issues.push(canonicalIssue);
  }

  // Check for noindex
  const noindexIssue = checkNoindex(html, url, now, response.headers);
  if (noindexIssue) {
    issues.push(noindexIssue);
  }

  // Check robots.txt (only for root URL)
  const parsedUrl = new URL(url);
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
    const robotsIssue = await checkRobotsTxt(parsedUrl.origin, url, now);
    if (robotsIssue) {
      issues.push(robotsIssue);
    }
  }

  return { issues, urls_checked: 1 };
}

async function checkRedirectChain(
  originalUrl: string,
  firstRedirect: string,
  now: string
): Promise<Issue | null> {
  let currentUrl = firstRedirect;
  let hops = 1;
  const maxHops = 10;
  const visited = new Set<string>([originalUrl]);

  while (hops < maxHops) {
    if (visited.has(currentUrl)) {
      // Redirect loop detected
      return {
        id: '',
        url: originalUrl,
        category: 'indexing',
        type: 'redirect_loop',
        severity: 'error',
        details: {
          message: 'Redirect loop detected',
          loop_url: currentUrl,
          hops,
        },
        auto_fixable: true,
        suggested_fix: 'Fix the redirect configuration to eliminate the loop',
        detected_at: now,
      };
    }

    visited.add(currentUrl);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'SEO-Solver/1.0 (Indexing Validator)',
        },
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          currentUrl = new URL(location, currentUrl).href;
          hops++;
          continue;
        }
      }
      break;
    } catch {
      break;
    }
  }

  if (hops > 1) {
    return {
      id: '',
      url: originalUrl,
      category: 'indexing',
      type: 'redirect_chain',
      severity: 'warning',
      details: {
        message: `Redirect chain with ${hops} hops`,
        hops,
      },
      auto_fixable: true,
      suggested_fix: 'Update redirects to point directly to the final destination',
      detected_at: now,
    };
  }

  return null;
}

function checkCanonical(html: string, url: string, now: string): Issue | null {
  // Look for canonical link
  const canonicalMatch = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i
  ) || html.match(
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i
  );

  if (!canonicalMatch) {
    return {
      id: '',
      url,
      category: 'indexing',
      type: 'duplicate_without_canonical',
      severity: 'error',
      details: {
        message: 'No canonical tag found on page',
      },
      auto_fixable: true,
      suggested_fix: `Add <link rel="canonical" href="${url}"> to the page head`,
      detected_at: now,
    };
  }

  const canonicalUrl = canonicalMatch[1];
  const normalizedCanonical = normalizeUrl(canonicalUrl);
  const normalizedCurrent = normalizeUrl(url);

  if (normalizedCanonical !== normalizedCurrent) {
    // This might be intentional (e.g., pointing to www version)
    // Only flag if the canonical points to a completely different page
    const canonicalPath = new URL(canonicalUrl, url).pathname;
    const currentPath = new URL(url).pathname;

    if (canonicalPath !== currentPath) {
      return {
        id: '',
        url,
        category: 'indexing',
        type: 'conflicting_canonical',
        severity: 'error',
        details: {
          message: 'Canonical URL points to a different page',
          canonical_url: canonicalUrl,
          current_url: url,
        },
        auto_fixable: true,
        suggested_fix: `Update the canonical tag to point to the correct URL`,
        detected_at: now,
      };
    }
  }

  return null;
}

function checkNoindex(
  html: string,
  url: string,
  now: string,
  headers: Headers
): Issue | null {
  // Check meta robots
  const metaRobots = html.match(
    /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i
  );

  if (metaRobots && metaRobots[1].toLowerCase().includes('noindex')) {
    return {
      id: '',
      url,
      category: 'indexing',
      type: 'noindex_tag',
      severity: 'warning',
      details: {
        message: 'Page has noindex meta tag',
        robots_content: metaRobots[1],
      },
      auto_fixable: false,
      suggested_fix: 'Remove the noindex directive if you want this page to be indexed',
      detected_at: now,
    };
  }

  // Check X-Robots-Tag header
  const xRobotsTag = headers.get('x-robots-tag');
  if (xRobotsTag && xRobotsTag.toLowerCase().includes('noindex')) {
    return {
      id: '',
      url,
      category: 'indexing',
      type: 'noindex_tag',
      severity: 'warning',
      details: {
        message: 'Page has noindex X-Robots-Tag header',
        header_value: xRobotsTag,
      },
      auto_fixable: false,
      suggested_fix: 'Remove the X-Robots-Tag header if you want this page to be indexed',
      detected_at: now,
    };
  }

  return null;
}

async function checkRobotsTxt(
  origin: string,
  url: string,
  now: string
): Promise<Issue | null> {
  try {
    const robotsUrl = `${origin}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'SEO-Solver/1.0 (Indexing Validator)',
      },
    });

    if (!response.ok) {
      // robots.txt doesn't exist or can't be fetched
      // This isn't necessarily an issue
      return null;
    }

    const robotsTxt = await response.text();

    // Simple check for Disallow: / (blocks everything)
    if (robotsTxt.includes('Disallow: /\n') || robotsTxt.includes('Disallow: /\r')) {
      // Check if it's for all user agents
      const lines = robotsTxt.split(/\r?\n/);
      let currentAgent = '';

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith('user-agent:')) {
          currentAgent = trimmed.replace('user-agent:', '').trim();
        } else if (trimmed === 'disallow: /' && (currentAgent === '*' || currentAgent === 'googlebot')) {
          return {
            id: '',
            url,
            category: 'indexing',
            type: 'blocked_by_robots',
            severity: 'error',
            details: {
              message: 'robots.txt blocks crawling of the entire site',
              user_agent: currentAgent,
            },
            auto_fixable: true,
            suggested_fix: 'Update robots.txt to allow crawling of desired pages',
            detected_at: now,
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, lowercase hostname
    let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`;
    if (normalized.endsWith('/') && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}
