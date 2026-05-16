# Memory & Context Optimization

> Strategies for efficient context management when working with AI coding agents.

## Context Loading Strategy

**Don't load everything at once. Load based on task type.**

```
Task Type                -> Load These Documents
Quick command/fix        -> CLAUDE.md only
Debugging error          -> Relevant source + error logs
Adding new feature       -> Examples + architecture docs
Understanding arch       -> Architecture docs + diagrams
```

## Smart File Reading

**Read full file when:** File is <300 lines, need overall structure, first encounter.
**Read targeted sections when:** File is >500 lines, know exact function needed, making isolated change.

## Token Budget Guidelines

| Task Type | Typical Token Cost |
|-----------|-------------------|
| Quick fix | 500-2,000 |
| Add simple feature | 15,000-30,000 |
| Debug complex error | 30,000-50,000 |
| Major refactoring | 80,000-120,000 |
