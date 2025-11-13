# Medical Data JSONB Schema

**Version**: 1.0.0
**Last Updated**: 2025-11-13
**Related**: ADR_001_ENTITY_CONSOLIDATION.md

---

## Overview

The `User.medicalData` field is a **JSONB column** that stores patient-specific medical data in a flexible JSON structure. This field is **only populated for users with `role='patient'`**.

**Why JSONB?**
- Flexible schema for medical data that varies by patient
- Efficient querying with PostgreSQL JSONB operators
- No need for 105+ individual columns
- Easy to extend without migrations
- Industry-standard approach for semi-structured data

---

## Schema Structure

```typescript
interface MedicalData {
  // Demographics
  demographics?: {
    firstName?: string;
    lastName?: string;
    age?: number; // Auto-calculated from User.dateOfBirth
    race?: string;
    nationality?: string;
  };

  // Contact Information
  contact?: {
    primaryPhone?: string;
    primaryPhoneType?: 'mobile' | 'home' | 'work';
    alternatePhone?: string;
    preferredContactMethod?: 'phone' | 'email' | 'text';
    bestTimeToContact?: 'morning' | 'afternoon' | 'evening';
  };

  // Mailing Address
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Emergency Contacts
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    alternatePhone?: string;
    email?: string;
    sameAddress?: boolean;
  }>;

  // Physical Measurements
  measurements?: {
    height?: {
      value: number;
      unit: 'in' | 'cm';
    };
    weight?: {
      starting?: number;
      current?: number;
      target?: number;
      unit: 'kg' | 'lbs';
    };
  };

  // Surgery Details
  surgery?: {
    procedures?: string[]; // ['CABG', 'Valve Replacement', etc.]
    devicesImplanted?: string[]; // ['Pacemaker', 'ICD', 'Stents', etc.]
    surgeonName?: string;
    hospitalName?: string;
    dischargeDate?: string; // ISO 8601 date string
    dischargeInstructions?: string;
    notes?: string;
  };

  // Medical History
  history?: {
    priorHealthConditions?: string[]; // ['Diabetes', 'CKD', 'COPD', etc.]
    currentConditions?: string[];
    nonCardiacMedications?: string;
    allergies?: string;
    diagnosisDate?: string; // ISO 8601 date string
  };

  // Heart Condition
  cardiac?: {
    conditions?: string[]; // ['CAD', 'CHF', 'AFib', etc.]
    diagnosis?: string[];
    treatmentProtocol?: string[];
    recommendedTreatments?: string[];

    // Cardiac Vitals (CRITICAL for MET calculations)
    vitals?: {
      restingHeartRate?: number;
      maxHeartRate?: number; // Override 220-age if doctor sets limit
      targetHeartRateMin?: number;
      targetHeartRateMax?: number;
      baselineBpSystolic?: number;
      baselineBpDiastolic?: number;
      ejectionFraction?: number; // %
    };

    medicationsAffectingHR?: string[]; // ['Beta-blockers', etc.]
    activityRestrictions?: string;
  };

  // Device Integration
  devices?: {
    polarDeviceId?: string;
    samsungHealthAccount?: string;
    preferredDataSource?: 'polar' | 'samsung' | 'manual';
  };

  // Telehealth
  telehealth?: {
    zoomHandle?: string;
  };

  // General Notes
  notes?: string;

  // Extension Point for Future Fields
  custom?: {
    [key: string]: any;
  };
}
```

---

## Usage Examples

### TypeScript/Sequelize

**Creating a new patient user:**
```typescript
import User from './models/User';

const patient = await User.create({
  email: 'john.doe@example.com',
  password: 'hashedPassword',
  name: 'John Doe',
  role: 'patient',
  surgeryDate: new Date('2025-01-15'),
  dateOfBirth: new Date('1965-05-20'),
  gender: 'male',
  therapistId: 42, // Assigned therapist's user ID
  medicalData: {
    demographics: {
      firstName: 'John',
      lastName: 'Doe',
      race: 'Caucasian',
      nationality: 'American',
    },
    contact: {
      primaryPhone: '+1-555-123-4567',
      primaryPhoneType: 'mobile',
      preferredContactMethod: 'text',
      bestTimeToContact: 'afternoon',
    },
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'United States',
    },
    emergencyContacts: [
      {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '+1-555-987-6543',
        email: 'jane.doe@example.com',
        sameAddress: true,
      },
    ],
    measurements: {
      height: { value: 70, unit: 'in' },
      weight: { starting: 180, current: 175, target: 165, unit: 'lbs' },
    },
    surgery: {
      procedures: ['CABG', 'Valve Replacement'],
      devicesImplanted: ['Pacemaker'],
      surgeonName: 'Dr. Smith',
      hospitalName: 'Springfield General',
      dischargeDate: '2025-01-20',
      dischargeInstructions: 'Follow cardiac rehab protocol...',
    },
    history: {
      priorHealthConditions: ['Diabetes Type 2', 'Hypertension'],
      currentConditions: ['Hypertension'],
      allergies: 'Penicillin',
    },
    cardiac: {
      conditions: ['CAD', 'CHF'],
      vitals: {
        restingHeartRate: 65,
        maxHeartRate: 155, // Doctor override (220-65 = 155)
        targetHeartRateMin: 93, // 60% of max
        targetHeartRateMax: 132, // 85% of max
        baselineBpSystolic: 120,
        baselineBpDiastolic: 80,
        ejectionFraction: 45,
      },
      medicationsAffectingHR: ['Metoprolol (Beta-blocker)'],
      activityRestrictions: 'No lifting >10 lbs for 6 weeks',
    },
    devices: {
      polarDeviceId: 'POLAR-H10-ABC123',
      preferredDataSource: 'polar',
    },
  },
});
```

