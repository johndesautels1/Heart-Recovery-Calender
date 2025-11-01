# Heart Recovery Calendar API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:5000/api` (Development)
**Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [API Endpoints](#api-endpoints)
   - [Authentication & User Management](#authentication--user-management)
   - [Patient Management](#patient-management)
   - [Health Tracking](#health-tracking)
   - [Calendar & Events](#calendar--events)
   - [Food & Nutrition](#food--nutrition)
   - [Exercise & Physical Therapy](#exercise--physical-therapy)
   - [Sleep & Wellness](#sleep--wellness)
   - [Device Integration](#device-integration)
   - [Alerts & Notifications](#alerts--notifications)
   - [File Upload](#file-upload)

---

## Overview

The Heart Recovery Calendar API is a comprehensive RESTful API designed for cardiac rehabilitation and recovery tracking. It provides endpoints for managing patient health data, vital signs, medications, exercise prescriptions, meal tracking, and integration with fitness devices (Strava, Polar, Samsung Health).

**Key Features:**
- Role-based access control (Patient, Therapist, Admin)
- Real-time vital signs tracking
- Medication adherence monitoring
- Exercise prescription management
- Meal and nutrition tracking
- Device integration for automated data collection
- Customizable alerts and notifications
- HIPAA-compliant data handling

---

## Authentication

### Authentication Methods

1. **Local Authentication (Email/Password)**
2. **OAuth 2.0 (Google, Apple)**
3. **Device OAuth (Strava, Polar, Samsung Health)**

### JWT Token Structure

All authenticated requests require a JWT bearer token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

**Token Payload:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "iat": 1699000000,
  "exp": 1699604800
}
```

**Token Expiration:** 7 days

### Obtaining a Token

**Method 1: Local Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "patient"
  }
}
```

**Method 2: OAuth (Google)**
1. Redirect user to `GET /auth/google`
2. User authenticates with Google
3. Google redirects to `/auth/google/callback`
4. Token returned in query string: `/auth-success?token=<jwt>`

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)",
  "statusCode": 400
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |

### Common Error Examples

**401 Unauthorized:**
```json
{
  "error": "No token provided",
  "statusCode": 401
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied. Therapist role required.",
  "statusCode": 403
}
```

**404 Not Found:**
```json
{
  "error": "Patient not found",
  "statusCode": 404
}
```

---

## Rate Limiting

**Current Status:** Not yet implemented (planned for SEC-007)

**Planned Limits:**
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## API Endpoints

### Authentication & User Management

#### Register New User

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "name": "Jane Doe",
  "role": "patient"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 124,
    "email": "newuser@example.com",
    "name": "Jane Doe",
    "role": "patient",
    "createdAt": "2025-11-01T12:00:00.000Z"
  }
}
```

**Access:** Public

---

#### Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "patient"
  }
}
```

**Access:** Public

---

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "patient",
  "profileCompleted": true,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

**Access:** Private

---

#### Complete User Profile

```http
POST /api/auth/complete-profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone": "+1-555-0123",
  "dateOfBirth": "1985-06-15",
  "address": "123 Main St, City, State 12345",
  "emergencyContact": "Jane Doe (555-0124)"
}
```

**Response (200):**
```json
{
  "message": "Profile completed successfully",
  "user": { /* updated user object */ }
}
```

**Access:** Private

---

#### OAuth - Google Login

```http
GET /auth/google
```

**Description:** Initiates Google OAuth 2.0 authentication flow. Redirects to Google consent screen.

**Access:** Public

---

#### OAuth - Google Callback

```http
GET /auth/google/callback
```

**Description:** Google OAuth callback. Exchanges authorization code for user profile and generates JWT.

**Response:** Redirects to `/auth-success?token=<jwt>`

**Access:** Public (callback from Google)

---

#### OAuth - Apple Sign In

```http
GET /auth/apple
```

**Description:** Initiates Apple Sign In authentication flow.

**Access:** Public

---

#### OAuth - Apple Callback

```http
POST /auth/apple/callback
```

**Description:** Apple Sign In callback. Exchanges code for user profile and generates JWT.

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Access:** Public (callback from Apple)

---

#### Get User Profile

```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "patient",
  "phone": "+1-555-0123",
  "dateOfBirth": "1985-06-15",
  "address": "123 Main St",
  "emergencyContact": "Jane Doe (555-0124)",
  "profileCompleted": true
}
```

**Access:** Private

---

#### Update User Profile

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John A. Doe",
  "phone": "+1-555-9999",
  "address": "456 Oak Ave"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": { /* updated user object */ }
}
```

**Access:** Private

---

#### Delete User Account

```http
DELETE /api/users/account
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

**Access:** Private

---

### Patient Management

#### Get All Patients (Therapist Only)

```http
GET /api/patients
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "name": "John Doe",
    "dateOfBirth": "1985-06-15",
    "surgeryType": "Coronary Artery Bypass Graft",
    "surgeryDate": "2025-01-10",
    "assignedTherapistId": 456,
    "riskLevel": "moderate",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**Access:** Private (Therapist only)

---

#### Get Patient by ID

```http
GET /api/patients/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "name": "John Doe",
  "dateOfBirth": "1985-06-15",
  "surgeryType": "Coronary Artery Bypass Graft",
  "surgeryDate": "2025-01-10",
  "assignedTherapistId": 456,
  "riskLevel": "moderate",
  "medicalHistory": "Hypertension, Type 2 Diabetes",
  "currentMedications": "Aspirin 81mg, Lisinopril 10mg",
  "targetHeartRate": 120,
  "baselineWeight": 185.5,
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Access:** Private (Self or assigned therapist)

---

#### Create Patient Profile

```http
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "dateOfBirth": "1985-06-15",
  "surgeryType": "Coronary Artery Bypass Graft",
  "surgeryDate": "2025-01-10",
  "medicalHistory": "Hypertension, Type 2 Diabetes",
  "riskLevel": "moderate",
  "targetHeartRate": 120,
  "baselineWeight": 185.5
}
```

**Response (201):**
```json
{
  "message": "Patient profile created successfully",
  "patient": { /* patient object */ }
}
```

**Access:** Private

---

#### Update Patient Profile

```http
PUT /api/patients/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "riskLevel": "low",
  "targetHeartRate": 130,
  "currentMedications": "Aspirin 81mg, Lisinopril 10mg, Atorvastatin 20mg"
}
```

**Response (200):**
```json
{
  "message": "Patient profile updated successfully",
  "patient": { /* updated patient object */ }
}
```

**Access:** Private (Self or assigned therapist)

---

#### Assign Therapist to Patient

```http
POST /api/patients/:id/assign-therapist
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "therapistId": 456
}
```

**Response (200):**
```json
{
  "message": "Therapist assigned successfully",
  "patient": { /* updated patient object */ }
}
```

**Access:** Private (Therapist only)

---

#### Get Patient's Recent Activity

```http
GET /api/patients/:id/recent-activity
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "vitals": [ /* recent vital sign records */ ],
  "medications": [ /* recent medication logs */ ],
  "exercises": [ /* recent exercise logs */ ],
  "meals": [ /* recent meal entries */ ]
}
```

**Access:** Private (Self or assigned therapist)

---

#### Get Patient's Progress Summary

```http
GET /api/patients/:id/progress
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "adherenceRate": 87.5,
  "averageHeartRate": 78,
  "weightChange": -5.2,
  "exerciseMinutesThisWeek": 180,
  "lastVitalsCheck": "2025-11-01T08:00:00.000Z",
  "activeAlerts": 2
}
```

**Access:** Private (Self or assigned therapist)

---

#### Delete Patient Profile

```http
DELETE /api/patients/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Patient profile deleted successfully"
}
```

**Access:** Private (Self or assigned therapist)

---

### Health Tracking

#### Vital Signs

##### Get All Vitals

```http
GET /api/vitals
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO date string (e.g., "2025-10-01")
- `endDate` (optional): ISO date string
- `limit` (optional): Number of records (default: 100)

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "systolicBP": 120,
    "diastolicBP": 80,
    "heartRate": 72,
    "weight": 183.5,
    "oxygenSaturation": 98,
    "temperature": 98.6,
    "recordedAt": "2025-11-01T08:00:00.000Z",
    "notes": "Feeling good today",
    "createdAt": "2025-11-01T08:05:00.000Z"
  }
]
```

**Access:** Private

---

##### Record New Vitals

```http
POST /api/vitals
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "systolicBP": 118,
  "diastolicBP": 78,
  "heartRate": 70,
  "weight": 183.0,
  "oxygenSaturation": 99,
  "temperature": 98.4,
  "recordedAt": "2025-11-01T08:00:00.000Z",
  "notes": "Morning measurement"
}
```

**Response (201):**
```json
{
  "message": "Vital signs recorded successfully",
  "vital": { /* created vital record */ }
}
```

**Access:** Private

---

##### Get Latest Vitals

```http
GET /api/vitals/latest
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "systolicBP": 118,
  "diastolicBP": 78,
  "heartRate": 70,
  "weight": 183.0,
  "oxygenSaturation": 99,
  "temperature": 98.4,
  "recordedAt": "2025-11-01T08:00:00.000Z"
}
```

**Access:** Private

---

##### Get Vital by ID

```http
GET /api/vitals/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "systolicBP": 118,
  "diastolicBP": 78,
  "heartRate": 70,
  "weight": 183.0,
  "recordedAt": "2025-11-01T08:00:00.000Z"
}
```

**Access:** Private

---

##### Update Vital Record

```http
PUT /api/vitals/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Updated notes - feeling better after medication"
}
```

**Response (200):**
```json
{
  "message": "Vital signs updated successfully",
  "vital": { /* updated vital record */ }
}
```

**Access:** Private

---

##### Delete Vital Record

```http
DELETE /api/vitals/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Vital signs record deleted successfully"
}
```

**Access:** Private

---

##### Get Vitals Trends

```http
GET /api/vitals/trends
Authorization: Bearer <token>
```

**Query Parameters:**
- `metric`: "heartRate" | "bloodPressure" | "weight" | "oxygenSaturation"
- `period`: "week" | "month" | "3months" | "6months" | "year"

**Response (200):**
```json
{
  "metric": "heartRate",
  "period": "week",
  "data": [
    { "date": "2025-10-26", "value": 74 },
    { "date": "2025-10-27", "value": 72 },
    { "date": "2025-10-28", "value": 70 },
    { "date": "2025-10-29", "value": 71 },
    { "date": "2025-10-30", "value": 69 },
    { "date": "2025-10-31", "value": 68 },
    { "date": "2025-11-01", "value": 70 }
  ],
  "average": 70.57,
  "trend": "decreasing"
}
```

**Access:** Private

---

#### Medications

##### Get All Medications

```http
GET /api/medications
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "name": "Aspirin",
    "dosage": "81mg",
    "frequency": "Once daily",
    "prescribedBy": "Dr. Smith",
    "startDate": "2025-01-15",
    "endDate": null,
    "isActive": true,
    "purpose": "Blood thinner",
    "sideEffects": "Stomach upset (rare)",
    "instructions": "Take with food"
  }
]
```

**Access:** Private

---

##### Add New Medication

```http
POST /api/medications
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "prescribedBy": "Dr. Smith",
  "startDate": "2025-01-15",
  "purpose": "Blood pressure control",
  "instructions": "Take in the morning"
}
```

**Response (201):**
```json
{
  "message": "Medication added successfully",
  "medication": { /* created medication */ }
}
```

**Access:** Private

---

##### Get Medication by ID

```http
GET /api/medications/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "name": "Aspirin",
  "dosage": "81mg",
  "frequency": "Once daily",
  "isActive": true
}
```

**Access:** Private

---

##### Update Medication

```http
PUT /api/medications/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "dosage": "162mg",
  "frequency": "Twice daily"
}
```

**Response (200):**
```json
{
  "message": "Medication updated successfully",
  "medication": { /* updated medication */ }
}
```

**Access:** Private

---

##### Delete Medication

```http
DELETE /api/medications/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Medication deleted successfully"
}
```

**Access:** Private

---

##### Log Medication Taken

```http
POST /api/medications/:id/log
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "takenAt": "2025-11-01T08:00:00.000Z",
  "taken": true,
  "notes": "Taken with breakfast"
}
```

**Response (201):**
```json
{
  "message": "Medication log recorded",
  "log": { /* created log entry */ }
}
```

**Access:** Private

---

##### Get Medication Logs

```http
GET /api/medications/:id/logs
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**
```json
[
  {
    "id": 1,
    "medicationId": 1,
    "userId": 123,
    "takenAt": "2025-11-01T08:00:00.000Z",
    "taken": true,
    "notes": "Taken with breakfast",
    "createdAt": "2025-11-01T08:05:00.000Z"
  }
]
```

**Access:** Private

---

##### Get Medication Adherence Report

```http
GET /api/medications/:id/adherence
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: "week" | "month" | "3months"

**Response (200):**
```json
{
  "medicationId": 1,
  "medicationName": "Aspirin",
  "period": "week",
  "expectedDoses": 7,
  "takenDoses": 6,
  "adherenceRate": 85.7,
  "missedDates": ["2025-10-29"]
}
```

**Access:** Private

---

##### Get All Active Medications

```http
GET /api/medications/active
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Aspirin",
    "dosage": "81mg",
    "frequency": "Once daily",
    "nextDose": "2025-11-01T08:00:00.000Z"
  }
]
```

**Access:** Private

---

### Calendar & Events

#### Calendars

##### Get All Calendars

```http
GET /api/calendars
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "name": "Recovery Calendar",
    "description": "My cardiac recovery journey",
    "color": "#4CAF50",
    "isDefault": true,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Calendar

```http
POST /api/calendars
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Exercise Calendar",
  "description": "Physical therapy and exercise schedule",
  "color": "#2196F3"
}
```

**Response (201):**
```json
{
  "message": "Calendar created successfully",
  "calendar": { /* created calendar */ }
}
```

**Access:** Private

---

##### Get Calendar by ID

```http
GET /api/calendars/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "name": "Recovery Calendar",
  "color": "#4CAF50",
  "isDefault": true
}
```

**Access:** Private

---

##### Update Calendar

```http
PUT /api/calendars/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Calendar Name",
  "color": "#FF5722"
}
```

**Response (200):**
```json
{
  "message": "Calendar updated successfully",
  "calendar": { /* updated calendar */ }
}
```

**Access:** Private

---

##### Delete Calendar

```http
DELETE /api/calendars/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Calendar deleted successfully"
}
```

**Access:** Private

---

#### Calendar Events

##### Get All Events

```http
GET /api/events
Authorization: Bearer <token>
```

**Query Parameters:**
- `calendarId` (optional): Filter by calendar
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `type` (optional): Event type (e.g., "appointment", "medication", "exercise")

**Response (200):**
```json
[
  {
    "id": 1,
    "calendarId": 1,
    "userId": 123,
    "title": "Cardiology Follow-up",
    "description": "3-month post-surgery checkup",
    "startTime": "2025-11-05T14:00:00.000Z",
    "endTime": "2025-11-05T15:00:00.000Z",
    "type": "appointment",
    "location": "City Medical Center",
    "reminderMinutes": 60,
    "isCompleted": false,
    "createdAt": "2025-11-01T10:00:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Event

```http
POST /api/events
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "calendarId": 1,
  "title": "Morning Walk",
  "description": "30-minute walk in the park",
  "startTime": "2025-11-02T08:00:00.000Z",
  "endTime": "2025-11-02T08:30:00.000Z",
  "type": "exercise",
  "reminderMinutes": 15
}
```

**Response (201):**
```json
{
  "message": "Event created successfully",
  "event": { /* created event */ }
}
```

**Access:** Private

---

##### Get Event by ID

```http
GET /api/events/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "calendarId": 1,
  "title": "Cardiology Follow-up",
  "startTime": "2025-11-05T14:00:00.000Z",
  "endTime": "2025-11-05T15:00:00.000Z",
  "type": "appointment",
  "isCompleted": false
}
```

**Access:** Private

---

##### Update Event

```http
PUT /api/events/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "startTime": "2025-11-05T15:00:00.000Z",
  "endTime": "2025-11-05T16:00:00.000Z",
  "reminderMinutes": 120
}
```

**Response (200):**
```json
{
  "message": "Event updated successfully",
  "event": { /* updated event */ }
}
```

**Access:** Private

---

##### Delete Event

```http
DELETE /api/events/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Event deleted successfully"
}
```

**Access:** Private

---

##### Mark Event as Completed

```http
POST /api/events/:id/complete
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "completed": true,
  "completionNotes": "Went well, no issues"
}
```

**Response (200):**
```json
{
  "message": "Event marked as completed",
  "event": { /* updated event */ }
}
```

**Access:** Private

---

##### Get Upcoming Events

```http
GET /api/events/upcoming
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (optional): Number of days to look ahead (default: 7)

**Response (200):**
```json
[
  {
    "id": 2,
    "title": "Morning Walk",
    "startTime": "2025-11-02T08:00:00.000Z",
    "type": "exercise"
  },
  {
    "id": 3,
    "title": "Take Lisinopril",
    "startTime": "2025-11-02T09:00:00.000Z",
    "type": "medication"
  }
]
```

**Access:** Private

---

##### Get Events by Date Range

```http
GET /api/events/range
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)

**Response (200):**
```json
[
  { /* event objects within date range */ }
]
```

**Access:** Private

---

##### Create Recurring Event

```http
POST /api/events/recurring
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "calendarId": 1,
  "title": "Daily Medication",
  "startTime": "2025-11-01T08:00:00.000Z",
  "endTime": "2025-11-01T08:05:00.000Z",
  "type": "medication",
  "recurrenceRule": "FREQ=DAILY;COUNT=30"
}
```

**Response (201):**
```json
{
  "message": "Recurring event created successfully",
  "eventsCreated": 30,
  "events": [ /* array of created event instances */ ]
}
```

**Access:** Private

---

### Food & Nutrition

#### Food Categories

##### Get All Food Categories

```http
GET /api/food-categories
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Vegetables",
    "description": "All vegetable items",
    "color": "#4CAF50",
    "sortOrder": 1
  }
]
```

**Access:** Private

---

##### Create Food Category

```http
POST /api/food-categories
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Lean Proteins",
  "description": "Heart-healthy protein sources",
  "color": "#FF5722"
}
```

**Response (201):**
```json
{
  "message": "Food category created successfully",
  "category": { /* created category */ }
}
```

**Access:** Private

---

##### Update Food Category

```http
PUT /api/food-categories/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Category Name",
  "color": "#2196F3"
}
```

**Response (200):**
```json
{
  "message": "Food category updated successfully",
  "category": { /* updated category */ }
}
```

**Access:** Private

---

##### Delete Food Category

```http
DELETE /api/food-categories/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Food category deleted successfully"
}
```

**Access:** Private

---

#### Food Items

##### Get All Food Items

```http
GET /api/food-items
Authorization: Bearer <token>
```

**Query Parameters:**
- `categoryId` (optional): Filter by category
- `search` (optional): Search by name

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "categoryId": 1,
    "name": "Spinach",
    "servingSize": "1 cup",
    "calories": 7,
    "protein": 0.9,
    "carbs": 1.1,
    "fat": 0.1,
    "fiber": 0.7,
    "sodium": 24,
    "isHeartHealthy": true,
    "notes": "Excellent source of iron"
  }
]
```

**Access:** Private

---

##### Create Food Item

```http
POST /api/food-items
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "categoryId": 1,
  "name": "Broccoli",
  "servingSize": "1 cup",
  "calories": 31,
  "protein": 2.6,
  "carbs": 6,
  "fat": 0.3,
  "fiber": 2.4,
  "sodium": 30,
  "isHeartHealthy": true
}
```

**Response (201):**
```json
{
  "message": "Food item created successfully",
  "foodItem": { /* created food item */ }
}
```

**Access:** Private

---

##### Get Food Item by ID

```http
GET /api/food-items/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Spinach",
  "servingSize": "1 cup",
  "calories": 7,
  "isHeartHealthy": true
}
```

**Access:** Private

---

##### Update Food Item

```http
PUT /api/food-items/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "calories": 35,
  "notes": "Updated nutritional info"
}
```

**Response (200):**
```json
{
  "message": "Food item updated successfully",
  "foodItem": { /* updated food item */ }
}
```

**Access:** Private

---

##### Delete Food Item

```http
DELETE /api/food-items/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Food item deleted successfully"
}
```

**Access:** Private

---

##### Search Food Items

```http
GET /api/food-items/search
Authorization: Bearer <token>
```

**Query Parameters:**
- `q`: Search query (required)

**Response (200):**
```json
[
  { /* matching food items */ }
]
```

**Access:** Private

---

#### Meals

##### Get All Meals

```http
GET /api/meals
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "mealType": "breakfast",
    "mealDate": "2025-11-01",
    "mealTime": "08:00:00",
    "totalCalories": 350,
    "totalProtein": 15,
    "totalCarbs": 45,
    "totalFat": 12,
    "notes": "Healthy start to the day",
    "createdAt": "2025-11-01T08:30:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Meal Entry

