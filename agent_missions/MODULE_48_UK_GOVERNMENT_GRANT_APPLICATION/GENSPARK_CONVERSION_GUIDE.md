# GENSPARK CONVERSION GUIDE — MODULE 48
## Converting .md Documents → Slides, Spreadsheets & Docs

**Created:** 12 February 2026
**Purpose:** Map each MODULE_48 document to its Genspark output type, flag size issues, and provide ready-to-use prompts.

---

## GENSPARK CAPABILITIES (Research Summary)

**What Genspark can do:**
- **AI Slides** — Upload .md/PDF/Word → polished slide deck (PPT export)
- **AI Sheets** — Upload .md/PDF/Word → intelligent spreadsheet (Excel export)
- **AI Docs** — Upload .md/PDF/Word → professionally designed document (PDF/Word export)
- **File limit:** 100MB per file (all your files are well under this)
- **Strengths:** Extracts key figures, builds charts, applies consistent design, accepts natural language styling commands
- **Weakness:** May hallucinate figures if source is ambiguous — your .md files must have clean, unambiguous numbers

**Best practices for feeding Genspark:**
1. One document per conversion (don't combine unrelated content)
2. Clear markdown headings (H1/H2/H3) — Genspark maps these to slide titles and sections
3. Explicit numbers with context (e.g., "£12,500 Year 1 revenue" not just "£12.5k")
4. Tables render well — use markdown tables for data that should become charts
5. Remove internal notes/comments before uploading (e.g., `[CUSTOMIZE]` placeholders should be filled first)
6. Provide a specific prompt alongside each file upload

---

## SIZE FLAGS

| Document | Size | Status |
|---|---|---|
| GRANT_RESEARCH_REPORT.md | **48.9KB** | TOO LARGE — Split before conversion (72 pages). Genspark will lose focus. Recommend splitting into 4 files by funding route. |
| BUSINESS_PLAN_COMPLETE.md | **39.5KB** | BORDERLINE — Works for AI Docs. For Slides, split into 2 uploads (Sections 1-4, Sections 5-11). |
| BUSINESS_PLAN_PART3.md | **37.6KB** | BORDERLINE — OK for Docs, may overwhelm Slides. |
| BUSINESS_PLAN_PART2.md | **32.7KB** | BORDERLINE — OK for Docs, may overwhelm Slides. |
| FINANCIAL_FORECASTS.md | 21.0KB | Fine |
| CUSTOMIZATION_CHECKLIST.md | 19.4KB | Fine |
| INVESTOR_READINESS_CHECKLIST.md | 17.6KB | Fine |
| INSTRUCTIONS.md | 14.3KB | Internal only — no conversion needed |
| GRANT_APPLICATION_TRACKER.md | 10.9KB | Fine |
| README.md | 10.7KB | Fine |
| PROGRESS.md | 10.2KB | Fine |
| COMPLETION_SUMMARY.md | 8.3KB | Internal only — no conversion needed |

---

## DOCUMENT → GENSPARK CONVERSION MAP

### PRIORITY 1: Documents You Need for Loan Application

These are the documents Start Up Loans will want to see.

---

#### 1. BUSINESS_PLAN_COMPLETE.md → AI Slides (Pitch Deck)

**Genspark tool:** AI Slides
**Output:** 15-20 slide pitch deck (PPT)

**Prompt:**

```
Create a 15-20 slide professional pitch deck from this business plan for ACG StaffLink, a healthcare workforce management SaaS platform.

Target audience: Start Up Loans assessor and business mentor (UK government scheme).
Tone: Professional, confident, data-driven. UK English throughout.

Required slides:
1. Title slide — "ACG StaffLink: Transforming Healthcare Workforce Management"
2. The Problem — NHS/care sector agency spend crisis (£3bn/year, 30% reduction mandate)
3. The Solution — WhatsApp-based shift management platform
4. How It Works — 3-step visual (Post shift → Staff notified → Auto-filled)
5. Target Market — UK healthcare: 1,200 care homes + 200 NHS trusts addressable
6. Business Model — SaaS tiers: Starter £250/mo, Professional £500/mo, Enterprise £1,000/mo
7. Competitive Advantage — WhatsApp (98% adoption) vs legacy portals, 90% faster fill rates
8. Traction & Validation — 30-agency founder network, 4 beta sites planned
9. Financial Summary — Year 1: £12.5k revenue, Year 2: £120k, Year 3: £450k
10. Use of Funds — £25k Start Up Loan breakdown (Development 40%, Beta 28%, Marketing 20%, Legal 12%)
11. 18-Month Roadmap — Milestones from loan to revenue
12. Team — Solo founder with domain expertise + planned hires
13. Risk Mitigation — Top 3 risks with mitigation strategies
14. The Ask — £25,000 Start Up Loan at 6% over 5 years
15. Contact & Next Steps

Use charts for: revenue projections, market size, use of funds breakdown.
Colour scheme: Professional blue/teal — healthcare industry appropriate.
Do NOT include any [CUSTOMIZE] placeholder text — skip those sections.
```

---

#### 2. FINANCIAL_FORECASTS.md → AI Sheets (Financial Model)

**Genspark tool:** AI Sheets
**Output:** Multi-tab Excel spreadsheet

**Prompt:**

```
Convert this financial forecast document into a professional multi-tab Excel spreadsheet for a UK Start Up Loans application.

Create these tabs:

Tab 1 — "Monthly Cash Flow" (Months 1-24):
- Rows: Revenue by tier (Starter/Professional/Enterprise), Total Revenue, then each expense category, Total Expenses, Net Cash Flow, Cumulative Cash Position
- Include the £25,000 loan injection in Month 1
- Highlight break-even month (Month 15) in green

Tab 2 — "Revenue Build-Up":
- Monthly customer acquisition by tier (Months 1-24)
- Monthly recurring revenue per tier
- Churn assumptions and net revenue
- Include a line chart showing revenue growth

Tab 3 — "Use of Funds":
- £25,000 allocation breakdown with amounts and percentages
- Include a pie chart

Tab 4 — "Loan Repayment":
- £25,000 at 6% over 60 months
- Monthly payment schedule showing principal, interest, balance remaining

Tab 5 — "Key Metrics Dashboard":
- Monthly: MRR, ARR, Customer Count, ARPU, Burn Rate, Runway
- Include sparkline charts

Format: Professional, clean. UK currency (£). All formulas should be editable.
```

---

#### 3. FINANCIAL_FORECASTS.md → AI Slides (Financial Summary)

**Genspark tool:** AI Slides
**Output:** 8-10 slide financial summary deck

**Prompt:**

```
Create an 8-10 slide financial summary presentation from this forecast document.

Target audience: Start Up Loans business mentor reviewing financial viability.
Tone: Conservative, data-driven, realistic. UK English.

Required slides:
1. Financial Overview — Key metrics at a glance
2. Revenue Model — SaaS pricing tiers with unit economics
3. Customer Acquisition Plan — Growth from 0 to 30+ customers
4. Monthly Cash Flow — Chart showing cash position Months 1-24
5. Use of Funds — £25k breakdown pie chart
6. Operating Costs — Burn rate progression
7. Loan Repayment — £25k at 6%, £483/month
8. Year 1-3 Projections — Revenue bar chart
9. Key Assumptions & Risks
10. Path to Profitability

Use charts on every slide. Colour scheme: Professional blue/green.
```

---

#### 4. GRANT_APPLICATION_TRACKER.md → AI Sheets (Application Tracker)

**Genspark tool:** AI Sheets
**Output:** Interactive tracker spreadsheet

**Prompt:**

```
Convert this grant application tracker into a professional Excel spreadsheet.

Create these tabs:

Tab 1 — "Application Tracker":
- Columns: Funding Source, Type, Amount Range, Status, Deadline, Priority, Notes
- Conditional formatting: Green=Approved, Yellow=In Progress, Red=Rejected

Tab 2 — "Requirements Checklist":
- For each funding source, list required documents with checkbox column

Tab 3 — "Timeline":
- Gantt-style view showing application windows (Jan-Dec 2026)

Tab 4 — "Document Status":
- All module documents with completion status

Format: Professional, filterable headers, frozen top row.
```

---

### PRIORITY 2: Documents for Operational Planning

---

#### 5. INVESTOR_READINESS_CHECKLIST.md → AI Sheets (Milestone Tracker)

**Genspark tool:** AI Sheets

**Prompt:**

```
Convert this investor readiness checklist into a project management spreadsheet.

Tab 1 — "Master Checklist":
- Columns: Month, Category, Task, Status, Due Date, Owner, Notes
- Conditional formatting for status. Progress bar per month.

Tab 2 — "Metrics Dashboard":
- KPIs: MRR, ARR, Customer Count, NPS, Churn Rate, Pipeline Value
- Monthly columns (Month 1-15), target vs actual

Tab 3 — "Investment Readiness Score":
- Categories with scoring criteria, current vs target

Format: Professional, filterable. Data validation dropdowns for Status.
```

---

#### 6. INVESTOR_READINESS_CHECKLIST.md → AI Slides (Roadmap Deck)

**Genspark tool:** AI Slides

**Prompt:**

```
Create a 10-12 slide roadmap presentation from this checklist.

Target audience: Internal planning + business mentor.
Tone: Strategic, milestone-driven. UK English.

Slides: Title, Journey Overview timeline, Months 1-2 Foundation, Months 3-4 Beta, Months 5-6 Results, Months 7-9 Launch, Months 10-12 Scale, Month 12-15 Investment Ready, Metrics Timeline chart, Risk & Contingency, Resource Requirements, Success Criteria.

Use timeline visuals and growth charts. Blue/orange colour scheme.
```

---

#### 7. CUSTOMIZATION_CHECKLIST.md → AI Sheets (Form/Tracker)

**Genspark tool:** AI Sheets

**Prompt:**

```
Convert this customisation checklist into an interactive Excel spreadsheet.

Main tab — "Customisation Tracker":
- Columns: Item #, Section, Placeholder Text, What's Needed, Your Answer, Status, Priority
- Pre-populate all 35+ items. Conditional formatting for incomplete high-priority items.
- Summary row: Total, Completed, Remaining, % Complete

Second tab — "Quick Reference":
- Group placeholders by section with counts

Format: Professional, print-friendly. Data validation for Status dropdown.
```

---

#### 8. PROGRESS.md → AI Sheets (Progress Dashboard)

**Genspark tool:** AI Sheets

**Prompt:**

```
Convert this into a visual progress dashboard spreadsheet.

Tab 1 — "Module Progress":
- Columns: Document, Category, Status, Quality Score (/10), Last Updated, Notes
- Progress bar for overall completion. Green 9-10, Yellow 7-8, Red <7.

Tab 2 — "Action Items":
- Extract all remaining tasks. Columns: Task, Document, Priority, Status

Format: Dashboard style with summary metrics at top.
```

---

### PRIORITY 3: Large Documents Requiring Splitting

---

#### 9. GRANT_RESEARCH_REPORT.md → NEEDS SPLITTING FIRST

**Size:** 48.9KB (72 pages) — TOO LARGE

**Split into 4 files:**
- RESEARCH_StartUpLoans.md (~12KB)
- RESEARCH_InnovateUK.md (~12KB)
- RESEARCH_SBRI.md (~10KB)
- RESEARCH_SEIS.md (~10KB)

**Prompt template (per split file):**

```
Create a 5-8 slide summary of this funding route research for [FUNDING SOURCE NAME].

Target audience: Startup founder evaluating funding options.
Tone: Clear, practical, decision-focused. UK English.

Slides: Overview, Eligibility, Amounts & Terms, Application Process, Pros & Cons, Fit for ACG StaffLink, Key Deadlines, Action Items.

Data-rich with specific figures. Include comparison tables.
```

---

#### 10. BUSINESS_PLAN_COMPLETE.md → AI Docs (Formal Business Plan)

**Genspark tool:** AI Docs
**Output:** Professionally designed PDF business plan

**Prompt:**

```
Convert this business plan into a professionally designed PDF document for a UK Start Up Loans application.

Company: ACG StaffLink (by OneBase Group Ltd)
Industry: Healthcare Technology / SaaS
Tone: Professional, confident, evidence-based. UK English.

Design: Clean modern layout, table of contents, cover page, headers/footers, section dividers.
Charts for: market size, revenue projections, use of funds, competitive landscape.
Skip any [CUSTOMIZE] or [YOUR NAME] text — leave blank spaces.
Keep all financial figures exactly as stated.
```

---

## DOCUMENTS NOT NEEDING CONVERSION

| Document | Reason |
|---|---|
| README.md | Internal navigation guide |
| INSTRUCTIONS.md | Internal process guide |
| COMPLETION_SUMMARY.md | Internal status doc |
| BUSINESS_PLAN_PART2.md | Included in BUSINESS_PLAN_COMPLETE.md |
| BUSINESS_PLAN_PART3.md | Included in BUSINESS_PLAN_COMPLETE.md |

---

## CONVERSION ORDER

**Start Up Loans application (do first):**
1. FINANCIAL_FORECASTS.md → AI Sheets
2. BUSINESS_PLAN_COMPLETE.md → AI Docs
3. BUSINESS_PLAN_COMPLETE.md → AI Slides
4. FINANCIAL_FORECASTS.md → AI Slides

**Operational planning (do next):**
5. GRANT_APPLICATION_TRACKER.md → AI Sheets
6. CUSTOMIZATION_CHECKLIST.md → AI Sheets
7. INVESTOR_READINESS_CHECKLIST.md → AI Sheets
8. INVESTOR_READINESS_CHECKLIST.md → AI Slides
9. PROGRESS.md → AI Sheets

**After splitting (do last):**
10. GRANT_RESEARCH_REPORT.md → Split → 4x AI Slides

---

## STRUCTURAL REQUIREMENTS FOR .MD FILES

For best Genspark output, each .md must have:
1. Clear H1/H2/H3 hierarchy
2. Explicit numbers ("£12,500" not "£12.5k")
3. Markdown tables for data
4. No ambiguous references
5. No orphan [CUSTOMIZE] placeholders
6. British English throughout
7. Section labels matching prompt terms

---

*Generated by Claude for MODULE_48_UK_GOVERNMENT_GRANT_APPLICATION*