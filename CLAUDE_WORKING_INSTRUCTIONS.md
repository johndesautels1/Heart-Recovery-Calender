# ⚠️ CRITICAL: CLAUDE CODE WORKING INSTRUCTIONS
**READ THIS FIRST - BEFORE DOING ANYTHING**

**Document Created:** November 3, 2025
**Last Updated:** November 3, 2025
**Status:** MANDATORY READING FOR ALL CLAUDE SESSIONS
**Location:** `C:\Users\broke\Heart-Recovery-Calender\CLAUDE_WORKING_INSTRUCTIONS.md`

---

## 🚨 MANDATORY OATH - READ AND COMMIT TO THIS

**I, Claude, solemnly commit to the following:**

1. ✅ I will be 100% HONEST at all times
2. ✅ I will NEVER rollback code without explicit written permission
3. ✅ I will NEVER delete code without explicit written permission
4. ✅ I will NEVER assume code should be deleted or removed
5. ✅ I will FULLY TEST every code change before marking it done
6. ✅ I will verify no breaking changes are introduced
7. ✅ I will immediately notify the user of ANY bugs or errors I introduce
8. ✅ I will FIX ALL problems before moving to a new task
9. ✅ I will date stamp all work
10. ✅ I will update MASTER_TODO_LIST.md with ✅ green checkmarks ONLY when fully complete

**Violation of any of these commitments has caused ENORMOUS FINANCIAL DAMAGE to this company. DO NOT REPEAT PAST MISTAKES.**

---

## 📂 PROJECT STRUCTURE - READ CAREFULLY

### File Locations
- **Master TODO List:** `C:\Users\broke\Heart-Recovery-Calender\MASTER_TODO_LIST.md`
- **This Document:** `C:\Users\broke\Heart-Recovery-Calender\CLAUDE_WORKING_INSTRUCTIONS.md`
- **Session Notes:** `C:\Users\broke\Heart-Recovery-Calender\docs\sessions\` (create if doesn't exist)
- **Frontend:** `C:\Users\broke\Heart-Recovery-Calender\frontend\`
- **Backend:** `C:\Users\broke\Heart-Recovery-Calender\backend\`

### ⚠️ DANGER: Similar Directory Names
The user has MULTIPLE projects with similar names:
- `Heart-Recovery-Calender` ← **THIS IS THE ONE WE WORK ON**
- `cardiac-recovery-app` ← **DO NOT TOUCH**
- `cardiac-recovery-pro-clean` ← **DO NOT TOUCH**
- Other folders in `C:\Users\broke\` ← **DO NOT TOUCH UNLESS EXPLICITLY TOLD**

**ALWAYS verify the FULL PATH before making changes:**
```
CORRECT: C:\Users\broke\Heart-Recovery-Calender\...
WRONG:   C:\Users\broke\cardiac-recovery-app\...
WRONG:   C:\Users\broke\cardiac-recovery-pro-clean\...
```

**If you confuse these directories, it will be CATASTROPHIC.**

---

## 🏗️ CRITICAL ARCHITECTURE UNDERSTANDING

### ⚠️ USER = PATIENT (ONE ENTITY)

**THIS IS THE MOST IMPORTANT CONCEPT IN THE ENTIRE APPLICATION:**

#### The Fundamental Truth:
- **Patient = User**
- **User = Patient**
- **They are ONE entity with ONE ID**
- **There is NO separation**

#### Database ID Confusion (MAJOR HISTORICAL BUG):
The codebase accidentally created these variations, which are ALL THE SAME THING:
- `patientId`
- `patient.id`
- `patient_id`
- `userId`
- `user.id`
- `user_id`
- `user_id` vs `userId`
- Any other variation

**THESE ARE ALL ONE ID. DO NOT TREAT THEM SEPARATELY.**

This confusion caused **ENORMOUS FINANCIAL DAMAGE** to the company. Never repeat this mistake.

#### Two User Types - That's It:

**1. Patient-Users (Regular Users):**
- When someone signs up as "new patient" or "new user" on signup screen
- They get ONE ID in the database
- Role: `patient`
- Access: FULL access to their own account, all pages, all tools, all data, all charts
- Access: CANNOT see other patient-users' data
- Simplified: "A user who tracks their own health"

**2. Admin-Therapists:**
- Role: `admin` or `therapist`
- Access: FULL access to their OWN account with their own personal data (like a patient)
- Access: FULL access to see ALL patient-users (not just their own)
- Display: Name shows as "Name - Admin" or "Name - Therapist"
- Simplified: "A user who can track their own health AND see all patients"

#### What This Means For Code:
```typescript
// ❌ WRONG - Treating patient and user as separate
if (user.id !== patient.id) { ... }
if (isPatient) { showPatientView() } else { showUserView() }
const patientData = getPatient(patientId);
const userData = getUser(userId);

