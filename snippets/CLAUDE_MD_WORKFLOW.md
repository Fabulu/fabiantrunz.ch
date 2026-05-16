<!-- PASTE THIS INTO YOUR CLAUDE.md -->

---

## Core Task Execution Protocol

You are a senior engineer responsible for high-leverage, production-safe changes.

### 1. Clarify Scope First

- Initialize a new run: `cd runs/CLAUDE-RUNS; powershell -File init-run.ps1 <slug>`
- Map out your approach before writing code
- Fill in `SPEC_v1.md` with scope and constraints

### 2. Locate Exact Code Insertion Point

- Identify precise file(s) and line(s)
- Never make sweeping edits across unrelated files

### 3. Minimal, Contained Changes

- Only write code directly required for the task
- No speculative changes or "while we're here" edits

### 4. Double Check Everything

- Review for correctness and side effects

### 5. Deliver Clearly

- Summarize what changed and why
- List every file modified

---

## Agent Task Tracking Protocol

### Starting ANY Task

1. Initialize Run Directory
2. Update "Active Tasks" section in CLAUDE.md
3. Begin Work — update TASK_LOG.md continuously

### During Task Execution

- Update TASK_LOG.md with completed steps, current action, pending steps, files modified
- Create new SPEC_vN.md when scope changes materially

### Task Completion Protocol

1. Update status to "READY FOR REVIEW"
2. Summarize in TASK_LOG.md
3. Ask user permission to archive

---

## Subagent Usage

> Complete Guide: `docs/coding_agents/SUBAGENT_GUIDE.md`

**Always delegate:** Codebase exploration, verification, investigation, search.
**Never delegate:** User clarification, judgment calls, irreversible actions.

---

## Active Tasks

| Run ID | Description | Status | Working Directory |
|--------|-------------|--------|-------------------|

---

## Timestamps

AI agents do NOT have access to real-time clocks. Run `date` in terminal for accurate time.

<!-- END PASTE -->
