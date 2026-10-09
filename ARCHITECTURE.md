# Nexversal — Architecture Blueprint

## Architectural Overview & Philosophy

The objective of **Phase 1** is to decouple a monolithic, single-file HTML prototype (~3,200 lines containing mixed inline script tags, UI markup, styling, and regex evaluation) into a production-grade, maintainable Next.js 15 + TypeScript platform.

---

## 1. Separation of Concerns

### The Anti-Pattern: Business Logic in UI
In traditional ad-hoc frontend prototypes, user interaction directly triggers business operations:
```
[Button Click] → calculateSeoScore() → regexReplace() → updateDom() → storeToLocalStorage()
```
This pattern creates severe architectural debt:
1. **Untestable Logic:** SEO algorithms cannot be tested without rendering full browser DOM elements.
2. **Coupled Rendering:** Changing visual styles risks breaking algorithmic calculations.
3. **Security Vulnerabilities:** Direct browser execution encourages exposing sensitive secrets (such as API keys) directly inside client bundles.

### The Correct Service-Oriented Architecture (Phase 1+ Standard)
Our architecture follows strict unidirectional data flow and clean isolation:
```
┌────────────────────────────────────────────────────────┐
│                      UI Components                     │
│  (Pure Presentation, Accessibility, Semantic Elements)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Dispatches user input
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Custom React Hooks                    │
│   (useEditor: Pure state management, input debouncing)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Calls abstract service
                           ▼
┌────────────────────────────────────────────────────────┐
│               Future Service Layer (Phase 2)           │
│   (SeoEngineService, CrawlerService, PatternService)   │
└──────────────────────────┬─────────────────────────────┘
                           │ Executes pure algorithm / server API
                           ▼
┌────────────────────────────────────────────────────────┐
│                 Engine / Engine Models                 │
│      (Rank Factors, AST Parser, Schema Builder)        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

All UI components are organized strictly by single responsibility:

| Component Category | Location | Responsibility |
| :--- | :--- | :--- |
| **Design System** | `src/components/ui/` | Headless, accessible primitives (`Button`, `Card`, `Badge`, `Tabs`, `Dialog`, `Progress`) using Tailwind CSS and `cn` utilities. |
| **Layout** | `src/components/layout/` | Shell, Navigation header, Responsive sidebar, and Theme wrappers (`AppShell`, `Header`, `Sidebar`). |
| **Dashboard** | `src/components/dashboard/` | High-level metrics, health status cards, and audit summaries (`DashboardHeader`, `SeoScoreCard`, `StatsCard`, `IssueSummary`). |
| **Content Analyzer** | `src/components/analyzer/` | On-page content editor, keyword input, SERP simulation, and live inspector (`ContentEditor`, `KeywordInput`, `SerpPreview`, `ContentStats`, `AnalyzerTabs`, `SeoChecklist`). |
| **Humanizer & Patterns** | `src/components/humanizer/` | Monitored phrase inspector, tone panels, and diff comparator (`AiPatternPanel`, `HumanizerPanel`, `DiffViewer`). |
| **Schema & FAQ** | `src/components/schema/`, `src/components/faq/` | Structured data preview, JSON-LD generation, and interactive FAQ widgets (`SchemaPreview`, `FaqGenerator`, `FaqItem`). |

---

## 3. Future Services Roadmap

### A. SEO Scoring Engine (Target: Phase 2)
* **Location:** `src/lib/services/seoEngine.ts`
* **Specification:** Evaluates an abstract `SeoDocument` against parameterized rules:
  1. Title length & keyword placement.
  2. First 10% intro hook keyword verification.
  3. URL slug alignment.
  4. Keyword density range calculation (0.8% – 2.0%).
  5. Scannability metrics (paragraph word count < 80 words).
  6. Subheading hierarchy (H1 → H2 → H3 validation).
* **Return Type:** Returns a typed `SeoAnalysisResult` object. The UI receives only the calculated result without knowing how it was derived.

### B. Site Crawler Engine (Target: Phase 2)
* **Location:** `src/lib/services/crawler/`
* **Specification:** Server-side crawler queue:
  1. Respects `robots.txt` and sitemap indices.
  2. Traverses internal links up to configured crawl depth.
  3. Detects broken links (404), redirect chains (301/302), canonical tags, and missing image alt attributes.
  4. Runs strictly via Node.js background workers / Edge functions — never blocking browser threads.

### C. Pattern Cleaner & Style Service (Target: Phase 2)
* **Location:** `src/lib/services/patternCleaner.ts`
* **Specification:**
  1. Maintains a curated dictionary of repetitive clichés, stiff academic filler, and buzzwords (`delve`, `tapestry`, `testament`, `paramount`).
  2. Offers contextual human replacements.
  3. Replaces false "100% Undetectable AI" claims with realistic readability and burstiness enhancements.

### D. Secure AI Backend Service (Target: Future Phase)
* **Location:** `src/app/api/ai/route.ts`
* **Specification:**
  1. Server-side only API routes.
  2. Zero browser-side API keys (`GEMINI_API_KEY` stored exclusively in server environment variables).
  3. Strict input sanitization and rate limiting.

---

## 4. Security & Data Integrity Rules

1. **No Client API Keys:** Third-party credentials must never be bundled into client-side JS or rendered in HTML markup.
2. **Safe Preview:** Avoid raw `dangerouslySetInnerHTML` for user content. In Phase 1, preview renders structured clean text; in Phase 2, a validated, sanitized Markdown parser will be introduced.
3. **No Misleading Marketing Copy:** Replaced deceptive claims (e.g. "100% Undetectable", "Passes Turnitin") with transparent, industry-standard SEO terminology ("SEO Optimization Score", "Repetitive Pattern Cleaner").
