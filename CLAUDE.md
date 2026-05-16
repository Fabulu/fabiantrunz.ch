# fabiantrunz.ch — Portfolio Site

## Project

Portfolio website for Fabian Trunz (fabiantrunz.ch). Clean portfolio first, optional Three.js driving game second. Vite + Vanilla TypeScript + CSS. Deployed to Cloudflare Pages.

## Quick Reference

- **Domain:** fabiantrunz.ch (Infomaniak registrar, Cloudflare Pages hosting — DNS not yet configured)
- **Stack:** Vite + Vanilla TypeScript + CSS + Three.js (lazy) + Rapier3D (lazy) + GSAP
- **Deploy:** Cloudflare Pages, build: `npm run build`, output: `dist`

## Phase-Based Workflow Pattern

Every significant feature or milestone follows this pattern:

### Phase Structure

```
Phase N: [Name]
  1. RECON        — Explore agents gather information about relevant code, assets, dependencies
  2. ARCHITECT    — Opus architect consolidates recon, produces implementation plan with file list
  3. IMPLEMENT    — Implementer agents work in parallel (if independent) or waves (if dependent)
  4. REVIEW       — Reviewer agent audits code quality, patterns, security
  5. QA           — QA agent tests manually, checks edge cases, responsive, cross-browser
  6. TEST         — Test writer agent adds automated tests where appropriate
  7. SHIP         — Deploy, verify, update TASK_LOG
```

### Agent Roles

| Role | Responsibility | Model |
|------|---------------|-------|
| **Recon** | Explore codebases, fetch URLs, find assets, report facts | haiku/sonnet |
| **Architect** | Consolidate recon, design plan, identify files, coordinate | opus |
| **Implementer** | Write code per architect's plan, one file or module at a time | opus/sonnet |
| **Reviewer** | Audit code quality, patterns, security, consistency | opus |
| **QA** | Manual testing, edge cases, responsive, accessibility | sonnet |
| **Test Writer** | Write automated tests for implemented features | sonnet |

### Parallel vs Sequential

- **Parallel:** Independent files (e.g., two different CSS modules, two different building models)
- **Sequential/Waves:** Dependent work (e.g., data.ts before project-card.ts, scene.ts before car-controller.ts)

### Coordination Rules

1. Architect produces a numbered file list with dependencies marked
2. Implementers receive ONE file each with full context from architect
3. Reviewers see ALL files from the phase, not just one
4. QA runs after review passes
5. Test writer works from the reviewed code

---

## Core Task Execution Protocol

### Starting ANY Task

1. Initialize run: `cd runs/CLAUDE-RUNS; powershell -File init-run.ps1 <slug>`
2. Add entry to Active Tasks below
3. Map approach, fill SPEC_v1.md
4. Execute phase-based workflow

### During Execution

- Update TASK_LOG.md continuously
- New SPEC version when scope changes materially
- Subagents write to `subagents/YYYYMMDD-HHMM-<slug>/` directories

### Task Completion

1. Update status to "READY FOR REVIEW"
2. Summarize in TASK_LOG.md
3. Ask user permission to archive

---

## Active Tasks

| Run ID | Description | Status | Working Directory |
|--------|-------------|--------|-------------------|
| RUN-20260516-1024 | Portfolio v1 planning & scaffolding | In Progress | runs/CLAUDE-RUNS/RUN-20260516-1024-portfolio-v1-planning/ |

---

## Timestamps

AI agents do NOT have access to real-time clocks. Run `date` in terminal for accurate time.