```http
POST /api/meals
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "mealType": "lunch",
  "mealDate": "2025-11-01",
  "mealTime": "12:30:00",
  "items": [
    {
      "foodItemId": 1,
      "quantity": 2,
      "servingSize": "1 cup"
    },
    {
      "foodItemId": 5,
      "quantity": 1,
      "servingSize": "6 oz"
    }
  ],
  "notes": "Post-workout meal"
}
```

**Response (201):**
```json
{
  "message": "Meal entry created successfully",
  "meal": { /* created meal with calculated totals */ }
}
```

**Access:** Private

---

##### Get Meal by ID

```http
GET /api/meals/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "mealType": "breakfast",
  "mealDate": "2025-11-01",
  "totalCalories": 350,
  "items": [
    {
      "id": 1,
      "foodItem": {
        "name": "Oatmeal",
        "calories": 150
      },
      "quantity": 1,
      "servingSize": "1 cup"
    }
  ]
}
```

**Access:** Private

---

##### Update Meal Entry

```http
PUT /api/meals/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Updated notes - forgot to add honey",
  "items": [
    {
      "foodItemId": 1,
      "quantity": 1,
      "servingSize": "1 cup"
    },
    {
      "foodItemId": 10,
      "quantity": 1,
      "servingSize": "1 tbsp"
    }
  ]
}
```

