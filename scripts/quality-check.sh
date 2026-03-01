#!/usr/bin/env bash
# Quality check script for Stop hook
# Runs linters on changed files

set -e  # Exit on error
trap 'echo "Quality check completed" >&2; exit 0' EXIT  # Always exit 0

# Get changed files
changed=$(git diff --name-only HEAD 2>/dev/null || true)

# Exit if no changes
if [ -z "$changed" ]; then
  echo "No files changed" >&2
  exit 0
fi

# Check if any code files changed
if ! echo "$changed" | grep -qE '\.(go|tsx?|jsx?)$'; then
  echo "No code files changed" >&2
  exit 0
fi

echo "=== Quality Check ===" >&2

# Check Go files
if echo "$changed" | grep -qE '\.go$'; then
  echo "Checking Go files..." >&2
  just lint-go 2>&1 | tail -15 || true
  echo "✓ Go lint completed" >&2
fi

# Check React files
if echo "$changed" | grep -qE 'frontend-react/.*\.(tsx?|jsx?)$'; then
  echo "Checking React files..." >&2
  just check-react 2>&1 | tail -15 || true
  echo "✓ React checks completed" >&2
fi
