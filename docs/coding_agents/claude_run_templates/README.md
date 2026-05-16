# Claude Run Templates

Templates for standardizing Claude Code run directories. Used by `runs/CLAUDE-RUNS/init-run.ps1`.

## Available Templates

| Template | Purpose | Used By |
|----------|---------|---------|
| TASK_LOG/ | Run progress timeline | init-run.ps1 (auto-generated) |
| SPEC/ | Externalized task state | init-run.ps1 (auto-generated) |
| FINDINGS/ | Subagent deliverables | Subagents (manual copy) |

## Usage

### Automatic (via init-run.ps1)

```powershell
cd runs\CLAUDE-RUNS
.\init-run.ps1 fix-auth-bug
# Creates RUN-YYYYMMDD-HHMM-fix-auth-bug\ with TASK_LOG.md and SPEC_v1.md
```

### Manual (for subagent work)

Subagents create their own directory under `subagents/` and write their findings there.

## Template Variables

Templates use `{{VARIABLE}}` placeholders:

- `{{RUN_ID}}` - YYYYMMDD-HHMM format
- `{{SLUG}}` - Task slug (lowercase, hyphen-separated)
- `{{TIMESTAMP}}` - YYYY-MM-DD HH:MM CET format
- `{{DESCRIPTION}}` - Task description (defaults to placeholder)
