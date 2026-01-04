import type { Issue, ValidatorResult } from '../types';

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  lcp: {
    good: 2.5,
    needsImprovement: 4.0,
  },
  inp: {
    good: 200,
    needsImprovement: 500,
  },
  cls: {
    good: 0.1,
    needsImprovement: 0.25,
  },
};

interface PageSpeedMetrics {
  lcp?: number;
  inp?: number;
  cls?: number;
}

export async function validatePerformance(url: string): Promise<ValidatorResult> {
  const issues: Issue[] = [];
  const now = new Date().toISOString();

  // Skip if no API key configured
  if (!PAGESPEED_API_KEY) {
    console.log('PageSpeed API key not configured, skipping performance validation');
    return { issues: [], urls_checked: 0 };
  }

  try {
    const metrics = await fetchPageSpeedMetrics(url);

    if (!metrics) {
      return { issues: [], urls_checked: 1 };
    }

    // Check LCP
    if (metrics.lcp !== undefined) {
      if (metrics.lcp > THRESHOLDS.lcp.needsImprovement) {
        issues.push({
          id: '',
          url,
          category: 'performance',
          type: 'poor_lcp',
          severity: 'error',
          details: {
            message: 'Largest Contentful Paint is too slow',
            threshold: THRESHOLDS.lcp.needsImprovement,
            value: metrics.lcp,
            unit: 'seconds',
          },
          auto_fixable: false,
          suggested_fix: 'Optimize the largest contentful element. Consider: lazy loading below-fold images, using WebP/AVIF format, adding width/height attributes, preloading critical resources.',
          detected_at: now,
        });
      } else if (metrics.lcp > THRESHOLDS.lcp.good) {
        issues.push({
          id: '',
          url,
          category: 'performance',
          type: 'needs_improvement_lcp',
          severity: 'warning',
          details: {
            message: 'Largest Contentful Paint needs improvement',
            threshold: THRESHOLDS.lcp.good,
            value: metrics.lcp,
            unit: 'seconds',
          },
          auto_fixable: false,
          suggested_fix: 'Optimize the largest contentful element to improve LCP below 2.5 seconds.',
          detected_at: now,
        });
      }
    }

    // Check INP (Interaction to Next Paint)
    if (metrics.inp !== undefined) {
      if (metrics.inp > THRESHOLDS.inp.needsImprovement) {
        issues.push({
          id: '',
          url,
          category: 'performance',
          type: 'poor_inp',
          severity: 'error',
          details: {
            message: 'Interaction to Next Paint is too slow',
            threshold: THRESHOLDS.inp.needsImprovement,
            value: metrics.inp,
            unit: 'milliseconds',
          },
          auto_fixable: false,
          suggested_fix: 'Reduce JavaScript execution time. Consider: code splitting, deferring non-critical scripts, breaking up long tasks.',
          detected_at: now,
        });
      } else if (metrics.inp > THRESHOLDS.inp.good) {
        issues.push({
          id: '',
          url,
          category: 'performance',
          type: 'needs_improvement_inp',
          severity: 'warning',
          details: {
            message: 'Interaction to Next Paint needs improvement',
            threshold: THRESHOLDS.inp.good,
            value: metrics.inp,
            unit: 'milliseconds',
          },
          auto_fixable: false,
          suggested_fix: 'Optimize interaction responsiveness to improve INP below 200ms.',
          detected_at: now,
        });
      }
    }

    // Check CLS
    if (metrics.cls !== undefined) {
      if (metrics.cls > THRESHOLDS.cls.needsImprovement) {
        issues.push({
          id: '',
          url,
          category: 'performance',
          type: 'poor_cls',
          severity: 'error',
          details: {
            message: 'Cumulative Layout Shift is too high',
            threshold: THRESHOLDS.cls.needsImprovement,
            value: metrics.cls,
          },
          auto_fixable: false,
          suggested_fix: 'Reduce layout shifts by: adding width/height to images, reserving space for dynamic content, avoiding inserting content above existing content.',
          detected_at: now,
        });
      } else if (metrics.cls > THRESHOLDS.cls.good) {
        issues.push({
          id: '',
          url,
          category: 'performance',
          type: 'needs_improvement_cls',
          severity: 'warning',
          details: {
            message: 'Cumulative Layout Shift needs improvement',
            threshold: THRESHOLDS.cls.good,
            value: metrics.cls,
          },
          auto_fixable: false,
          suggested_fix: 'Reduce layout shifts to improve CLS below 0.1.',
          detected_at: now,
        });
      }
    }

    return { issues, urls_checked: 1 };
  } catch (error) {
    console.error(`Error validating performance for ${url}:`, error);
    return { issues: [], urls_checked: 1 };
  }
}

async function fetchPageSpeedMetrics(url: string): Promise<PageSpeedMetrics | null> {
  try {
    const params = new URLSearchParams({
      url,
      key: PAGESPEED_API_KEY!,
      strategy: 'mobile',
      category: 'performance',
    });

    const response = await fetch(`${PAGESPEED_API_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`PageSpeed API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Extract metrics from the response
    const metrics: PageSpeedMetrics = {};

    // LCP (in seconds)
    const lcpAudit = data.lighthouseResult?.audits?.['largest-contentful-paint'];
    if (lcpAudit?.numericValue) {
      metrics.lcp = lcpAudit.numericValue / 1000; // Convert ms to seconds
    }

    // INP - might be in experimental audits or field data
    // For now, we'll use Total Blocking Time as a proxy
    const tbtAudit = data.lighthouseResult?.audits?.['total-blocking-time'];
    if (tbtAudit?.numericValue) {
      // TBT is a reasonable proxy for INP
      metrics.inp = tbtAudit.numericValue;
    }

    // CLS
    const clsAudit = data.lighthouseResult?.audits?.['cumulative-layout-shift'];
    if (clsAudit?.numericValue !== undefined) {
      metrics.cls = clsAudit.numericValue;
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching PageSpeed metrics:', error);
    return null;
  }
}