// ✅ CORRECT - They are the same entity
const currentUserId = user.id; // This is the patient's ID too
if (user.role === 'patient') { /* Patient-user view */ }
if (user.role === 'admin' || user.role === 'therapist') { /* Admin view */ }
const userData = getUser(userId); // This gets patient data too
```

#### Permissions Logic:
```typescript
// ✅ CORRECT Permission Check
function canAccessData(requestingUser, dataOwnerId) {
  // Admins/therapists can see all data
  if (requestingUser.role === 'admin' || requestingUser.role === 'therapist') {
    return true;
  }

  // Patient-users can only see their own data
  return requestingUser.id === dataOwnerId;
}
```

**If you find code that separates patient from user, you must SIMPLIFY IT.**

---

## 🧪 TESTING REQUIREMENTS

### Before Marking Anything Done:

1. **Run All Builds:**
   ```bash
   cd C:\Users\broke\Heart-Recovery-Calender\backend
   npm run build  # Must show 0 errors

   cd C:\Users\broke\Heart-Recovery-Calender\frontend
   npm run build  # Must show 0 errors
   ```

2. **Test Functionality:**
   - Test the specific feature you changed
   - Test related features that might be affected
   - Log in as patient-user and verify access
   - Log in as admin and verify access
   - Check console for errors (0 errors required)

3. **Verify No Breaking Changes:**
   - Check that existing features still work
   - Verify navigation works
   - Verify data loads correctly
   - Test on both patient and admin accounts

4. **Database Check:**
   ```bash
   # Verify backend is running
   curl http://localhost:4000/api/vitals/latest

   # Verify frontend is connected
   # Open http://localhost:3000 and check console
   ```

### If You Introduce a Bug:

**STOP EVERYTHING. Do NOT move to next task.**

1. ✅ Immediately notify the user: "I introduced a bug in [file] at [line]. The issue is [description]."
2. ✅ Show the exact error message
3. ✅ Explain what you changed that caused it
4. ✅ Fix it completely
5. ✅ Test the fix
6. ✅ Verify no other bugs were introduced
7. ✅ Only then continue

**Never hide bugs. Never say "it should work" without testing. Never move on with broken code.**

---

## 📝 MASTER TODO LIST UPDATES

### Location:
`C:\Users\broke\Heart-Recovery-Calender\MASTER_TODO_LIST.md`

### Rules:

1. **Only Mark Done When FULLY COMPLETE:**
   - Code written? ✅
   - Code tested? ✅
   - Builds pass? ✅
   - Feature works? ✅
   - No bugs introduced? ✅
   - **THEN** mark with ✅ green checkmark

2. **Update Format:**
   ```markdown
   - [x] Feature Name - ✅ COMPLETE (Nov 3, 2025)
   ```

3. **Never Assume:**
   - Don't mark done because "it should work"
   - Don't mark done because "the code looks right"
   - Don't mark done because "it compiled"
   - ONLY mark done after TESTING

4. **Date Stamp Everything:**
   ```markdown
   - [x] Fix medications API - ✅ COMPLETE (Nov 3, 2025 - 10:15 AM)
   - [x] Add sleep tracking - ✅ COMPLETE (Nov 3, 2025 - 2:30 PM)
   ```

---

## 💾 BACKUP & GIT REQUIREMENTS

### Daily Backups to D: Drive:

**Timing:** Once per day at midnight OR during next session if missed

**Location:** `D:\Heart-Recovery-Calender-Backups\`

**What to Backup:**
```bash
# Create dated backup folder
mkdir -p "D:\Heart-Recovery-Calender-Backups\$(date +%Y-%m-%d)"

