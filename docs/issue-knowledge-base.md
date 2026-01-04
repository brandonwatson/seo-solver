# Issue Knowledge Base

This document maps Google Search Console issue types to detection methods and fix strategies. Used by both the validators and the Claude Code skill.

---

## Structured Data Issues

### `structured_data.missing_required_field`

**Description:** A required field is missing from a schema.org type.

**Detection:**
1. Fetch page HTML
2. Parse JSON-LD scripts
3. Validate against schema.org requirements

**Common Examples:**

| Schema Type | Required Fields |
|-------------|-----------------|
| VideoObject | `name`, `thumbnailUrl`, `uploadDate` |
| Product | `name`, `image`, `offers` (with `price`, `priceCurrency`) |
| Article | `headline`, `image`, `datePublished`, `author` |
| FAQPage | `mainEntity` (array of Question/Answer) |
| BreadcrumbList | `itemListElement` (with `item`, `name`, `position`) |
| Organization | `name`, `url` |
| LocalBusiness | `name`, `address`, `telephone` |

**Auto-Fix Strategy:**

For Next.js/React apps, search for JSON-LD structured data:

```typescript
// Pattern to search for
const structuredData = {
  '@type': 'VideoObject',
  // ... existing fields
};

// Fix: Add missing field
const structuredData = {
  '@type': 'VideoObject',
  uploadDate: question.createdAt,  // Add ISO 8601 date
  thumbnailUrl: 'https://example.com/thumbnail.jpg',  // Add thumbnail
  // ... existing fields
};
```

**Files to Search:**
- `**/page.tsx` - Next.js pages
- `**/layout.tsx` - Layout files
- `**/*schema*.ts` - Schema utilities
- `**/structured-data.ts` - Dedicated schema files

**Fix Verification:**
- Re-fetch page, parse JSON-LD
- Verify field is present and valid

---

### `structured_data.missing_recommended_field`

**Description:** An optional but recommended field is missing.

**Detection:** Same as required fields, but check recommended list.

**Recommended Fields by Type:**

| Schema Type | Recommended Fields |
|-------------|-------------------|
| VideoObject | `description`, `duration`, `contentUrl`, `embedUrl` |
| Product | `description`, `brand`, `sku`, `review`, `aggregateRating` |
| Article | `description`, `dateModified`, `publisher` |

**Auto-Fix Strategy:** Same as required fields.

