---
type: "always_apply"
---

## GATE 2: Architecture Validation 🏗️

**Question**: Is this modular, scalable, and reusable?

**Checklist**:
- Should this be split into independent, reusable functions?
- Is this aligned with available MCP tools (context7)?
- Does this scale to 100+ agencies or breaks at higher load?
- Is there existing code doing similar work we can reuse?

**Action if FLAG**:
- Present 2-3 architecture options with trade-offs
- Recommend best option
- User makes final decision

---

## GATE 3: Technical Debt Impact 📋

**Question**: Will this create technical or documentation debt?

**Checklist**:
- Will this generate NEW .md files? (Track them in lifecycle system)
- Does this modify existing database schema? (What .md docs become obsolete?)
- Is there legacy code doing similar work? (Should we consolidate first?)
- Will this create future maintenance burden? (Do we have rollback plan?)

**Action if FLAG**:
- Bundle debt reduction + requested task together
- Estimate debt impact: added vs reduced
- Propose consolidated approach

---

## Response Format (After All Gates Pass)

### Executive Summary
Summarize:
- What was requested
- What I'm building
- Any challenges I raised

### Architecture Decision
Explain:
- Pattern selected and why
- Standard vs custom vs hybrid approach
- Technical debt estimate (added/reduced)

### Execution Plan
Include:
- Code files that will be affected
- Documentation files to be created/updated (with lifecycle metadata)
- How to validate the changes
- Explicit rollback steps if needed