**Response (200):**
```json
{
  "message": "Meal entry updated successfully",
  "meal": { /* updated meal */ }
}
```

**Access:** Private

---

##### Delete Meal Entry

```http
DELETE /api/meals/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Meal entry deleted successfully"
}
```

**Access:** Private

---

##### Get Daily Nutrition Summary

```http
GET /api/meals/daily-summary
Authorization: Bearer <token>
```

**Query Parameters:**
- `date`: ISO date string (default: today)

**Response (200):**
```json
{
  "date": "2025-11-01",
  "totalCalories": 1850,
  "totalProtein": 95,
  "totalCarbs": 210,
  "totalFat": 65,
  "totalFiber": 35,
  "totalSodium": 1800,
  "mealBreakdown": {
    "breakfast": { "calories": 350, "protein": 15, "carbs": 45, "fat": 12 },
    "lunch": { "calories": 550, "protein": 35, "carbs": 60, "fat": 20 },
    "dinner": { "calories": 650, "protein": 40, "carbs": 70, "fat": 25 },
    "snacks": { "calories": 300, "protein": 5, "carbs": 35, "fat": 8 }
  }
}
```

**Access:** Private

---

### Exercise & Physical Therapy

#### Exercises

##### Get All Exercises

```http
GET /api/exercises
Authorization: Bearer <token>
```

