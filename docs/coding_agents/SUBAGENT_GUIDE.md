# Subagent Spawning Guide

> **Purpose**: Guide for AI agents on when and how to spawn subagents during Claude Code runs.

## Quick Reference

```
Spawn subagent when:
  - Task generates intermediate noise -> YES
  - Independent investigation -> YES
  - Verification/testing -> YES
  - Needs user clarification -> NO
  - Has dependencies on other tasks -> MAYBE (sequential)
  - Judgment call for main thread -> NO
```

## When to Spawn

**Always Delegate:** Codebase exploration, verification tasks, investigation, search, data queries.

**Never Delegate:** User clarification needed, multi-step interdependent operations, judgment calls, irreversible actions, final deliverables.

**Rule:** If task might generate >500 tokens of intermediate output, SPAWN.

## Subagent Working Directories

```
runs/CLAUDE-RUNS/<RUN-ID>-<slug>/
  subagents/
    YYYYMMDD-HHMM-<descriptive-slug>/
      FINDINGS.md   # Primary deliverable (REQUIRED)
      [other files] # Supporting materials
```

## Required Deliverable: FINDINGS.md

Every subagent MUST produce a `FINDINGS.md` with: Summary, Findings, Recommendations, Files Examined.

Template: `docs/coding_agents/claude_run_templates/FINDINGS/FINDINGS.md`

## Parallel vs Sequential

**Parallel** when tasks are independent. **Sequential** when one depends on another's findings.

**Recommended:** 2-3 concurrent subagents. **Maximum:** 5.