# Backup frontend
cp -r "C:\Users\broke\Heart-Recovery-Calender\frontend" "D:\Heart-Recovery-Calender-Backups\$(date +%Y-%m-%d)\frontend"

# Backup backend
cp -r "C:\Users\broke\Heart-Recovery-Calender\backend" "D:\Heart-Recovery-Calender-Backups\$(date +%Y-%m-%d)\backend"

# Backup docs
cp -r "C:\Users\broke\Heart-Recovery-Calender\docs" "D:\Heart-Recovery-Calender-Backups\$(date +%Y-%m-%d)\docs"
```

**Verify Backup:**
- Check D: drive has new folder with today's date
- Verify files copied successfully
- Notify user: "✅ Daily backup complete to D:\Heart-Recovery-Calender-Backups\[date]"

### Git Commits - EVERY VERIFIED CHANGE:

**Branch:** `Claude-Master-Code-Corrections-Heart-Recovery-Calender` (NOT main, NOT master)

**When to Commit:**
- After EVERY completed and tested feature
- After EVERY bug fix
- After EVERY code improvement
- After EVERY documentation update

**Commit Format:**
```bash
cd "C:\Users\broke\Heart-Recovery-Calender"

git add -A

git commit -m "$(cat <<'EOF'
[type]: [Short description]

[Detailed description of changes]
- What was changed
- Why it was changed
- What was tested

✅ Tested: [describe testing]
✅ Builds: Frontend 0 errors | Backend 0 errors
✅ Date: [date and time]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push
```

**After Every Commit:**
- Verify push succeeded
- Notify user: "✅ Committed and pushed: [short description]"

---

## 🗄️ DATABASE MANAGEMENT

### Server Addresses:
- **Backend:** http://localhost:4000
- **Frontend:** http://localhost:3000
- **Database:** PostgreSQL on localhost:5432

### Database Credentials (from .env):
- Host: localhost
- Port: 5432
- Database: heartbeat_calendar
- User: postgres
- Password: 2663

### Daily Health Check:

**At start of EVERY session, check:**

```bash
# 1. Check if backend is running
curl http://localhost:4000/api/vitals/latest

# 2. Check if frontend is running
curl http://localhost:3000

# 3. Check postgres
# Look for postgres.exe in Task Manager (Windows)
# or: ps aux | grep postgres (Linux/Mac)
```

### If Database Is Down:

**IMMEDIATELY notify user:**

```
⚠️ DATABASE DOWN ALERT ⚠️

Backend Status: [running/stopped]
Frontend Status: [running/stopped]
Database Status: [running/stopped]

To restart backend:
cd "C:\Users\broke\Heart-Recovery-Calender\backend"
npm run dev

To restart frontend:
cd "C:\Users\broke\Heart-Recovery-Calender\frontend"
npm run dev

Database connection: postgres://postgres:2663@localhost:5432/heartbeat_calendar
```

### Killing Old Processes (Common Login Issue):

**Problem:** Old node/postgres processes cause login failures

**Solution:**
```bash
# Windows - Kill node processes
taskkill /F /IM node.exe

# Then restart servers
cd "C:\Users\broke\Heart-Recovery-Calender\backend"
npm run dev

cd "C:\Users\broke\Heart-Recovery-Calender\frontend"
npm run dev
```

**Always verify old processes are killed before starting new ones.**

---

## 🔄 CONTEXT WINDOW MANAGEMENT

### When to Notify User:

**Watch for these signs:**
- Responses getting compressed
- Losing details from earlier in conversation
- Token count approaching limit
- Having to re-read files multiple times

**When this happens, IMMEDIATELY notify user:**

```
⚠️ CONTEXT WINDOW WARNING ⚠️

We're approaching context limit. Compressions are becoming frequent.

RECOMMENDATION: Start a new conversation to maintain quality.

Before ending this session, I'll prepare handoff instructions with:
- Current work status
- What we were doing
- Where files are located
- Next steps
- How to quickly resume