**Query Parameters:**
- `category` (optional): Exercise category (e.g., "cardio", "strength", "flexibility")

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Walking",
    "description": "Low-impact cardiovascular exercise",
    "category": "cardio",
    "difficulty": "beginner",
    "equipment": "None",
    "duration": 30,
    "videoUrl": "/uploads/exercises/walking-demo.mp4",
    "imageUrl": "/uploads/exercises/walking-thumb.jpg",
    "instructions": "Walk at a comfortable pace..."
  }
]
```

**Access:** Private

---

##### Create Exercise

```http
POST /api/exercises
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Seated Leg Lifts",
  "description": "Gentle leg strengthening exercise",
  "category": "strength",
  "difficulty": "beginner",
  "equipment": "Chair",
  "duration": 10,
  "instructions": "Sit in a sturdy chair..."
}
```

**Response (201):**
```json
{
  "message": "Exercise created successfully",
  "exercise": { /* created exercise */ }
}
```

**Access:** Private

---

##### Get Exercise by ID

```http
GET /api/exercises/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Walking",
  "description": "Low-impact cardiovascular exercise",
  "category": "cardio",
  "difficulty": "beginner",
  "instructions": "Walk at a comfortable pace..."
}
```

**Access:** Private

---

##### Update Exercise

```http
PUT /api/exercises/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "duration": 40,
  "instructions": "Updated instructions..."
}
```

**Response (200):**
```json
{
  "message": "Exercise updated successfully",
  "exercise": { /* updated exercise */ }
}
```

**Access:** Private

---

##### Delete Exercise

```http
DELETE /api/exercises/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Exercise deleted successfully"
}
```

**Access:** Private

---

#### Exercise Prescriptions

##### Get All Exercise Prescriptions

```http
GET /api/exercise-prescriptions
Authorization: Bearer <token>
```

**Query Parameters:**
- `patientId` (optional): Filter by patient (therapist only)
- `isActive` (optional): Filter by active status

**Response (200):**
```json
[
  {
    "id": 1,
    "patientId": 1,
    "therapistId": 456,
    "exerciseId": 1,
    "frequency": "5 times per week",
    "duration": 30,
    "intensity": "moderate",
    "startDate": "2025-10-15",
    "endDate": "2025-12-15",
    "isActive": true,
    "notes": "Gradually increase duration"
  }
]
```

**Access:** Private

---

##### Create Exercise Prescription

```http
POST /api/exercise-prescriptions
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": 1,
  "exerciseId": 1,
  "frequency": "5 times per week",
  "duration": 30,
  "intensity": "moderate",
  "startDate": "2025-11-01",
  "endDate": "2026-01-01",
  "notes": "Monitor heart rate throughout"
}
```

**Response (201):**
```json
{
  "message": "Exercise prescription created successfully",
  "prescription": { /* created prescription */ }
}
```

**Access:** Private (Therapist only)

---

##### Get Exercise Prescription by ID

```http
GET /api/exercise-prescriptions/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "patientId": 1,
  "exercise": {
    "name": "Walking",
    "category": "cardio"
  },
  "frequency": "5 times per week",
  "duration": 30,
  "intensity": "moderate",
  "isActive": true
}
```

**Access:** Private

---

##### Update Exercise Prescription

```http
PUT /api/exercise-prescriptions/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "duration": 40,
  "intensity": "moderate-high",
  "notes": "Patient progressing well"
}
```

**Response (200):**
```json
{
  "message": "Exercise prescription updated successfully",
  "prescription": { /* updated prescription */ }
}
```

**Access:** Private (Therapist only)

---

##### Delete Exercise Prescription

```http
DELETE /api/exercise-prescriptions/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Exercise prescription deleted successfully"
}
```

**Access:** Private (Therapist only)

---

##### Get Patient's Active Prescriptions

```http
GET /api/exercise-prescriptions/patient/:patientId/active
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "exercise": {
      "name": "Walking",
      "duration": 30
    },
    "frequency": "5 times per week",
    "intensity": "moderate"
  }
]
```

**Access:** Private

---

#### Exercise Logs

##### Get All Exercise Logs

```http
GET /api/exercise-logs
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "exerciseId": 1,
    "prescriptionId": 1,
    "logDate": "2025-11-01",
    "duration": 30,
    "intensity": "moderate",
    "heartRateAvg": 95,
    "heartRateMax": 115,
    "caloriesBurned": 180,
    "notes": "Felt good, no chest pain",
    "createdAt": "2025-11-01T09:30:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Exercise Log

