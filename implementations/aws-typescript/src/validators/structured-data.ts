import type { Issue, ValidatorResult } from '../types';

// Required fields per schema type
const REQUIRED_FIELDS: Record<string, string[]> = {
  VideoObject: ['name', 'thumbnailUrl', 'uploadDate'],
  Product: ['name', 'image'],
  Article: ['headline', 'image', 'datePublished', 'author'],
  FAQPage: ['mainEntity'],
  BreadcrumbList: ['itemListElement'],
  Organization: ['name', 'url'],
  LocalBusiness: ['name', 'address'],
};

// Recommended fields per schema type
const RECOMMENDED_FIELDS: Record<string, string[]> = {
  VideoObject: ['description', 'duration', 'contentUrl', 'embedUrl'],
  Product: ['description', 'brand', 'sku', 'review', 'aggregateRating', 'offers'],
  Article: ['description', 'dateModified', 'publisher'],
};

interface JsonLdObject {
  '@type'?: string;
  '@context'?: string;
  [key: string]: unknown;
}

export async function validateStructuredData(url: string): Promise<ValidatorResult> {
  const issues: Issue[] = [];
  const now = new Date().toISOString();

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEO-Solver/1.0 (Structured Data Validator)',
      },
    });

    if (!response.ok) {
      // HTTP errors are handled by the indexing validator
      return { issues: [], urls_checked: 1 };
    }

    const html = await response.text();

    // Extract JSON-LD scripts
    const jsonLdScripts = extractJsonLd(html);

    if (jsonLdScripts.length === 0) {
      issues.push({
        id: '', // Will be assigned by handler
        url,
        category: 'structured_data',
        type: 'missing_schema',
        severity: 'error',
        details: {
          message: 'No JSON-LD structured data found on page',
        },
        auto_fixable: false,
        suggested_fix: 'Add JSON-LD structured data to the page. Common types include Article, Product, Organization, or BreadcrumbList.',
        detected_at: now,
      });
      return { issues, urls_checked: 1 };
    }

    // Validate each JSON-LD object
    for (const jsonLd of jsonLdScripts) {
      const schemaIssues = validateSchema(jsonLd, url, now);
      issues.push(...schemaIssues);
    }

    return { issues, urls_checked: 1 };
  } catch (error) {
    console.error(`Error validating structured data for ${url}:`, error);
    return { issues: [], urls_checked: 1 };
  }
}

function extractJsonLd(html: string): JsonLdObject[] {
  const results: JsonLdObject[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const content = match[1].trim();
      const parsed = JSON.parse(content);

      // Handle @graph arrays
      if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        results.push(...parsed['@graph']);
      } else if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch (e) {
      // JSON parse error - this is a syntax_error issue
      results.push({ '@type': '__PARSE_ERROR__', __error: String(e) });
    }
  }

  return results;
}

function validateSchema(jsonLd: JsonLdObject, url: string, now: string): Issue[] {
  const issues: Issue[] = [];

  // Check for parse errors
  if (jsonLd['@type'] === '__PARSE_ERROR__') {
    issues.push({
      id: '',
      url,
      category: 'structured_data',
      type: 'syntax_error',
      severity: 'error',
      details: {
        message: 'JSON-LD has syntax errors',
        error: String(jsonLd.__error),
      },
      auto_fixable: true,
      suggested_fix: 'Fix JSON syntax errors. Use JSON.stringify() to generate JSON-LD instead of template literals.',
      detected_at: now,
    });
    return issues;
  }

  const schemaType = String(jsonLd['@type'] || 'Unknown');

  // Check required fields
  const requiredFields = REQUIRED_FIELDS[schemaType] || [];
  for (const field of requiredFields) {
    if (!hasField(jsonLd, field)) {
      issues.push({
        id: '',
        url,
        category: 'structured_data',
        type: 'missing_required_field',
        severity: 'error',
        details: {
          schema_type: schemaType,
          field,
          message: `Required field '${field}' is missing from ${schemaType} schema`,
        },
        auto_fixable: true,
        suggested_fix: `Add '${field}' field to the ${schemaType} schema`,
        detected_at: now,
      });
    }
  }

  // Check recommended fields
  const recommendedFields = RECOMMENDED_FIELDS[schemaType] || [];
  for (const field of recommendedFields) {
    if (!hasField(jsonLd, field)) {
      issues.push({
        id: '',
        url,
        category: 'structured_data',
        type: 'missing_recommended_field',
        severity: 'warning',
        details: {
          schema_type: schemaType,
          field,
          message: `Recommended field '${field}' is missing from ${schemaType} schema`,
        },
        auto_fixable: true,
        suggested_fix: `Consider adding '${field}' field to improve rich result display`,
        detected_at: now,
      });
    }
  }

  // Validate date formats
  const dateFields = ['datePublished', 'dateModified', 'uploadDate'];
  for (const field of dateFields) {
    if (hasField(jsonLd, field)) {
      const value = jsonLd[field];
      if (typeof value === 'string' && !isValidISODate(value)) {
        issues.push({
          id: '',
          url,
          category: 'structured_data',
          type: 'invalid_field_value',
          severity: 'error',
          details: {
            schema_type: schemaType,
            field,
            message: `Field '${field}' has invalid date format`,
            expected: 'ISO 8601 format (e.g., 2025-01-04T10:00:00Z)',
            actual: String(value),
          },
          auto_fixable: true,
          suggested_fix: `Convert '${field}' to ISO 8601 format using new Date().toISOString()`,
          detected_at: now,
        });
      }
    }
  }

  // Validate URL fields
  const urlFields = ['url', 'image', 'thumbnailUrl', 'contentUrl'];
  for (const field of urlFields) {
    if (hasField(jsonLd, field)) {
      const value = getFieldValue(jsonLd, field);
      if (typeof value === 'string' && value.startsWith('/')) {
        issues.push({
          id: '',
          url,
          category: 'structured_data',
          type: 'invalid_field_value',
          severity: 'error',
          details: {
            schema_type: schemaType,
            field,
            message: `Field '${field}' has relative URL`,
            expected: 'Absolute URL',
            actual: value,
          },
          auto_fixable: true,
          suggested_fix: `Convert '${field}' to an absolute URL (e.g., https://example.com${value})`,
          detected_at: now,
        });
      }
    }
  }

  return issues;
}

function hasField(obj: JsonLdObject, field: string): boolean {
  if (obj[field] !== undefined && obj[field] !== null && obj[field] !== '') {
    return true;
  }
  return false;
}

function getFieldValue(obj: JsonLdObject, field: string): unknown {
  const value = obj[field];
  // Handle image as array or object
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'object' && value !== null && 'url' in value) {
    return (value as { url: unknown }).url;
  }
  return value;
}

function isValidISODate(value: string): boolean {
  // Check if it looks like an ISO 8601 date
  const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoPattern.test(value);
}