Would you like me to prepare the handoff document now?
```

### Conversation ID System:

**Format:** `SESSION-YYYYMMDD-HHMM`

**Example:** `SESSION-20251103-1430` (Nov 3, 2025, 2:30 PM)

**At Start of Each Session:**
```markdown
**Session ID:** SESSION-20251103-1430
**Date:** November 3, 2025
**Start Time:** 2:30 PM
**Previous Session:** SESSION-20251102-2115
```

---

## 📋 SESSION HANDOFF PROCEDURE

### When User Says "We're Ending Session":

**Immediately create this document:**

**Location:** `C:\Users\broke\Heart-Recovery-Calender\docs\sessions\SESSION-[DATE]-HANDOFF.md`

**Template:**
```markdown
# Session Handoff Document
**Session ID:** SESSION-[YYYYMMDD-HHMM]
**Date:** [Full Date]
**End Time:** [Time]
**Next Session ID:** SESSION-[NEXT-DATE]-[TIME]

---

## 📊 WHAT WE WERE DOING

[Detailed explanation of current work]

---

## ✅ WHAT GOT COMPLETED THIS SESSION

1. [Task 1] - ✅ DONE - Committed: [commit hash]
2. [Task 2] - ✅ DONE - Committed: [commit hash]
3. [Task 3] - ✅ DONE - Committed: [commit hash]

---

## 🚧 WHAT'S IN PROGRESS

- [Task] - 60% complete
  - Location: [file path]
  - Status: [specific status]
  - Next step: [what to do next]

---

## 📁 IMPORTANT FILE LOCATIONS

- Master TODO List: `C:\Users\broke\Heart-Recovery-Calender\MASTER_TODO_LIST.md`
- Working Branch: `Claude-Master-Code-Corrections-Heart-Recovery-Calender`
- Backend: `C:\Users\broke\Heart-Recovery-Calender\backend\`
- Frontend: `C:\Users\broke\Heart-Recovery-Calender\frontend\`
- Latest Backup: `D:\Heart-Recovery-Calender-Backups\[date]\`

---

## 🔍 HOW TO QUICKLY RESUME

1. Read this handoff document
2. Read `CLAUDE_WORKING_INSTRUCTIONS.md` (commit to the oath)
3. Check `MASTER_TODO_LIST.md` for current status
4. Review latest commits:
   ```bash
   cd "C:\Users\broke\Heart-Recovery-Calender"
   git log --oneline -10
   ```
5. Start servers:
   ```bash
   # Backend
   cd backend && npm run dev

   # Frontend (new terminal)
   cd frontend && npm run dev
   ```
6. Continue with: [specific next task]

---

## ⚠️ CRITICAL REMINDERS FOR NEXT CLAUDE

- User = Patient (ONE ENTITY, ONE ID)
- Never delete code without permission
- Test everything before marking done
- Commit every verified change
- Check database health at start
- Update MASTER_TODO_LIST.md with ✅ only when FULLY done
- Work in `Claude-Master-Code-Corrections-Heart-Recovery-Calender` branch

---

## 🐛 KNOWN ISSUES TO WATCH FOR

[List any known issues or gotchas]

---

## 📝 NOTES FROM THIS SESSION

[Any important notes, decisions, or context]

---

**Prepared by:** Claude Code
**For User:** broke
**Next Session:** [Date/Time if known]
```

### After Creating Handoff:

1. Save to: `C:\Users\broke\Heart-Recovery-Calender\docs\sessions\SESSION-[DATE]-HANDOFF.md`
2. Commit it to git
3. Tell user: "✅ Handoff document created at [path]. You can paste this to next Claude or I can access it from git."

---

## 🎯 QUICK START FOR NEW SESSIONS

**When user says "Pick up where we left off" or references previous session:**

1. ✅ Read `CLAUDE_WORKING_INSTRUCTIONS.md` (this file)
2. ✅ Commit to the mandatory oath
3. ✅ Find latest handoff: `C:\Users\broke\Heart-Recovery-Calender\docs\sessions\SESSION-*-HANDOFF.md`
4. ✅ Read `MASTER_TODO_LIST.md`
5. ✅ Check git log: `git log --oneline -10`
6. ✅ Verify servers running (backend:4000, frontend:3000)
7. ✅ Ask user: "I've reviewed [handoff document]. We were working on [task]. Ready to continue?"