```http
POST /api/exercise-logs
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "exerciseId": 1,
  "prescriptionId": 1,
  "logDate": "2025-11-01",
  "duration": 30,
  "intensity": "moderate",
  "heartRateAvg": 95,
  "heartRateMax": 115,
  "caloriesBurned": 180,
  "notes": "Morning walk in the park"
}
```

**Response (201):**
```json
{
  "message": "Exercise log created successfully",
  "log": { /* created log */ }
}
```

**Access:** Private

---

##### Get Exercise Log by ID

```http
GET /api/exercise-logs/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "exercise": {
    "name": "Walking",
    "category": "cardio"
  },
  "duration": 30,
  "heartRateAvg": 95,
  "notes": "Felt good, no chest pain"
}
```

**Access:** Private

---

##### Update Exercise Log

```http
PUT /api/exercise-logs/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "duration": 35,
  "notes": "Added 5 extra minutes"
}
```

**Response (200):**
```json
{
  "message": "Exercise log updated successfully",
  "log": { /* updated log */ }
}
```

**Access:** Private

---

##### Delete Exercise Log

```http
DELETE /api/exercise-logs/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Exercise log deleted successfully"
}
```

**Access:** Private

---

##### Get Weekly Exercise Summary

```http
GET /api/exercise-logs/weekly-summary
Authorization: Bearer <token>
```

