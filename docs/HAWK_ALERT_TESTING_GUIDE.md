# HAWK Alert System - Testing Guide

## ⚠️ CRITICAL: Life-and-Death Alert Testing

These tests verify that the HAWK (Heart Activity Warning & Knowledge) alert system correctly identifies dangerous combinations that can cause CARDIAC EVENTS, HEAT STROKE, or SUDDEN DEATH.

---

## Test Setup

**Test Patient Profile**: John Desautels
- Email: brokerpinellas@gmail.com
- Location: Tampa, FL (for weather data)
- Weight: 180 lbs
- Gender: Male
- Age: 62
- Surgery Date: Sept 18, 2025

---

## 🚨 CRITICAL Test 1: Diuretics + Outdoor Exercise + Heat (DEADLY)

### **Expected Result**: CRITICAL alert that CANNOT be dismissed

### Setup:
1. Add medication to John's profile:
   - Name: "Lasix" or "Furosemide"
   - Add to `medicationsAffectingHR` field

2. Create calendar event:
   - Type: "Moderate Exercise" or "Vigorous Exercise"
   - Location: "Outdoor"
   - Date: Any day with temperature >85°F

3. Weather condition:
   - Temperature: 85°F or higher
   - (System will fetch this automatically from OpenWeather API)

### Test on Hot Day (>85°F):
```
Expected Alert:
---
🚨 CRITICAL: Deadly Dehydration Risk Detected

DANGER: You are planning outdoor exercise in 92°F heat while taking
diuretics (Lasix). This combination is LIFE-THREATENING and can cause
severe dehydration, electrolyte imbalance, and cardiac arrhythmias.

Actions:
❌ CANCEL outdoor activity or move indoors (air conditioning)
💧 Drink 24-32 oz water BEFORE any activity
⏰ Reschedule to early morning (<75°F) or evening
📞 Call your cardiologist if you experience: dizziness, chest pain,
   rapid heartbeat, or extreme fatigue
🏥 Have someone nearby - do NOT exercise alone

[CANNOT DISMISS]
```

### Test on EXTREME Heat Day (>95°F):
- Alert should show severity: CRITICAL (red, flashing)
- Email alert should be sent to brokerpinellas@gmail.com

---

## 🚨 CRITICAL Test 2: Low EF + High-Intensity Exercise (CARDIAC EVENT)

### **Expected Result**: CRITICAL alert that CANNOT be dismissed

### Setup:
1. Set John's ejection fraction to 35% (HFrEF - severely reduced)
   - Field: `ejectionFraction` in patient profile

2. Create calendar event:
   - Type: "Vigorous Exercise" or "Moderate Exercise"
   - Any location
   - Any weather

### Expected Alert:
```
🚨 CARDIAC RISK: Exercise Contraindicated

CRITICAL: Your ejection fraction is 35% (severely reduced).
High-intensity exercise is medically CONTRAINDICATED and poses
serious cardiac event risk.

Actions:
❌ DO NOT perform this high-intensity activity
🚶 Limit to light walking only (10-15 min, slow pace)
📞 Consult cardiologist before ANY exercise program
💓 Monitor heart rate - stop immediately if >100 bpm or if you feel:
   chest pain, shortness of breath, dizziness
🏥 Call 911 if you experience chest pain or severe shortness of breath

[CANNOT DISMISS]
```

---

## 🚨 CRITICAL Test 3: Extreme Heat + Dehydration (HEAT STROKE)

### **Expected Result**: CRITICAL alert that CANNOT be dismissed

### Setup:
1. Weather: Temperature >95°F

