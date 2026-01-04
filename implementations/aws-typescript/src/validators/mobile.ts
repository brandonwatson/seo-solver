import type { Issue, ValidatorResult } from '../types';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export async function validateMobile(url: string): Promise<ValidatorResult> {
  const issues: Issue[] = [];
  const now = new Date().toISOString();

  try {
    // Fetch the page with mobile user agent
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
      },
    });

    if (!response.ok) {
      // HTTP errors are handled by the indexing validator
      return { issues: [], urls_checked: 1 };
    }

    const html = await response.text();

    // Check for viewport meta tag
    const viewportIssue = checkViewport(html, url, now);
    if (viewportIssue) {
      issues.push(viewportIssue);
    }

    // Check for mobile-unfriendly patterns
    const patternIssues = checkMobilePatterns(html, url, now);
    issues.push(...patternIssues);

    return { issues, urls_checked: 1 };
  } catch (error) {
    console.error(`Error validating mobile for ${url}:`, error);
    return { issues: [], urls_checked: 1 };
  }
}

function checkViewport(html: string, url: string, now: string): Issue | null {
  // Look for viewport meta tag
  const viewportMatch = html.match(
    /<meta[^>]*name=["']viewport["'][^>]*>/i
  );

  if (!viewportMatch) {
    return {
      id: '',
      url,
      category: 'mobile',
      type: 'no_viewport',
      severity: 'error',
      details: {
        message: 'Viewport meta tag is missing',
      },
      auto_fixable: true,
      suggested_fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the page head',
      detected_at: now,
    };
  }

  // Check viewport content
  const contentMatch = viewportMatch[0].match(/content=["']([^"']+)["']/i);
  if (contentMatch) {
    const content = contentMatch[1].toLowerCase();

    // Check for width=device-width
    if (!content.includes('width=device-width') && !content.includes('width=')) {
      return {
        id: '',
        url,
        category: 'mobile',
        type: 'no_viewport',
        severity: 'error',
        details: {
          message: 'Viewport meta tag is missing width=device-width',
          current_content: contentMatch[1],
        },
        auto_fixable: true,
        suggested_fix: 'Update viewport meta tag to include width=device-width',
        detected_at: now,
      };
    }

    // Check for user-scalable=no (bad for accessibility)
    if (content.includes('user-scalable=no') || content.includes('user-scalable=0')) {
      // This is more of an accessibility issue, but affects mobile usability
      return {
        id: '',
        url,
        category: 'mobile',
        type: 'content_wider_than_screen',
        severity: 'warning',
        details: {
          message: 'Viewport prevents user scaling, which is bad for accessibility',
          current_content: contentMatch[1],
        },
        auto_fixable: true,
        suggested_fix: 'Remove user-scalable=no to allow users to zoom',
        detected_at: now,
      };
    }
  }

  return null;
}

function checkMobilePatterns(html: string, url: string, now: string): Issue[] {
  const issues: Issue[] = [];

  // Check for fixed-width elements in inline styles
  // This is a heuristic - might have false positives
  const fixedWidthPattern = /style=["'][^"']*width:\s*(\d{4,})px/gi;
  const matches = [...html.matchAll(fixedWidthPattern)];

  for (const match of matches) {
    const width = parseInt(match[1], 10);
    if (width > 500) {
      issues.push({
        id: '',
        url,
        category: 'mobile',
        type: 'content_wider_than_screen',
        severity: 'warning',
        details: {
          message: `Found element with fixed width of ${width}px which may cause horizontal scroll on mobile`,
          width,
        },
        auto_fixable: false,
        suggested_fix: 'Use responsive units (%, vw, rem) or max-width instead of fixed pixel widths',
        detected_at: now,
      });
      break; // Only report once
    }
  }

  // Check for very small font sizes in CSS
  const smallFontPattern = /font-size:\s*([0-9]+)(px|pt)/gi;
  const fontMatches = [...html.matchAll(smallFontPattern)];

  for (const match of fontMatches) {
    const size = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const pxSize = unit === 'pt' ? size * 1.333 : size;

    if (pxSize < 12) {
      issues.push({
        id: '',
        url,
        category: 'mobile',
        type: 'text_too_small',
        severity: 'warning',
        details: {
          message: `Found text with font-size ${size}${unit} which may be too small on mobile`,
          font_size: `${size}${unit}`,
          min_recommended: '12px',
        },
        auto_fixable: false,
        suggested_fix: 'Use a minimum font size of 12px (or 0.75rem with 16px base) for legibility on mobile',
        detected_at: now,
      });
      break; // Only report once
    }
  }

  // Check for tap targets (simplified - would need DOM analysis for accuracy)
  // Look for very small buttons/links in inline styles
  const smallTargetPattern = /style=["'][^"']*(?:width|height):\s*([0-9]+)px[^"']*(?:width|height):\s*([0-9]+)px/gi;
  const targetMatches = [...html.matchAll(smallTargetPattern)];

  for (const match of targetMatches) {
    const dim1 = parseInt(match[1], 10);
    const dim2 = parseInt(match[2], 10);
    const minDim = Math.min(dim1, dim2);

    if (minDim < 44 && minDim > 0) {
      issues.push({
        id: '',
        url,
        category: 'mobile',
        type: 'tap_targets_too_close',
        severity: 'warning',
        details: {
          message: `Found interactive element smaller than recommended 48x48px tap target size`,
          size: `${dim1}x${dim2}px`,
          min_recommended: '48x48px',
        },
        auto_fixable: false,
        suggested_fix: 'Ensure touch targets are at least 48x48px with adequate spacing',
        detected_at: now,
      });
      break; // Only report once
    }
  }

  return issues;
}