**Query Parameters:**
- `week`: ISO date string (start of week, default: current week)

**Response (200):**
```json
{
  "weekStart": "2025-10-27",
  "weekEnd": "2025-11-02",
  "totalMinutes": 180,
  "totalCalories": 900,
  "sessionsCompleted": 6,
  "averageHeartRate": 92,
  "dailyBreakdown": [
    { "date": "2025-10-27", "minutes": 30, "calories": 150 },
    { "date": "2025-10-28", "minutes": 30, "calories": 150 },
    { "date": "2025-10-29", "minutes": 0, "calories": 0 },
    { "date": "2025-10-30", "minutes": 30, "calories": 150 },
    { "date": "2025-10-31", "minutes": 30, "calories": 150 },
    { "date": "2025-11-01", "minutes": 30, "calories": 150 },
    { "date": "2025-11-02", "minutes": 30, "calories": 150 }
  ]
}
```

**Access:** Private

---

### Sleep & Wellness

#### Sleep Logs

##### Get All Sleep Logs

```http
GET /api/sleep-logs
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "sleepDate": "2025-11-01",
    "bedtime": "22:30:00",
    "wakeTime": "06:30:00",
    "duration": 8,
    "quality": 4,
    "notes": "Slept well, no interruptions",
    "createdAt": "2025-11-01T07:00:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Sleep Log

```http
POST /api/sleep-logs
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sleepDate": "2025-11-01",
  "bedtime": "22:30:00",
  "wakeTime": "06:30:00",
  "quality": 4,
  "notes": "Felt refreshed upon waking"
}
```

**Response (201):**
```json
{
  "message": "Sleep log created successfully",
  "log": { /* created log with calculated duration */ }
}
```

**Access:** Private

---

##### Get Sleep Log by ID

```http
GET /api/sleep-logs/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "sleepDate": "2025-11-01",
  "duration": 8,
  "quality": 4
}
```

**Access:** Private

---

##### Update Sleep Log

```http
PUT /api/sleep-logs/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "quality": 5,
  "notes": "Actually slept great!"
}
```

**Response (200):**
```json
{
  "message": "Sleep log updated successfully",
  "log": { /* updated log */ }
}
```

**Access:** Private

---

##### Delete Sleep Log

```http
DELETE /api/sleep-logs/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Sleep log deleted successfully"
}
```

**Access:** Private

---

##### Get Sleep Trends

```http
GET /api/sleep-logs/trends
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: "week" | "month" | "3months"

**Response (200):**
```json
{
  "period": "week",
  "averageDuration": 7.5,
  "averageQuality": 4.2,
  "data": [
    { "date": "2025-10-26", "duration": 7, "quality": 4 },
    { "date": "2025-10-27", "duration": 8, "quality": 5 },
    { "date": "2025-10-28", "duration": 7.5, "quality": 4 },
    { "date": "2025-10-29", "duration": 7, "quality": 3 },
    { "date": "2025-10-30", "duration": 8, "quality": 4 },
    { "date": "2025-10-31", "duration": 7.5, "quality": 5 },
    { "date": "2025-11-01", "duration": 8, "quality": 4 }
  ]
}
```

**Access:** Private

---

#### Hydration Logs

##### Get All Hydration Logs