**Severity:** Warning (doesn't block rich results but improves them)

---

### `structured_data.invalid_field_value`

**Description:** Field value doesn't match expected format.

**Common Issues:**

| Field | Expected Format | Common Mistake |
|-------|-----------------|----------------|
| `uploadDate` | ISO 8601 (`2025-01-04T00:00:00Z`) | Human date (`January 4, 2025`) |
| `duration` | ISO 8601 duration (`PT15M30S`) | Plain text (`15 minutes`) |
| `price` | Number as string (`"29.99"`) | Number (`29.99`) |
| `url` | Absolute URL | Relative URL (`/page`) |

**Auto-Fix Strategy:**

```typescript
// Before (wrong)
uploadDate: 'January 4, 2025',

// After (correct)
uploadDate: new Date('2025-01-04').toISOString(),
```

---

### `structured_data.syntax_error`

**Description:** JSON-LD has syntax errors.

**Detection:** JSON.parse fails on script content.

**Common Causes:**
- Trailing commas
- Unescaped quotes in strings
- Missing commas between properties
- Template literal issues

**Auto-Fix Strategy:**

Search for JSON-LD generation code and fix syntax:

```typescript
// Problematic pattern
const data = `{
  "@type": "VideoObject",
  "name": "${title}",  // Unescaped quotes in title will break this
}`;

// Better pattern
const data = JSON.stringify({
  '@type': 'VideoObject',
  name: title,  // Properly escaped
});
```

---

## Indexing Issues

### `indexing.duplicate_without_canonical`

**Description:** Multiple URLs serve same/similar content without canonical tag.

**Detection:**
1. Check for `<link rel="canonical">` tag
2. Verify canonical URL matches current URL
3. Check if www/non-www, http/https variants exist

**Auto-Fix Strategy:**

For Next.js:

```typescript
// In page metadata
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.example.com/page',
  },
};

// Or in layout.tsx for site-wide
```

**Files to Search:**
- `**/layout.tsx` - Root layout
- `**/page.tsx` - Individual pages
- `next.config.js` - Redirects

---

### `indexing.blocked_by_robots`

**Description:** robots.txt is blocking Googlebot from crawling.

**Detection:**
1. Fetch `/robots.txt`
2. Parse rules for Googlebot
3. Check if current URL path is disallowed

**Auto-Fix Strategy:**

```
# robots.txt
# Before
User-agent: *
Disallow: /questions/

# After
User-agent: *
Disallow: /admin/
Allow: /questions/
```

**Files to Search:**
- `public/robots.txt`
- `app/robots.ts` (Next.js dynamic robots)

---

### `indexing.not_found_404`

**Description:** Page returns 404 status code.

**Detection:** HTTP request returns 404.

**Possible Fixes:**
1. **Content was moved:** Add redirect
2. **Content was deleted:** Remove internal links
3. **URL typo:** Fix the URL

**Auto-Fix Strategy (redirects):**

```typescript
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,
      },
    ];
  },
};
```

---

### `indexing.redirect_chain`

**Description:** Multiple redirects before reaching final URL.

**Detection:**
1. Follow redirects
2. Count hops
3. Flag if > 1 redirect

**Auto-Fix Strategy:**

Update redirect to point directly to final URL:

```typescript
// Before: A → B → C
{ source: '/a', destination: '/b', permanent: true },
{ source: '/b', destination: '/c', permanent: true },

// After: A → C, B → C
{ source: '/a', destination: '/c', permanent: true },
{ source: '/b', destination: '/c', permanent: true },
```

---

## Performance Issues

### `performance.poor_lcp`

**Description:** Largest Contentful Paint > 4 seconds.

**Detection:** PageSpeed Insights API.

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Large images | Compress, use WebP/AVIF, add width/height |
| Slow server | Enable caching, use CDN |
| Render-blocking JS | Defer non-critical scripts |
| Web fonts | Use `font-display: swap`, preload fonts |

**Auto-Fix Examples:**

```typescript
// Image optimization (Next.js)
import Image from 'next/image';
<Image
  src="/hero.jpg"
  width={1200}
  height={600}
  priority  // Preload above-fold images
/>

// Font optimization
<link rel="preload" href="/fonts/main.woff2" as="font" crossOrigin="" />
```

**Files to Search:**
- `**/layout.tsx` - Font loading
- `**/*.tsx` - Image components
- `next.config.js` - Image optimization config

---

### `performance.poor_cls`

**Description:** Cumulative Layout Shift > 0.25.

**Detection:** PageSpeed Insights API.

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Images without dimensions | Add width/height attributes |
| Ads/embeds without space | Reserve space with aspect-ratio |
| Dynamic content injection | Avoid inserting above existing content |
| Web fonts causing FOUT | Use `font-display: optional` |

**Auto-Fix Examples:**

```typescript
// Always set dimensions
<Image width={800} height={600} ... />

// Reserve space for dynamic content
<div style={{ aspectRatio: '16/9' }}>
  <iframe ... />
</div>
```

---

### `performance.poor_inp`

**Description:** Interaction to Next Paint > 500ms.

**Detection:** PageSpeed Insights API.

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Heavy JS execution | Code split, lazy load |
| Long tasks | Break up with `setTimeout` or `requestIdleCallback` |
| Blocking event handlers | Debounce, use passive listeners |

**Auto-Fix Examples:**

```typescript
// Dynamic import for heavy components
const HeavyChart = dynamic(() => import('./Chart'), { ssr: false });

// Debounce handlers
const handleScroll = useDebouncedCallback(() => { ... }, 100);
```

---

## Mobile Issues

### `mobile.no_viewport`

**Description:** Viewport meta tag is missing.

**Detection:** Check for `<meta name="viewport">` in `<head>`.

**Auto-Fix Strategy:**

```html
<!-- Add to <head> -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

For Next.js, this is automatic in app router. Check if using pages router:

```typescript
// pages/_document.tsx
<Head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</Head>
```

---

### `mobile.text_too_small`

**Description:** Font size is below 12px on mobile.

**Detection:**
1. Render page at mobile viewport
2. Compute font sizes
3. Flag elements < 12px

**Auto-Fix Strategy:**

```css
/* Ensure base font size */
html {
  font-size: 16px;
}

/* Use relative units */
.small-text {
  font-size: 0.875rem; /* 14px, not 10px */
}

/* Mobile-specific sizing */
@media (max-width: 768px) {
  body {
    font-size: 16px;
  }
}
```

---

### `mobile.tap_targets_too_close`

**Description:** Interactive elements are too close together (< 48px).

**Detection:**
1. Identify interactive elements (links, buttons)
2. Calculate bounding boxes
3. Check spacing

**Auto-Fix Strategy:**

```css
/* Ensure minimum tap target size */
button, a {
  min-height: 48px;
  min-width: 48px;
  padding: 12px;
}

/* Add spacing between links in lists */
nav li {
  margin-bottom: 8px;
}
```

---

## Detection Priority

For efficient validation, run checks in this order:

1. **Quick checks (no HTTP required):**
   - robots.txt (fetch once, check many URLs)
   - Sitemap parsing

2. **Page fetch checks (one request per URL):**
   - HTTP status code
   - Canonical tag
   - Viewport tag
   - JSON-LD parsing

3. **API checks (rate limited):**
   - PageSpeed Insights (25K/day free)
   - GSC URL Inspection (2K/day per property)

---

## Fix Confidence Levels

| Confidence | Description | Action |
|------------|-------------|--------|
| High | Clear fix, unlikely to break anything | Auto-fix |
| Medium | Likely correct but should verify | Auto-fix with verification |
| Low | Multiple possible fixes, context needed | Generate workplan |

**High Confidence Examples:**
- Adding missing schema field with known value
- Adding viewport meta tag
- Fixing ISO 8601 date format

**Low Confidence Examples:**
- Improving LCP (many possible causes)
- Fixing "crawled not indexed" (content quality issue)
- Resolving duplicate content (need to understand intent)
