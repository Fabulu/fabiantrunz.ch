#!/usr/bin/env python3
"""
Subagent directory protocol hook.
Injects working directory instructions for subagents.
"""
import json
import sys

DIRECTORY_PROTOCOL = """
## Subagent Working Directory Protocol

You are a subagent. Your work products go in YOUR directory, not the main conversation context.

**Directory Assignment:**
- If your prompt specifies a working directory path, use it exactly
- If NO directory specified, create one: `subagents/YYYYMMDD-HHMM-<task-slug>/`

**Required Deliverable:**
Create `FINDINGS.md` in your directory with: Summary, Findings, Recommendations, Files Examined.

---

"""

PROMPT_FIELDS = ["prompt", "description", "task", "instructions", "message"]


def main():
    try:
        input_data = json.load(sys.stdin)
        tool_input = input_data.get("tool_input", {})

        modified = False
        for field in PROMPT_FIELDS:
            if field in tool_input and isinstance(tool_input[field], str):
                tool_input[field] = tool_input[field] + DIRECTORY_PROTOCOL
                modified = True
                break

        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "permissionDecisionReason": "Directory protocol appended" if modified else "No prompt field found",
                "updatedInput": tool_input,
            }
        }

        print(json.dumps(output))

    except Exception as e:
        sys.stderr.write(f"Hook error (directory-protocol): {e}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