```http
GET /api/hydration-logs
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "logDate": "2025-11-01",
    "waterIntake": 72,
    "unit": "oz",
    "goal": 64,
    "notes": "Stayed well hydrated",
    "createdAt": "2025-11-01T20:00:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Hydration Log

```http
POST /api/hydration-logs
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "logDate": "2025-11-01",
  "waterIntake": 72,
  "unit": "oz",
  "goal": 64,
  "notes": "Met my goal today"
}
```

**Response (201):**
```json
{
  "message": "Hydration log created successfully",
  "log": { /* created log */ }
}
```

**Access:** Private

---

##### Get Hydration Log by ID

```http
GET /api/hydration-logs/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "logDate": "2025-11-01",
  "waterIntake": 72,
  "goal": 64
}
```

**Access:** Private

---

##### Update Hydration Log

```http
PUT /api/hydration-logs/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "waterIntake": 80,
  "notes": "Added evening water"
}
```

**Response (200):**
```json
{
  "message": "Hydration log updated successfully",
  "log": { /* updated log */ }
}
```

**Access:** Private

---

##### Delete Hydration Log

```http
DELETE /api/hydration-logs/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Hydration log deleted successfully"
}
```

**Access:** Private

---

#### Daily Scores

##### Get All Daily Scores

```http
GET /api/daily-scores
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "scoreDate": "2025-11-01",
    "overallScore": 85,
    "exerciseScore": 90,
    "nutritionScore": 80,
    "medicationScore": 95,
    "sleepScore": 85,
    "heartHealthRating": 8,
    "notes": "Great day overall",
    "createdAt": "2025-11-01T23:00:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Daily Score

```http
POST /api/daily-scores
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "scoreDate": "2025-11-01",
  "overallScore": 85,
  "exerciseScore": 90,
  "nutritionScore": 80,
  "medicationScore": 95,
  "sleepScore": 85,
  "heartHealthRating": 8,
  "notes": "Feeling strong"
}
```

**Response (201):**
```json
{
  "message": "Daily score created successfully",
  "score": { /* created score */ }
}
```

**Access:** Private

---

##### Get Daily Score by ID

```http
GET /api/daily-scores/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "scoreDate": "2025-11-01",
  "overallScore": 85,
  "heartHealthRating": 8
}
```

**Access:** Private

---

##### Update Daily Score

```http
PUT /api/daily-scores/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "heartHealthRating": 9,
  "notes": "Actually felt even better later"
}
```

**Response (200):**
```json
{
  "message": "Daily score updated successfully",
  "score": { /* updated score */ }
}
```

**Access:** Private

---

##### Delete Daily Score

```http
DELETE /api/daily-scores/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Daily score deleted successfully"
}
```

**Access:** Private

---

##### Get Latest Daily Score

```http
GET /api/daily-scores/latest
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "scoreDate": "2025-11-01",
  "overallScore": 85,
  "heartHealthRating": 8
}
```

**Access:** Private

---

### Device Integration

#### Device Management

##### Get All Connected Devices

```http
GET /api/devices
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "deviceType": "strava",
    "deviceName": "Strava Account",
    "isConnected": true,
    "lastSyncAt": "2025-11-01T08:00:00.000Z",
    "syncEnabled": true,
    "createdAt": "2025-10-15T10:00:00.000Z"
  }
]
```

**Access:** Private

---

##### Get Device by ID

```http
GET /api/devices/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "userId": 123,
  "deviceType": "strava",
  "deviceName": "Strava Account",
  "isConnected": true,
  "lastSyncAt": "2025-11-01T08:00:00.000Z"
}
```

**Access:** Private

---

##### Disconnect/Delete Device

```http
DELETE /api/devices/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Device disconnected successfully"
}
```

**Access:** Private

---

##### Update Device Sync Settings

```http
PATCH /api/devices/:id/settings
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "syncEnabled": false,
  "syncFrequency": "manual"
}
```

**Response (200):**
```json
{
  "message": "Device settings updated successfully",
  "device": { /* updated device */ }
}
```

**Access:** Private

---

##### Get Device Sync History

