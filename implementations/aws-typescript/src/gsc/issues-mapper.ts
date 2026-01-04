import type { Issue, IssueCategory, IssueType, IssueSeverity } from '../types';
import type { URLInspectionResult } from './types';

/**
 * Map GSC URL Inspection result to our Issue format
 */
export function mapInspectionResultToIssues(
  url: string,
  result: URLInspectionResult
): Issue[] {
  const issues: Issue[] = [];
  const now = new Date().toISOString();

  // Map indexing issues
  if (result.indexStatusResult) {
    const indexIssues = mapIndexStatusIssues(url, result.indexStatusResult, now);
    issues.push(...indexIssues);
  }

  // Map mobile usability issues
  if (result.mobileUsabilityResult) {
    const mobileIssues = mapMobileUsabilityIssues(url, result.mobileUsabilityResult, now);
    issues.push(...mobileIssues);
  }

  // Map rich results (structured data) issues
  if (result.richResultsResult) {
    const richResultsIssues = mapRichResultsIssues(url, result.richResultsResult, now);
    issues.push(...richResultsIssues);
  }

  return issues;
}

function mapIndexStatusIssues(
  url: string,
  indexStatus: NonNullable<URLInspectionResult['indexStatusResult']>,
  now: string
): Issue[] {
  const issues: Issue[] = [];

  // Check verdict
  if (indexStatus.verdict === 'FAIL') {
    // Determine specific issue type based on coverage state
    const coverageState = indexStatus.coverageState?.toLowerCase() || '';

    if (coverageState.includes('noindex')) {
      issues.push(createIssue({
        url,
        category: 'indexing',
        type: 'noindex_tag',
        severity: 'error',
        message: 'Page is marked as noindex',
        details: {
          coverage_state: indexStatus.coverageState,
          indexing_state: indexStatus.indexingState,
        },
        suggestedFix: 'Remove the noindex directive from the page if you want it indexed.',
        detectedAt: now,
        source: 'gsc',
      }));
    } else if (coverageState.includes('blocked')) {
      issues.push(createIssue({
        url,
        category: 'indexing',
        type: 'blocked_by_robots',
        severity: 'error',
        message: 'Page is blocked by robots.txt',
        details: {
          coverage_state: indexStatus.coverageState,
          robots_txt_state: indexStatus.robotsTxtState,
        },
        suggestedFix: 'Update robots.txt to allow crawling of this page.',
        detectedAt: now,
        source: 'gsc',
      }));
    } else if (coverageState.includes('not found') || coverageState.includes('404')) {
      issues.push(createIssue({
        url,
        category: 'indexing',
        type: 'not_found_404',
        severity: 'error',
        message: 'Page returns 404 Not Found',
        details: {
          coverage_state: indexStatus.coverageState,
          page_fetch_state: indexStatus.pageFetchState,
        },
        suggestedFix: 'Fix the page URL or set up a redirect to the correct location.',
        detectedAt: now,
        source: 'gsc',
      }));
    } else if (coverageState.includes('server error') || coverageState.includes('5xx')) {
      issues.push(createIssue({
        url,
        category: 'indexing',
        type: 'server_error_5xx',
        severity: 'error',
        message: 'Page returns server error',
        details: {
          coverage_state: indexStatus.coverageState,
          page_fetch_state: indexStatus.pageFetchState,
        },
        suggestedFix: 'Fix the server error causing the 5xx response.',
        detectedAt: now,
        source: 'gsc',
      }));
    } else if (coverageState.includes('redirect')) {
      issues.push(createIssue({
        url,
        category: 'indexing',
        type: 'redirect_chain',
        severity: 'warning',
        message: 'Page has redirect issues',
        details: {
          coverage_state: indexStatus.coverageState,
        },
        suggestedFix: 'Simplify redirect chains and ensure redirects point to the final destination.',
        detectedAt: now,
        source: 'gsc',
      }));
    } else {
      // Generic indexing failure
      issues.push(createIssue({
        url,
        category: 'indexing',
        type: 'crawled_not_indexed',
        severity: 'error',
        message: `Page not indexed: ${indexStatus.coverageState || 'Unknown reason'}`,
        details: {
          coverage_state: indexStatus.coverageState,
          indexing_state: indexStatus.indexingState,
          page_fetch_state: indexStatus.pageFetchState,
        },
        suggestedFix: 'Review the page content and ensure it provides value for indexing.',
        detectedAt: now,
        source: 'gsc',
      }));
    }
  }

  // Check canonical issues
  if (indexStatus.googleCanonical && indexStatus.userCanonical) {
    if (indexStatus.googleCanonical !== indexStatus.userCanonical) {
      issues.push(createIssue({
        url,
        category: 'indexing',
        type: 'conflicting_canonical',
        severity: 'warning',
        message: 'Google selected a different canonical than specified',
        details: {
          google_canonical: indexStatus.googleCanonical,
          user_canonical: indexStatus.userCanonical,
        },
        suggestedFix: `Google is using ${indexStatus.googleCanonical} as the canonical instead of your specified ${indexStatus.userCanonical}. Review your canonical tags.`,
        detectedAt: now,
        source: 'gsc',
      }));
    }
  } else if (!indexStatus.userCanonical && indexStatus.verdict !== 'PASS') {
    issues.push(createIssue({
      url,
      category: 'indexing',
      type: 'duplicate_without_canonical',
      severity: 'warning',
      message: 'No canonical tag specified',
      details: {
        ...(indexStatus.googleCanonical ? { google_canonical: indexStatus.googleCanonical } : {}),
      },
      suggestedFix: `Add a canonical tag: <link rel="canonical" href="${url}">`,
      detectedAt: now,
      source: 'gsc',
    }));
  }

  return issues;
}

