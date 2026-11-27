# Releasing CUK Timetable

## Overview
This document describes the process for releasing a new semester timetable. The architecture separates data from the app, so a new release only requires updating JSON files — no app rebuild needed.

## Data Update Workflow

### 1. Prepare Source Data
```
sources/
└── 2026-09/          # New semester folder
    └── FINAL-DEGREE_DIPLOMA_CERTIFICATE-TT-SEPT-2026.pdf
```

### 2. Extract PDF to JSON
```bash
# Option A: Use the extraction script (when available)
python tools/extract.py sources/2026-09/FINAL-*.pdf data/timetable.json

# Option B: Manual process (current)
# 1. Extract PDF tables to CSV/Excel
# 2. Clean/transform to JSON matching the schema
# 3. Save as data/timetable.json
```

### 3. Validate
```bash
python tools/validate.py data/timetable.json
# Must pass with 0 errors. Warnings are OK but review them.
```

### 4. Diff Against Previous Version
```bash
# Keep a copy of the previous version
cp data/timetable.json data/timetable.json.bak

# After generating new timetable.json:
python tools/diff.py data/timetable.json.bak data/timetable.json
# Review output: added/removed/modified classes, course changes
```

### 5. Bump Version
```bash
node tools/version.js --message "Sept–Dec 2026 timetable"
# This:
# - Adds meta.version to timetable.json
# - Creates data/version.json with SHA256, date, message
# - Outputs git commit message
```

### 6. Verify Version Files
```bash
cat data/version.json
# Should show:
# {
#   "version": "2026.09-r1",
#   "updated": "2026-11-27",
#   "timetable_sha256": "...",
#   "message": "Sept–Dec 2026 timetable"
# }

# Verify meta.version in timetable.json
grep '"version"' data/timetable.json | head -1
```

### 7. Optional: Create Changes Overlay
If there are room swaps or cancellations after release:
```bash
# Create data/changes.json
cat > data/changes.json << 'EOF'
{
  "version": "r2",
  "updated": "2026-12-05",
  "changes": [
    {
      "match": {"course": "BCHM1.1", "unit_code": "BCHM1101", "day": "Monday", "start": "7:00AM"},
      "set": {"venue": "GC1"},
      "reason": "Room swap",
      "date": "2026-12-05"
    }
  ]
}
EOF
```

### 8. Commit and Push
```bash
git add data/timetable.json data/version.json data/changes.json
git commit -m "data(app): version bump to 2026.09-r1 [M6]"
git push
```

### 9. CI/CD Deploys Automatically
- GitHub Actions runs: lint → typecheck → test → build
- On success, Cloudflare Pages deploys to production
- Live at: https://cuk-timetable.pages.dev (or custom domain)

## Version String Format
```
YYYY.MM-rN
```
- `YYYY.MM`: Year and month of semester start (e.g., 2026.09)
- `rN`: Revision number (r1, r2, r3...) for corrections within the same semester

Examples:
- `2026.09-r1` — Initial Sept 2026 release
- `2026.09-r2` — Room swap correction
- `2027.01-r1` — Jan 2027 semester

## App Update Mechanism
The app automatically checks for updates:
1. On load: fetches `/data/version.json` (cache-busted)
2. Compares `version` with stored `dataVersion` in localStorage
3. If newer: downloads `timetable.json` + `changes.json`, validates, swaps atomically
4. Shows "Update ready — reload" toast
5. Periodic check every 6 hours in background

## Testing Checklist Before Release
- [ ] `python tools/validate.py` passes (0 errors)
- [ ] `python tools/diff.py` output reviewed
- [ ] `node tools/version.js` creates correct version.json
- [ ] SHA256 in version.json matches `sha256sum data/timetable.json`
- [ ] Manual test: open deployed URL, verify "Check for updates" works
- [ ] Manual test: offline mode works (disable network, reload)
- [ ] Manual test: onboarding → Today → Week → Browse → Settings flow
- [ ] Lighthouse PWA score 100, Performance ≥ 90

## Rollback Procedure
If a bad release is deployed:
```bash
# Revert to previous version.json + timetable.json
git revert <bad-commit>
git push
# Cloudflare Pages will redeploy previous version
```

## Adding a New Semester (Major Release)
1. Create `sources/2027-01/` with new PDF
2. Extract → `data/timetable.json` (replaces existing)
3. Bump version to `2027.01-r1`
4. Consider: existing users' stored courses may not exist in new data
   - App handles this: shows "Pick your course again" onboarding step
5. Update `CHANGELOG.md` with new semester note

## File Checklist for Release
```
data/
├── timetable.json      # Main data (required)
├── version.json        # Version info (required)
└── changes.json        # Overrides (optional)
```

## Automation (Future)
- GitHub Action on tag push: `git tag v2026.09-r1 && git push --tags`
- Action runs validation, diff, version bump, commit, tag, deploy
- Slack/email notification on success/failure
