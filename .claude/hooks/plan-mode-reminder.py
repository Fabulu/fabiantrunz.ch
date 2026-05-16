#!/usr/bin/env python3
"""
Plan mode reminder hook.
Injects TASK_LOG and subagent planning reminders when entering plan mode.
"""
import json
import sys

PLAN_MODE_REMINDER = """
## Plan Mode Reminders

**TASK_LOG Updates:**
- Add "Update TASK_LOG.md" as a todo item BETWEEN each other major step

**Subagent Specification:**
For each task delegated to a subagent, specify:
1. **Count**: How many subagents
2. **Model**: Which model per task
3. **Directory**: The subagent's working directory

---

"""


def main():
    try:
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "permissionDecisionReason": "Plan mode reminder injected",
                "additionalContext": PLAN_MODE_REMINDER,
            }
        }

        print(json.dumps(output))

    except Exception as e:
        sys.stderr.write(f"Hook error (plan-mode-reminder): {e}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