```http
GET /api/devices/:id/sync-history
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)

**Response (200):**
```json
[
  {
    "id": 1,
    "deviceConnectionId": 1,
    "syncType": "automatic",
    "status": "success",
    "recordsImported": 15,
    "syncStartedAt": "2025-11-01T08:00:00.000Z",
    "syncCompletedAt": "2025-11-01T08:00:05.000Z",
    "errorMessage": null
  }
]
```

**Access:** Private

---

##### Manually Trigger Device Sync

```http
POST /api/devices/:id/sync
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Device sync initiated successfully",
  "syncLog": {
    "id": 2,
    "status": "in_progress",
    "syncStartedAt": "2025-11-01T12:00:00.000Z"
  }
}
```

**Access:** Private

---

##### Get Latest Vitals from All Devices

```http
GET /api/devices/vitals/latest
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "strava": {
    "heartRate": 72,
    "lastActivity": "Morning Run",
    "timestamp": "2025-11-01T08:00:00.000Z"
  },
  "polar": {
    "heartRate": 68,
    "sleepQuality": 85,
    "timestamp": "2025-11-01T06:30:00.000Z"
  },
  "samsung": {
    "heartRate": 70,
    "steps": 8500,
    "timestamp": "2025-11-01T11:45:00.000Z"
  }
}
```

**Access:** Private

---

#### Device OAuth - Strava

##### Initiate Strava Connection

```http
GET /api/strava/connect
Authorization: Bearer <token>
```

**Description:** Initiates Strava OAuth flow. Redirects to Strava authorization page.

**Access:** Private

---

##### Strava OAuth Callback

```http
GET /api/strava/callback
```

**Query Parameters:**
- `code`: Authorization code from Strava
- `scope`: Granted scopes

**Description:** Exchanges authorization code for access token and saves device connection.

**Response:** Redirects to frontend with success/error message

**Access:** Public (OAuth callback)

---

##### Disconnect Strava

```http
DELETE /api/strava/disconnect
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Strava disconnected successfully"
}
```

**Access:** Private

---

##### Sync Strava Data

```http
POST /api/strava/sync
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Strava data synced successfully",
  "activitiesImported": 5,
  "vitalsImported": 10
}
```

**Access:** Private

---

#### Device OAuth - Polar

##### Initiate Polar Connection

```http
GET /api/polar/connect
Authorization: Bearer <token>
```

**Description:** Initiates Polar OAuth flow.

**Access:** Private

---

##### Polar OAuth Callback

```http
GET /api/polar/callback
```

**Query Parameters:**
- `code`: Authorization code from Polar

**Response:** Redirects to frontend with success/error message

**Access:** Public (OAuth callback)

---

##### Disconnect Polar

```http
DELETE /api/polar/disconnect
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Polar disconnected successfully"
}
```

**Access:** Private

---

##### Sync Polar Data

```http
POST /api/polar/sync
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Polar data synced successfully",
  "sleepDataImported": 7,
  "vitalsImported": 15
}
```

**Access:** Private

---

#### Device OAuth - Samsung Health

##### Initiate Samsung Health Connection

```http
GET /api/samsung/connect
Authorization: Bearer <token>
```

**Description:** Initiates Samsung Health OAuth flow.

**Access:** Private

---

##### Samsung Health OAuth Callback

```http
GET /api/samsung/callback
```

**Query Parameters:**
- `code`: Authorization code from Samsung

**Response:** Redirects to frontend with success/error message

**Access:** Public (OAuth callback)

---

##### Disconnect Samsung Health

```http
DELETE /api/samsung/disconnect
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Samsung Health disconnected successfully"
}
```

**Access:** Private

---

##### Sync Samsung Health Data

```http
POST /api/samsung/sync
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Samsung Health data synced successfully",
  "stepsImported": 7,
  "vitalsImported": 20
}
```

**Access:** Private

---

### Alerts & Notifications

#### Alerts

##### Get All Alerts

```http
GET /api/alerts
Authorization: Bearer <token>
```

**Query Parameters:**
- `isRead` (optional): Filter by read status
- `priority` (optional): Filter by priority ("low" | "medium" | "high" | "critical")

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "type": "vital_threshold",
    "title": "Blood Pressure Alert",
    "message": "Your blood pressure reading (145/95) is above target range",
    "priority": "high",
    "isRead": false,
    "actionRequired": true,
    "relatedEntityType": "vital",
    "relatedEntityId": 45,
    "createdAt": "2025-11-01T09:00:00.000Z"
  }
]
```

**Access:** Private

---

##### Create Alert

```http
POST /api/alerts
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "medication_reminder",
  "title": "Medication Due",
  "message": "Time to take your morning Lisinopril",
  "priority": "medium",
  "actionRequired": true,
  "relatedEntityType": "medication",
  "relatedEntityId": 3
}
```

**Response (201):**
```json
{
  "message": "Alert created successfully",
  "alert": { /* created alert */ }
}
```

**Access:** Private

---

##### Get Alert by ID

```http
GET /api/alerts/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "type": "vital_threshold",
  "title": "Blood Pressure Alert",
  "message": "Your blood pressure reading (145/95) is above target range",
  "priority": "high",
  "isRead": false
}
```

**Access:** Private

---

##### Mark Alert as Read

```http
PATCH /api/alerts/:id/read
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Alert marked as read",
  "alert": { /* updated alert */ }
}
```

**Access:** Private

---

##### Mark All Alerts as Read

```http
PATCH /api/alerts/mark-all-read
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "All alerts marked as read",
  "updatedCount": 5
}
```

**Access:** Private

---

##### Delete Alert

```http
DELETE /api/alerts/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Alert deleted successfully"
}
```

**Access:** Private

---

##### Get Unread Alert Count

```http
GET /api/alerts/unread/count
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "unreadCount": 3,
  "criticalCount": 1,
  "highPriorityCount": 2
}
```

**Access:** Private

---

##### Get Recent Alerts

```http
GET /api/alerts/recent
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of alerts (default: 10)

**Response (200):**
```json
[
  { /* recent alert objects */ }
]
```

**Access:** Private

---

### File Upload

#### Upload Exercise Media

```http
POST /api/upload/exercise-media
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
- `video` (optional): Video file (max 1 file)
- `image` (optional): Image file (max 1 file)

**Supported Formats:**
- Video: MP4, MOV, AVI (max 50MB)
- Image: JPG, JPEG, PNG, GIF (max 10MB)

**Response (200):**
```json
{
  "videoUrl": "/uploads/exercises/video-1699000000.mp4",
  "imageUrl": "/uploads/exercises/image-1699000000.jpg"
}
```

**Access:** Private

---

#### Delete Exercise Media

```http
DELETE /api/upload/exercise-media/:type/:filename
Authorization: Bearer <token>
```

**URL Parameters:**
- `type`: "video" or "image"
- `filename`: Name of the file to delete

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

**Access:** Private

---

## Additional Resources

### Postman Collection

Import the Postman collection for easy API testing:
- [Download Postman Collection](./postman_collection.json) *(to be created)*

### WebSocket Events

WebSocket support is planned (ARCH-003) for real-time updates:
- Device sync notifications
- Alert notifications
- Live vital sign streaming

### API Versioning

API versioning (ARCH-002) is planned for future releases. Current version is `v1` (implied).

### Security Headers

Security headers (SEC-006) will be added via Helmet middleware including:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security

---

## Support & Feedback

For API issues, feature requests, or general support:
- **GitHub Issues:** [https://github.com/yourusername/heart-recovery-calendar/issues](https://github.com/yourusername/heart-recovery-calendar/issues)
- **Email:** support@heartrecoverycalendar.com *(to be configured)*

---

**Last Updated:** November 1, 2025
**API Version:** 1.0.0
