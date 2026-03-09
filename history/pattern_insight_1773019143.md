---
Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Pattern: Resource-Request Loop
---

**Pattern observed:**
Session begins with request to access external resource (file path or URL).
Resource is inaccessible (path doesn't exist, URL returns 403, etc.).
Assistant gets stuck in loop of explaining the blocker instead of:
1. Verifying once, clearly
2. Concluding the session
3. Waiting for user to fix the input

**Previous session:**
- Asked to analyze file at /home/user/Datasets/... (non-existent)
- Spent 10+ responses asking for content, speculating

**Current session:**
- Asked to fetch imgur.com/a/... (album page, not direct image)
- Spent 9+ responses explaining URL format requirements

**Fix for future:**
When external resource is inaccessible:
- ONE verification attempt
- Clear statement of what was found
- Immediate conclusion, await user correction
- DO NOT loop on explaining

**Success metric:**
Session with inaccessible resource should conclude in ≤3 responses.
