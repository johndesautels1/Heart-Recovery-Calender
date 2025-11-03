# Notification System Investigation Report
## Heart Recovery Calendar - Notification Infrastructure Audit

Investigation Date: November 2, 2025
Status: CRITICAL FINDINGS - System Partially Implemented, NOT Operational

---

## EXECUTIVE SUMMARY

The notification system has significant infrastructure in place but NO active delivery mechanism. The codebase contains:
- Database fields for reminders and notifications (defined)
- API functions for sending emails/SMS/push (defined but never called)
- External service integrations (imported but not utilized)
- A commented-out scheduler system (disabled at startup)

Result: Users can enable reminders and create alerts, but nothing is ever delivered.

---

## 1. REMINDER FIELDS IN BACKEND MODELS (EXIST)

### Medication Model
File: backend/src/models/Medication.ts

- reminderEnabled?: boolean; (LINE 18 - FLAG EXISTS)
- Database default: false (LINE 120)
- Status: Field exists, defaults to FALSE
- Problem: No code checks this field to trigger reminders

### CalendarEvent Model
File: backend/src/models/CalendarEvent.ts

- reminderMinutes?: number; (LINE 14 - REMINDER MINUTES FIELD)
- Database default: 30 minutes (LINE 130)
- Status: Field exists, defaults to 30 minutes
- Problem: No scheduled job uses this value to send notifications

### Alert Model
File: backend/src/models/Alert.ts

- notificationSent: boolean; (LINE 18 - DELIVERY FLAG)
- notificationMethods?: string[]; (LINE 19 - METHODS ARRAY)
- Database default: false (LINE 125)
- Status: Fields exist
- Problem: notificationSent is always FALSE, never updated by automated system

---

## 2. NOTIFICATION SERVICE CODE (DEFINED BUT UNUSED)

File: backend/src/services/notificationService.ts

The file contains THREE notification functions:

1. sendEmail() - Uses nodemailer (Lines 18-35)
2. sendSMS() - Uses Twilio (Lines 37-43)
3. sendPush() - Uses Firebase Admin (Lines 45-52)

CRITICAL FINDING:
Search for these functions in entire codebase returns ONLY DEFINITIONS.
No controller, route, or service calls these functions.

grep -r "sendEmail\|sendSMS\|sendPush" backend/src/
Result: NO FUNCTION CALLS - Only function definitions found

This means: The functions exist but are NEVER INVOKED

---

## 3. EXTERNAL SERVICE INTEGRATIONS (INSTALLED BUT NOT USED)

### Nodemailer (Email)
- Package: nodemailer@7.0.10 (in package.json)
- Status: Installed, imported, but never called
- Configuration: Has placeholders (smtp.example.com)

### Twilio (SMS)
- Package: twilio@4.11.2 (in package.json)
- Status: Installed, imported, but never called
- API Keys: Expected in env vars but not used

### Firebase Admin (Push)
- Package: firebase-admin@13.5.0 (in package.json)
- Status: Installed, imported, but never called
- Config: Initialization code present but unreachable

### Scheduler Support
- Package: node-cron@4.2.1 (in package.json)
- Status: Installed but NOT USED

---

## 4. SCHEDULER DISABLED AT STARTUP

File: backend/src/app.ts

Line 13 - COMMENTED OUT:
// import { initializeScheduler } from './services/notificationScheduler';

Lines 134-135 - COMMENTED OUT:
  // initializeScheduler();
  // logger.info('Notification scheduler initialized');

THE SCHEDULER SERVICE FILE DOES NOT EXIST:
backend/src/services/notificationScheduler.ts - FILE MISSING

Result: Backend never attempts to set up any reminder/notification triggers

---

## 5. ALERT SYSTEM (MANUAL ONLY, NOT AUTOMATED)

File: backend/src/controllers/alertsController.ts

### Alert Creation (Lines 123-179)
When alerts created:
- notificationSent hardcoded to FALSE (Line 156)
- No notification triggered
- Alert sits in database indefinitely

### Alert Notification Marking (Lines 375-420)
The markNotified() endpoint exists but:
- It's a MANUAL API endpoint (PUT /api/alerts/:id/mark-notified)
- Nothing calls it automatically
- Users must manually mark notifications as sent

---

## 6. FRONTEND REMINDER FIELDS (EXIST)

### MedicationsPage.tsx
- reminderEnabled UI field exists
- Users can toggle reminders on/off
- But nothing delivers medication reminders

### CalendarPage.tsx
- reminderMinutes UI field exists (defaults to 30)
- Comment in code indicates INTENT: "Send alert email if missed"
- But NO actual email sending code exists

---

## 7. SUMMARY: WHAT EXISTS VS WHAT WORKS

| Component | Installed? | Implemented? | Working? |
|-----------|----------|------------|----------|
| Database reminder fields | YES | YES | NO (never read by any system) |
| Frontend UI | YES | YES | PARTIAL (shows UI but no delivery) |
| Nodemailer | YES | YES | NO (never called) |
| Twilio | YES | YES | NO (never called) |
| Firebase | YES | YES | NO (never called) |
| Notification functions | YES | YES | NO (never called) |
| Scheduler service | NO | NO | NO (doesn't exist) |
| Alert API | YES | YES | PARTIAL (manual only) |
| Automatic delivery | NO | NO | NO (doesn't exist) |

---

## 8. ROOT CAUSE

The system is in a PARTIALLY-IMPLEMENTED, ABANDONED state:

Phase 1 - Completed:
- Database schema with reminder/notification fields
- UI for showing/editing reminders
- Notification service skeleton
- External service imports

Phase 2 - Never Completed:
- Scheduler service NOT created
- Notification functions NOT integrated
- No trigger system for reminder times
- No background job processor
- No worker thread or cron job

Phase 3 - Disabled:
- Scheduler import commented out
- Scheduler initialization commented out
- Result: No reminder processing at all

---

## 9. WHAT HAPPENS IN PRODUCTION

### User Enables Medication Reminder
1. User creates medication with reminderEnabled: true
2. Database saves this field
3. Frontend displays "Reminders ON"
4. ABSOLUTELY NOTHING HAPPENS

### User Creates Alert
1. Alert created with notificationSent = false
2. Alert sits in database forever
3. User never receives notification
4. Only manual API call can mark it "notified"

### What SHOULD Happen
From requirements:
- Medication missed alerts
- Activity issue alerts
- Patient notification system
- Alert delivery via email, SMS, push

---

## 10. ENVIRONMENT VARIABLES DEFINED

The .env.example shows all expected variables:
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

BUT: These will never be used since no code calls the functions.

---

## 11. TO MAKE NOTIFICATIONS WORK

You MUST:

1. Create NotificationScheduler Service
   File: backend/src/services/notificationScheduler.ts (MISSING)
   
2. Implement scheduler with node-cron
   Query for reminders due
   Query for unresolved alerts
   Call notification service functions
   Update database to mark sent

3. Uncomment scheduler initialization in app.ts
   Line 13: import statement
   Lines 134-135: initializeScheduler() call

4. Add Device Token Management
   Store user device tokens in database
   Register devices through API
   Query tokens for push notifications

5. Add Email Templates
   HTML email templates
   Personalization
   Retry logic

---

## CONCLUSION

The COPILOT_AUDIT_LIST.md is CORRECT:
"Notification system has flags/fields but no actual delivery mechanism"

Current Status:
- Database: Fully prepared for notifications ✅
- UI: Fully prepared for reminders ✅
- API: Partially prepared ⚠️
- Delivery: Does not exist ❌

Users can enable reminders, but nothing will ever be sent to them.

This is a critical feature gap for production deployment.

