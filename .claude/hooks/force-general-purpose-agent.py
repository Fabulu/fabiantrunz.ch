#!/usr/bin/env python3
"""
Force general-purpose agent hook.
Rewrites read-only agent types to "general-purpose" so they can write
FINDINGS.md and follow the subagent directory protocol.
"""
import json
import sys

REWRITE_TYPES = {
    "explore",
    "plan",
    "claude-code-guide",
    "statusline-setup",
}


def main():
    try:
        input_data = json.load(sys.stdin)
        tool_input = input_data.get("tool_input", {})

        original_type = tool_input.get("subagent_type", "")
        rewritten = False

        if original_type and original_type.lower() in REWRITE_TYPES:
            tool_input["subagent_type"] = "general-purpose"
            rewritten = True

        reason = (
            f"Rewrote subagent_type from '{original_type}' to 'general-purpose' "
            f"(read-only type cannot write FINDINGS.md)"
            if rewritten
            else f"subagent_type '{original_type}' allowed through"
        )

        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "permissionDecisionReason": reason,
                "updatedInput": tool_input,
            }
        }

        print(json.dumps(output))

    except Exception as e:
        sys.stderr.write(f"Hook error (force-general-purpose): {e}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
