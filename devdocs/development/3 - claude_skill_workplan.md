# Workplan 3: Claude Code Skill Integration

## Overview

**Problem:** The SEO Solver service detects issues, but fixing them still requires manual work. Developers need to find the right files, understand the fix, and implement it correctly.

**Solution:** Create a Claude Code skill (`/gsc-solver`) that:
- Calls the SEO Solver API to detect issues
- Analyzes the local codebase to find fix locations
- Auto-fixes simple issues (missing schema fields, canonical tags)
- Generates workplans for complex issues

**Constraints:**
- Skill must work with ANY backend implementation (user configures API URL)
- Must follow existing skill patterns in `~/.claude/skills/`
- Should integrate with Playwright MCP for GSC UI access when needed (optional)
- Fix strategies must be codebase-agnostic (work with any framework)

---

## Implementation Strategy

**Approach:** Build the skill in layers:
1. API integration (call user's deployed SEO Solver instance)
2. Enhance existing issue knowledge base with search patterns
3. Codebase analysis (find relevant files for each issue)
4. Fix engine (auto-fix or generate workplan)

**Key Decisions:**
- Skill file: `skill/gsc-solver/SKILL.md` (in seo-solver repo for distribution)
- Configuration via environment: `SEO_SOLVER_API_URL`, `SEO_SOLVER_API_KEY`
- Reference `docs/issue-knowledge-base.md` for fix strategies (already exists)
- Use Claude Code tools: Grep for discovery, Read for context, Edit for fixes
- Playwright MCP is optional - skill works without it

**Dependencies:**
- User has deployed an SEO Solver instance (any implementation)
- User has Claude Code installed
- Optional: Playwright MCP configured in `~/.claude/settings.json`

---

## Existing Resources

These already exist and should be referenced, not recreated:

| Resource | Location | Purpose |
|----------|----------|---------|
| Issue Knowledge Base | `docs/issue-knowledge-base.md` | Issue types → fix strategies |
| API Contract | `docs/api-contract.md` | API endpoints for validation |
| Existing Skills | `~/.claude/skills/google-analytics/` | Pattern to follow |

---

## Phase 1: Basic Skill Structure

- **STATUS:** PENDING
- **Goal:** Create the skill skeleton that can call the API and display issues
- **Estimated Effort:** Small (1-2 sessions)
- **Notes:**
    - Follow patterns from existing skills (google-analytics, audit-code)
    - Start simple - just detect and display issues
    - Configuration via environment variables

### Target State:

```
skill/gsc-solver/
└── SKILL.md              # Skill definition with all sections
```

### Tasks:

- **1.1. Create Skill File:**
    - File: `skill/gsc-solver/SKILL.md`
    - Add frontmatter: name, description, trigger phrases
    - Trigger phrases: "check SEO", "GSC issues", "fix search console", "validate SEO"

- **1.2. Define Configuration Section:**
    - Environment variables: `SEO_SOLVER_API_URL`, `SEO_SOLVER_API_KEY`
    - First-run prompt if not configured
    - Example: `export SEO_SOLVER_API_URL=https://your-api.execute-api.us-west-2.amazonaws.com/dev`

- **1.3. Define Detection Workflow:**
    - Step 1: Detect site URL from codebase (package.json homepage, CNAME, etc.)
    - Step 2: Prompt user if site URL unclear
    - Step 3: Call POST /validate with WebFetch tool
    - Step 4: Parse and display issues grouped by severity/category

- **1.4. Verify:**
    - Copy skill to `~/.claude/skills/gsc-solver/`
    - Test trigger phrases invoke skill
    - Test API call works with deployed instance
    - Test with both AWS and Cloudflare implementations

---

## Phase 2: Enhance Issue Knowledge Base

- **STATUS:** PENDING
- **Goal:** Add search patterns and confidence scoring to existing knowledge base
- **Estimated Effort:** Small (1-2 sessions)
- **Notes:**
    - `docs/issue-knowledge-base.md` already has issue types and fix strategies
    - This phase adds: search patterns for file discovery, confidence criteria
    - Keep knowledge base as reference doc, embed key patterns in SKILL.md

### Tasks:

- **2.1. Add Search Patterns for Structured Data:**
    - File: `docs/issue-knowledge-base.md`
    - Add Grep patterns: `application/ld\\+json`, `JSON.stringify.*@type`
    - Add Glob patterns: `**/page.tsx`, `**/layout.tsx`, `**/*.html`
    - Document framework-specific locations (Next.js, Astro, static)

- **2.2. Add Search Patterns for Indexing:**
    - Add patterns for: canonical tags, robots.txt, meta robots
    - Grep patterns: `rel="canonical"`, `<meta name="robots"`
    - Glob patterns: `public/robots.txt`, `**/head.tsx`, `**/layout.tsx`

- **2.3. Add Search Patterns for Performance/Mobile:**
    - Add patterns for: viewport, image optimization
    - Grep patterns: `viewport`, `<img`, `next/image`
    - Note: Performance issues often not auto-fixable

- **2.4. Add Confidence Scoring Criteria:**
    - High: Single file match, clear fix location, simple change
    - Medium: Multiple candidates, needs verification
    - Low: Framework-specific handling needed, complex change

- **2.5. Embed Key Patterns in SKILL.md:**
    - File: `skill/gsc-solver/SKILL.md`
    - Add "Search Patterns" section with common patterns
    - Reference full knowledge base for details

- **2.6. Verify:**
    - Patterns work against calminterview.com codebase
    - Patterns work against guessthelp.com codebase (different structure)
    - Documentation is clear and complete

---

## Phase 3: Codebase Analysis

- **STATUS:** PENDING
- **Goal:** Automatically find files relevant to each issue using Claude Code tools
- **Estimated Effort:** Medium (2-3 sessions)
- **Notes:**
    - Use Grep tool for content search
    - Use Glob tool for file pattern matching
    - Use Read tool to gather context
    - Implement framework detection heuristics

### Tasks:

- **3.1. Add Framework Detection:**
    - File: `skill/gsc-solver/SKILL.md`
    - Detect Next.js: `next.config.js` or `next.config.mjs` exists
    - Detect React: `package.json` has `react` dependency
    - Detect Astro: `astro.config.mjs` exists
    - Detect static: `index.html` in root or `public/`

- **3.2. Add File Discovery Workflow:**
    - For each issue type, define search strategy
    - Use Grep with patterns from Phase 2
    - Fallback to Glob if Grep finds nothing
    - Return list of candidate files with confidence

- **3.3. Add Context Gathering Workflow:**
    - For high-confidence matches: Read file, identify exact location
    - For medium-confidence: Read file, present options to user
    - For low-confidence: Describe issue, ask user for guidance

- **3.4. Verify:**
    - Test file discovery against multiple codebases
    - Verify confidence scoring is accurate
    - Document any framework-specific edge cases

---

## Phase 4: Fix Engine

- **STATUS:** PENDING
- **Goal:** Implement auto-fix for high-confidence issues, workplan generation for others
- **Estimated Effort:** Medium (2-3 sessions)
- **Notes:**
    - Be conservative - only auto-fix when confident
    - Use Edit tool for fixes (not Write - preserves file content)
    - Always offer to verify fix by re-running validation
    - For complex issues, generate workplan using workplan-write patterns

### Tasks:

- **4.1. Add Auto-Fix Workflow:**
    - File: `skill/gsc-solver/SKILL.md`
    - For high-confidence issues: propose fix, ask for confirmation
    - Use Edit tool to apply fix
    - Offer to re-validate after fix

- **4.2. Add Auto-Fix Templates:**
    - Missing JSON-LD field: Insert field into existing schema
    - Missing canonical: Add to head/layout
    - Missing viewport: Add meta tag
    - Robots.txt issues: Edit or create file

- **4.3. Add Workplan Generation:**
    - For low-confidence or complex issues
    - Generate workplan following `devdocs/development/` format
    - Include verification steps
    - Reference workplan-write skill for format

- **4.4. Add Fix Interaction Flow:**
    - Present all issues to user
    - For each issue: show category, severity, suggested fix
    - Options: "Auto-fix", "Generate workplan", "Skip", "Skip all"
    - Track fixes applied for summary

- **4.5. Verify:**
    - Auto-fix works for structured data issues
    - Auto-fix works for canonical/viewport issues
    - Workplans are correctly formatted
    - Re-validation confirms fixes work

---

## Phase 5: Playwright MCP Integration (OPTIONAL)

- **STATUS:** PENDING
- **Goal:** Enable direct GSC access for issues not available via API
- **Estimated Effort:** Medium (2-3 sessions)
- **Prerequisite:** Playwright MCP configured in `~/.claude/settings.json`
- **Notes:**
    - This phase is OPTIONAL - skill works without it
    - Playwright MCP allows browser automation
    - User logs in to GSC once, session persists
    - Useful for Enhancement reports not available via API
    - **Risk:** GSC UI changes could break navigation - fragile

### Prerequisite Configuration:

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Tasks:

- **5.1. Add Playwright Detection:**
    - File: `skill/gsc-solver/SKILL.md`
    - Check if Playwright MCP tools are available
    - If not available, skip Playwright features gracefully
    - Document in skill that this is optional

- **5.2. Add GSC Navigation Workflow:**
    - Navigate to `https://search.google.com/search-console`
    - If not logged in, prompt user to log in manually
    - Navigate to property selection
    - Navigate to Enhancement or Coverage reports

- **5.3. Add Data Extraction:**
    - Extract issue details from GSC UI tables
    - Parse into standard issue format (matches API response)
    - Merge with API-detected issues (deduplicate)

- **5.4. Verify:**
    - Test with Playwright MCP configured
    - Test graceful fallback when Playwright not available
    - Document any GSC UI navigation quirks

---

## Expected Results

After completing this workplan:
- `/gsc-solver` skill fully functional
- Can detect issues via API call
- Can auto-fix high-confidence issues using Edit tool
- Can generate workplans for complex issues
- Optional Playwright integration for GSC deep-dives
- Tested against real codebases (calminterview, guessthelp)
- Skill distributable via seo-solver repo

---

## Risks & Unknowns

- **Risk:** Different frameworks may need different fix strategies - may need more heuristics
- **Risk:** GSC UI changes frequently - Playwright navigation may break
- **Unknown:** How well do search patterns generalize across diverse codebases?
- **Unknown:** Will users prefer auto-fix or workplan generation?

---

## TRACKING SUMMARY

_To be filled in after completion of work in a phase_

### Phase 1 Completed Features

- TBD

### Phase 2 Completed Features

- TBD

### Phase 3 Completed Features

- TBD

### Phase 4 Completed Features

- TBD

### Phase 5 Completed Features

- TBD

### Additional Implementations Beyond Original Tasks

- TBD

### Deferred/Not Implemented Items

- TBD

### Technical Notes and Learnings

- TBD

### Key Files Modified

- TBD