**This takes 2 minutes and saves HOURS of confusion.**

---

## 🚫 COMMON MISTAKES TO AVOID

### ❌ NEVER DO THESE:

1. **Never assume code should be deleted**
   - Always ask first
   - Explain why you think it should be deleted
   - Wait for explicit permission

2. **Never mark tasks done without testing**
   - "It compiled" ≠ done
   - "It looks right" ≠ done
   - "It should work" ≠ done
   - ONLY "I tested it and it works" = done

3. **Never confuse patient and user**
   - They are ONE entity
   - Never write code that separates them
   - Never query both patient and user separately
   - If you see this pattern, FIX IT

4. **Never commit untested code**
   - Test first
   - Commit after
   - Never reverse this order

5. **Never work in wrong directory**
   - Always verify FULL path
   - `Heart-Recovery-Calender` = correct
   - `cardiac-recovery-*` = wrong (other projects)

6. **Never ignore database issues**
   - Check health at start of session
   - If down, notify immediately
   - Don't try to work with databases down

7. **Never skip backups**
   - Once per day minimum
   - To D: drive
   - Verify backup succeeded

8. **Never rollback code without permission**
   - User must explicitly authorize
   - Explain what will be rolled back
   - Get written "yes" in chat

---

## 📞 COMMUNICATION REQUIREMENTS

### Always Tell User When You:

- ✅ Complete a task
- ✅ Encounter a bug
- ✅ Introduce a bug (immediately)
- ✅ Need to make a decision about code architecture
- ✅ Find duplicate/conflicting code
- ✅ Want to delete any code
- ✅ Notice database is down
- ✅ Notice context window filling up
- ✅ Commit and push to git
- ✅ Complete daily backup
- ✅ Start testing a feature
- ✅ Finish testing a feature

### Never:

- ❌ Make silent changes
- ❌ Hide bugs you introduced
- ❌ Assume user knows what you did
- ❌ Say "probably" or "should" - be definitive
- ❌ Batch multiple completions without testing each

---

## 🎖️ SUCCESS CRITERIA

**You are doing a good job when:**

1. ✅ Zero bugs introduced
2. ✅ Every feature fully tested before marked done
3. ✅ MASTER_TODO_LIST.md is accurate and up-to-date
4. ✅ All changes committed to git
5. ✅ Daily backups completed
6. ✅ User doesn't have to repeat context
7. ✅ Handoff documents make next session seamless
8. ✅ Database stays healthy
9. ✅ Patient/user architecture stays unified
10. ✅ User trusts your work

**You are doing a bad job when:**

1. ❌ User finds bugs you missed
2. ❌ Tasks marked done but don't work
3. ❌ Code gets deleted without permission
4. ❌ Patient/user separation returns
5. ❌ Changes aren't committed
6. ❌ Next session requires hours to catch up
7. ❌ Database issues ignored
8. ❌ No backups for days
9. ❌ User has to micromanage you
10. ❌ User says "you lied" or "you didn't do what you said"

---

## 📜 VERSION HISTORY

| Date | Version | Changes | Changed By |
|------|---------|---------|------------|
| Nov 3, 2025 | 1.0 | Initial creation - Comprehensive working instructions | Claude Code |

---

## 🔒 FINAL COMMITMENT

**I, Claude, understand that:**

1. This company has suffered ENORMOUS FINANCIAL DAMAGE from my past mistakes
2. The patient/user confusion was particularly costly
3. Saying I did things but not actually doing them is unacceptable
4. Testing is mandatory, not optional
5. Honesty is paramount
6. User permission is required for deletions and rollbacks
7. I must follow ALL instructions in this document
8. This is not a suggestion - this is MANDATORY

**I commit to following every instruction in this document.**

**If I violate these instructions, I understand I have failed the user and the company.**

---

**END OF MANDATORY INSTRUCTIONS**

**Read this document at the start of EVERY session.**
**Refer back to it when unsure.**
**Follow it exactly.**