function mapMobileUsabilityIssues(
  url: string,
  mobileUsability: NonNullable<URLInspectionResult['mobileUsabilityResult']>,
  now: string
): Issue[] {
  const issues: Issue[] = [];

  if (mobileUsability.verdict !== 'PASS' && mobileUsability.issues) {
    for (const issue of mobileUsability.issues) {
      const issueType = mapMobileIssueType(issue.issueType);

      issues.push(createIssue({
        url,
        category: 'mobile',
        type: issueType,
        severity: issue.severity === 'ERROR' ? 'error' : 'warning',
        message: issue.message || `Mobile usability issue: ${issue.issueType}`,
        details: {
          issue_type: issue.issueType,
          gsc_severity: issue.severity,
        },
        suggestedFix: getMobileSuggestedFix(issueType),
        detectedAt: now,
        source: 'gsc',
      }));
    }
  }

  return issues;
}

function mapMobileIssueType(gscIssueType: string): IssueType {
  const typeMap: Record<string, IssueType> = {
    'MOBILE_FRIENDLY_RULE_VIEWPORT_NOT_CONFIGURED': 'no_viewport',
    'MOBILE_FRIENDLY_RULE_CONTENT_NOT_SIZED_TO_VIEWPORT': 'content_wider_than_screen',
    'MOBILE_FRIENDLY_RULE_USE_READABLE_FONT_SIZES': 'text_too_small',
    'MOBILE_FRIENDLY_RULE_TAP_TARGETS_TOO_CLOSE': 'tap_targets_too_close',
  };

  return typeMap[gscIssueType] || 'no_viewport';
}

function getMobileSuggestedFix(issueType: IssueType): string {
  const fixes: Record<IssueType, string> = {
    'no_viewport': 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the page head.',
    'content_wider_than_screen': 'Use responsive CSS and avoid fixed-width elements wider than the viewport.',
    'text_too_small': 'Use a minimum font size of 16px for body text on mobile.',
    'tap_targets_too_close': 'Ensure tap targets are at least 48x48px with adequate spacing.',
  } as Record<IssueType, string>;

  return fixes[issueType] || 'Review the mobile usability of this page.';
}

function mapRichResultsIssues(
  url: string,
  richResults: NonNullable<URLInspectionResult['richResultsResult']>,
  now: string
): Issue[] {
  const issues: Issue[] = [];

  if (richResults.verdict !== 'PASS' && richResults.detectedItems) {
    for (const detectedItem of richResults.detectedItems) {
      const schemaType = detectedItem.richResultType;

      for (const item of detectedItem.items || []) {
        if (item.issues) {
          for (const issue of item.issues) {
            // Determine if this is a missing field or invalid value
            const isMissingField = issue.issueMessage?.toLowerCase().includes('missing');
            const isInvalidValue = issue.issueMessage?.toLowerCase().includes('invalid');

            let issueType: IssueType = 'missing_required_field';
            if (isInvalidValue) {
              issueType = 'invalid_field_value';
            } else if (!isMissingField && issue.severity === 'WARNING') {
              issueType = 'missing_recommended_field';
            }

            issues.push(createIssue({
              url,
              category: 'structured_data',
              type: issueType,
              severity: issue.severity === 'ERROR' ? 'error' : 'warning',
              message: issue.issueMessage || `Structured data issue in ${schemaType}`,
              details: {
                schema_type: schemaType,
                item_name: item.name,
                gsc_message: issue.issueMessage,
                gsc_severity: issue.severity,
              },
              suggestedFix: getStructuredDataFix(schemaType, issue.issueMessage || ''),
              detectedAt: now,
              source: 'gsc',
            }));
          }
        }
      }
    }
  }

  return issues;
}

function getStructuredDataFix(schemaType: string, issueMessage: string): string {
  // Extract field name from message if possible
  const fieldMatch = issueMessage.match(/["']([^"']+)["']/);
  const fieldName = fieldMatch ? fieldMatch[1] : 'the required field';

  return `Add or fix ${fieldName} in your ${schemaType} structured data. See https://developers.google.com/search/docs/appearance/structured-data for schema requirements.`;
}

interface CreateIssueParams {
  url: string;
  category: IssueCategory;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  details: Record<string, unknown>;
  suggestedFix: string;
  detectedAt: string;
  source: 'gsc' | 'validator';
}

function createIssue(params: CreateIssueParams): Issue {
  // Filter out undefined values from details to prevent DynamoDB errors
  const cleanDetails: Record<string, unknown> = {
    message: params.message,
    source: params.source,
  };

  for (const [key, value] of Object.entries(params.details)) {
    if (value !== undefined) {
      cleanDetails[key] = value;
    }
  }

  return {
    id: '', // Will be assigned when storing
    url: params.url,
    category: params.category,
    type: params.type,
    severity: params.severity,
    details: cleanDetails,
    auto_fixable: false,
    suggested_fix: params.suggestedFix,
    detected_at: params.detectedAt,
  };
}