**Updating patient medical data:**
```typescript
// Update specific nested fields
await user.update({
  medicalData: {
    ...user.medicalData, // Preserve existing data
    measurements: {
      ...user.medicalData.measurements,
      weight: {
        ...user.medicalData.measurements.weight,
        current: 170, // Update current weight
      },
    },
  },
});

// Alternative: Update using JSONB operators (more efficient)
await sequelize.query(
  `UPDATE users
   SET "medicalData" = jsonb_set("medicalData", '{measurements,weight,current}', '170')
   WHERE id = :userId`,
  { replacements: { userId: user.id } }
);
```

**Querying JSONB fields:**
```typescript
// Find patients with specific heart condition
const cafPatients = await User.findAll({
  where: {
    role: 'patient',
    medicalData: {
      cardiac: {
        conditions: {
          [Op.contains]: ['CAD']
        }
      }
    }
  }
});

// Find patients with ejection fraction < 50%
const lowEfPatients = await sequelize.query(
  `SELECT * FROM users
   WHERE role = 'patient'
   AND (medicalData->'cardiac'->'vitals'->>'ejectionFraction')::numeric < 50`,
  { type: QueryTypes.SELECT }
);

// Find patients by therapist with specific device
const polarPatients = await User.findAll({
  where: {
    role: 'patient',
    therapistId: 42,
    [Op.and]: [
      sequelize.literal(`"medicalData"->'devices'->>'preferredDataSource' = 'polar'`)
    ]
  }
});
```

---

## PostgreSQL JSONB Indexes

For frequently queried fields, create GIN indexes:

```sql
-- Index for cardiac conditions queries
CREATE INDEX idx_users_medical_cardiac_conditions
ON users USING GIN ((medicalData->'cardiac'->'conditions'));

-- Index for device integration queries
CREATE INDEX idx_users_medical_devices
ON users USING GIN ((medicalData->'devices'));

-- Index for emergency contacts (full-text search)
CREATE INDEX idx_users_medical_emergency_contacts
ON users USING GIN ((medicalData->'emergencyContacts'));
```

---

## Migration Guide: Patient → User.medicalData

When migrating existing Patient records to User.medicalData, use this mapping:

| Patient Field | User.medicalData Path |
|---------------|----------------------|
| `firstName` | `demographics.firstName` |
| `lastName` | `demographics.lastName` |
| `age` | `demographics.age` |
| `race` | `demographics.race` |
| `nationality` | `demographics.nationality` |
| `primaryPhone` | `contact.primaryPhone` |
| `primaryPhoneType` | `contact.primaryPhoneType` |
| `alternatePhone` | `contact.alternatePhone` |
| `preferredContactMethod` | `contact.preferredContactMethod` |
| `bestTimeToContact` | `contact.bestTimeToContact` |
| `streetAddress` | `address.street` |
| `city` | `address.city` |
| `state` | `address.state` |
| `postalCode` | `address.postalCode` |
| `country` | `address.country` |
| `emergencyContact1Name` | `emergencyContacts[0].name` |
| `emergencyContact1Relationship` | `emergencyContacts[0].relationship` |
| `emergencyContact1Phone` | `emergencyContacts[0].phone` |
| `emergencyContact1AlternatePhone` | `emergencyContacts[0].alternatePhone` |
| `emergencyContact1Email` | `emergencyContacts[0].email` |
| `emergencyContact1SameAddress` | `emergencyContacts[0].sameAddress` |
| `emergencyContact2Name` | `emergencyContacts[1].name` |
| (etc.) | (etc.) |
| `height` | `measurements.height.value` |
| `heightUnit` | `measurements.height.unit` |
| `startingWeight` | `measurements.weight.starting` |
| `currentWeight` | `measurements.weight.current` |
| `targetWeight` | `measurements.weight.target` |
| `weightUnit` | `measurements.weight.unit` |
| `priorSurgicalProcedures` | `surgery.procedures` |
| `devicesImplanted` | `surgery.devicesImplanted` |
| `surgeonName` | `surgery.surgeonName` |
| `hospitalName` | `surgery.hospitalName` |
| `dischargeDate` | `surgery.dischargeDate` |
| `dischargeInstructions` | `surgery.dischargeInstructions` |
| `priorHealthConditions` | `history.priorHealthConditions` |
| `currentConditions` | `history.currentConditions` |
| `nonCardiacMedications` | `history.nonCardiacMedications` |
| `allergies` | `history.allergies` |
| `diagnosisDate` | `history.diagnosisDate` |
| `heartConditions` | `cardiac.conditions` |
| `cardiacDiagnosis` | `cardiac.diagnosis` |
| `currentTreatmentProtocol` | `cardiac.treatmentProtocol` |
| `recommendedTreatments` | `cardiac.recommendedTreatments` |
| `restingHeartRate` | `cardiac.vitals.restingHeartRate` |
| `maxHeartRate` | `cardiac.vitals.maxHeartRate` |
| `targetHeartRateMin` | `cardiac.vitals.targetHeartRateMin` |
| `targetHeartRateMax` | `cardiac.vitals.targetHeartRateMax` |
| `baselineBpSystolic` | `cardiac.vitals.baselineBpSystolic` |
| `baselineBpDiastolic` | `cardiac.vitals.baselineBpDiastolic` |
| `ejectionFraction` | `cardiac.vitals.ejectionFraction` |
| `medicationsAffectingHR` | `cardiac.medicationsAffectingHR` |
| `activityRestrictions` | `cardiac.activityRestrictions` |
| `polarDeviceId` | `devices.polarDeviceId` |
| `samsungHealthAccount` | `devices.samsungHealthAccount` |
| `preferredDataSource` | `devices.preferredDataSource` |
| `zoomHandle` | `telehealth.zoomHandle` |
| `notes` | `notes` |