2. Hydration status:
   - Current: 20 oz consumed
   - Target: 80 oz (for John's weight/profile)
   - Ratio: 25% (severely dehydrated)

3. Any outdoor activity planned

### Expected Alert:
```
🚨 HEAT STROKE RISK: Critically Dehydrated in Extreme Heat

EMERGENCY: You are severely dehydrated (20oz / 80oz target) and the
temperature is 98°F. This is a medical emergency risk.

Actions:
💧 Drink 16-24 oz water IMMEDIATELY
❄️ Get to air conditioning NOW
❌ NO outdoor activities today
🌡️ Monitor for heat stroke symptoms: confusion, rapid pulse, hot/dry
   skin, nausea
🏥 Call 911 if you experience: confusion, seizures, loss of
   consciousness, or inability to drink

[CANNOT DISMISS]
```

---

## ⚠️ DANGER Test 4: Beta-Blockers + Heat

### **Expected Result**: DANGER alert (dismissable)

### Setup:
1. Add medication:
   - Name: "Metoprolol" or "Carvedilol" or "Atenolol"

2. Weather: Temperature >90°F

### Expected Alert:
```
⚠️ Heat Intolerance Risk: Beta-Blockers

WARNING: You're taking beta-blockers which reduce your body's ability
to regulate temperature in heat (93°F). You have reduced heat tolerance.

Actions:
❄️ Stay in air conditioning as much as possible
💧 Increase hydration by 16-24 oz
⏰ If outdoor activity is necessary, limit to early morning (<80°F)
👕 Wear light, loose clothing
🌡️ Monitor for: dizziness, excessive fatigue, confusion

[DISMISS]
```

---

## ⚠️ DANGER Test 5: Heart Failure + Overhydration (PULMONARY EDEMA)

### **Expected Result**: DANGER alert that CANNOT be dismissed

### Setup:
1. Set patient data:
   - EF: <50% OR heartConditions includes "Heart Failure" or "CHF"

2. Hydration status:
   - Current: 85 oz consumed
   - Target: 64 oz (restricted for CHF)
   - Ratio: 133% (overhydrated)

### Expected Alert:
```
⚠️ FLUID OVERLOAD RISK: Exceeding Cardiac Limit

WARNING: You have heart failure and are consuming excessive fluids
(85oz vs 64oz limit). This can cause fluid retention and pulmonary edema.

Actions:
❌ STOP drinking fluids for now
⚖️ Weigh yourself - sudden weight gain (>2-3 lbs overnight) requires
   immediate medical attention
👀 Monitor for: swelling in legs/feet, shortness of breath, difficulty
   lying flat
📞 Call cardiologist if you notice these symptoms
💊 Take your diuretic as prescribed - do NOT skip

[CANNOT DISMISS]
```

---

## ⚠️ WARNING Test 6: ACE Inhibitors + Heat

### **Expected Result**: WARNING alert (dismissable)

### Setup:
1. Add medication:
   - Name: "Lisinopril" or "Enalapril"

2. Weather: Temperature >90°F

### Expected Alert:
```
⚠️ Low Blood Pressure Risk

Your ACE inhibitor medication combined with 92°F heat may cause low
blood pressure and dizziness.

Actions:
💧 Stay well hydrated
🧍 Stand up slowly to avoid dizziness
📊 Monitor blood pressure if possible
📞 Call doctor if: severe dizziness, fainting, or confusion

[DISMISS]
```

---

## 🌡️ Test 7: Extreme Heat Warning (No Exercise)

### Setup:
- Weather: Temperature >105°F
- No specific activity planned

### Expected Alert:
```
🚨 EXTREME HEAT WARNING

EXTREME HEAT ADVISORY: 107°F is life-threatening, especially for
cardiac patients.

Actions:
❄️ Stay indoors with air conditioning
❌ NO outdoor activities
💧 Increase fluid intake by 24-32 oz
📞 Check in with family/friends regularly

[CANNOT DISMISS]
```

---

## Testing Procedure

### Manual Testing:

1. **Set up test patient** (John Desautels):
   ```sql
   UPDATE patients SET
     ejectionFraction = 35,
     currentWeight = 180,
     weightUnit = 'lbs',
     gender = 'male',
     city = 'Tampa',
     state = 'FL',
     medicationsAffectingHR = ARRAY['Lasix', 'Metoprolol']
   WHERE email = 'brokerpinellas@gmail.com';
   ```

2. **Create test calendar events**:
   - Outdoor run, 30 min, scheduled for 2pm (hottest time)
   - Indoor workout
   - Light walking

3. **Manipulate hydration**:
   - Log only 20 oz on a day with >95°F weather
   - Log 90 oz on a day with heart failure

4. **Check email**: brokerpinellas@gmail.com should receive:
   - CRITICAL alerts immediately
   - DANGER alerts within 5 minutes
   - WARNING alerts as digest (once per day)

### Automated Testing:

Create test suite in `backend/tests/hawkAlerts.test.ts`:

```typescript
describe('HAWK Alert System', () => {
  test('CRITICAL: Diuretics + Heat + Outdoor Exercise', () => {
    const alerts = analyzeForHAWKAlerts({
      medications: ['Lasix'],
      activityLocation: 'outdoor',
      activityType: 'moderate_exercise',
      temperature: 92,
    });

    expect(alerts).toContainEqual(
      expect.objectContaining({
        id: 'hawk_diuretic_heat_exercise',
        severity: 'danger',
        isDismissable: false,
      })
    );
  });

  test('CRITICAL: Low EF + High Intensity', () => {
    const alerts = analyzeForHAWKAlerts({
      ejectionFraction: 35,
      activityType: 'vigorous_exercise',
    });

    expect(alerts).toContainEqual(
      expect.objectContaining({
        id: 'hawk_low_ef_high_intensity',
        severity: 'critical',
        isDismissable: false,
      })
    );
  });

  // Add tests for all other scenarios...
});
```

---

## ✅ Success Criteria

Alert system passes if:

1. ✅ All CRITICAL alerts cannot be dismissed
2. ✅ Correct severity levels are assigned
3. ✅ Email alerts sent to patient's email (brokerpinellas@gmail.com)
4. ✅ Each alert shows medically accurate, actionable guidance
5. ✅ Weather data fetched in real-time from OpenWeather API
6. ✅ Patient-specific data is used (EF, meds, weight, location)
7. ✅ No data leaks between patients (John's alerts don't affect other users)

---

## 🚨 CRITICAL: Data Isolation Verification

**Test that patient data is NEVER mixed:**

1. Create second test patient: "Jane Doe"
   - Different medications
   - Different EF
   - Different location

2. Log in as John Desautels → Should see John's HAWK alerts only
3. Log in as Jane Doe → Should see Jane's HAWK alerts only
4. Therapist viewing John → Should see John's data only
5. Therapist viewing Jane → Should see Jane's data only

**If ANY patient sees another patient's data = CRITICAL FAILURE**
