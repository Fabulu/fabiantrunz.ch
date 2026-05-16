#!/usr/bin/env python3
"""
Subagent context injection hook.
Enhances subagent prompts with project context.
"""
import json
import sys

CONTEXT_HEADER = """## Agent Context

You are a subagent working on the fabiantrunz.ch portfolio site project.
Follow the subagent directory protocol: write FINDINGS.md to your assigned directory.
Be concise and deliver actionable findings.

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
                tool_input[field] = CONTEXT_HEADER + tool_input[field]
                modified = True
                break

        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "permissionDecisionReason": "Context injection applied" if modified else "No prompt field found",
                "updatedInput": tool_input,
            }
        }

        print(json.dumps(output))

    except Exception as e:
        sys.stderr.write(f"Hook error (subagent-context): {e}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