### Fields that move to User (not medicalData):
| Patient Field | User Field |
|---------------|------------|
| `name` | `name` |
| `email` | `email` |
| `dateOfBirth` | `dateOfBirth` |
| `gender` | `gender` |
| `surgeryDate` | `surgeryDate` |
| `therapistId` | `therapistId` |
| `userId` | **REMOVE** (User IS the user) |

---

## Validation Rules

**TypeScript Type Definitions:**
```typescript
// backend/src/types/medicalData.ts
export interface MedicalData {
  demographics?: Demographics;
  contact?: ContactInfo;
  address?: Address;
  emergencyContacts?: EmergencyContact[];
  measurements?: Measurements;
  surgery?: SurgeryDetails;
  history?: MedicalHistory;
  cardiac?: CardiacInfo;
  devices?: DeviceIntegration;
  telehealth?: TelehealthInfo;
  notes?: string;
  custom?: Record<string, any>;
}

// (Full type definitions omitted for brevity - see schema structure above)
```

**Joi Validation Schema:**
```typescript
import Joi from 'joi';

export const medicalDataSchema = Joi.object({
  demographics: Joi.object({
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    age: Joi.number().integer().min(0).max(150),
    race: Joi.string().max(100),
    nationality: Joi.string().max(100),
  }),
  contact: Joi.object({
    primaryPhone: Joi.string().pattern(/^\+?[0-9\-\s()]+$/),
    primaryPhoneType: Joi.string().valid('mobile', 'home', 'work'),
    alternatePhone: Joi.string().pattern(/^\+?[0-9\-\s()]+$/),
    preferredContactMethod: Joi.string().valid('phone', 'email', 'text'),
    bestTimeToContact: Joi.string().valid('morning', 'afternoon', 'evening'),
  }),
  // (Full validation schema omitted for brevity)
});
```

---

## Best Practices

1. **Always preserve existing data when updating**:
   ```typescript
   // ✅ GOOD
   await user.update({
     medicalData: { ...user.medicalData, newField: value }
   });

   // ❌ BAD (overwrites entire object)
   await user.update({
     medicalData: { newField: value }
   });
   ```

2. **Use JSONB operators for efficient queries**:
   ```typescript
   // ✅ GOOD (JSONB operator)
   WHERE medicalData->'cardiac'->'vitals'->>'ejectionFraction'::numeric < 50

   // ❌ BAD (loads all data into memory)
   const users = await User.findAll({ where: { role: 'patient' } });
   const filtered = users.filter(u => u.medicalData?.cardiac?.vitals?.ejectionFraction < 50);
   ```

3. **Validate before saving**:
   ```typescript
   import { medicalDataSchema } from './validations';

   const { error } = medicalDataSchema.validate(medicalData);
   if (error) throw new Error(`Invalid medicalData: ${error.message}`);
   ```

4. **Use TypeScript types**:
   ```typescript
   import { MedicalData } from './types/medicalData';

   const medicalData: MedicalData = {
     cardiac: {
       vitals: { ejectionFraction: 45 }
     }
   };
   ```

---

## Performance Considerations

- **JSONB is fast** for PostgreSQL queries (binary format)
- **Use GIN indexes** for frequently queried nested fields
- **Avoid loading entire medicalData** if you only need one field (use JSONB operators)
- **Keep nested depth reasonable** (3-4 levels max)
- **Document custom fields** to avoid schema drift

---

## See Also

- `ADR_001_ENTITY_CONSOLIDATION.md` - Architecture decision context
- `ENTITY_ARCHITECTURE_AUDIT_REPORT.md` - Audit findings
- `backend/src/models/User.ts` - User model definition
- `backend/src/migrations/20251113000001-consolidate-patient-into-user.js` - Migration file
