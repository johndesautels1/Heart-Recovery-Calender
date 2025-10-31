import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface PatientAttributes {
  id: number;
  therapistId: number;
  userId?: number;  // Link to the patient's user account

  // Name (split fields)
  firstName?: string;
  lastName?: string;
  name: string; // Keep for backward compatibility

  // Demographics
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  age?: number; // Auto-calculated from DOB

  // Primary Contact
  email?: string;
  primaryPhone?: string;
  primaryPhoneType?: 'mobile' | 'home' | 'work';
  alternatePhone?: string;
  preferredContactMethod?: 'phone' | 'email' | 'text';
  bestTimeToContact?: 'morning' | 'afternoon' | 'evening';

  // Mailing Address
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  address?: string; // Keep for backward compatibility

  // Emergency Contact #1
  emergencyContact1Name?: string;
  emergencyContact1Relationship?: string;
  emergencyContact1Phone?: string;
  emergencyContact1AlternatePhone?: string;
  emergencyContact1Email?: string;
  emergencyContact1SameAddress?: boolean;

  // Emergency Contact #2
  emergencyContact2Name?: string;
  emergencyContact2Relationship?: string;
  emergencyContact2Phone?: string;
  emergencyContact2AlternatePhone?: string;
  emergencyContact2Email?: string;
  emergencyContact2SameAddress?: boolean;

  // Physical Measurements
  height?: number;
  heightUnit?: 'in' | 'cm';
  startingWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  weightUnit?: 'kg' | 'lbs';
  race?: string;
  nationality?: string;

  // Prior Surgical Procedures
  priorSurgicalProcedures?: string[]; // CABG, Valve Replacement, etc.
  devicesImplanted?: string[]; // Pacemaker, ICD, Stents, etc.
  priorSurgeryNotes?: string;
  hospitalName?: string;
  surgeonName?: string;
  surgeryDate?: Date;
  dischargeDate?: Date;
  dischargeInstructions?: string;

  // Medical History
  priorHealthConditions?: string[]; // Diabetes, CKD, COPD
  currentConditions?: string[];
  nonCardiacMedications?: string;
  allergies?: string;

  // Heart Condition
  diagnosisDate?: Date;
  heartConditions?: string[]; // CAD, CHF, AFib, etc.
  currentTreatmentProtocol?: string[];
  recommendedTreatments?: string[];

  // Cardiac Vitals (CRITICAL for MET calculations)
  restingHeartRate?: number;
  maxHeartRate?: number; // Override 220-age if doctor sets limit
  targetHeartRateMin?: number;
  targetHeartRateMax?: number;
  baselineBpSystolic?: number;
  baselineBpDiastolic?: number;
  ejectionFraction?: number; // %
  cardiacDiagnosis?: string[];
  medicationsAffectingHR?: string[]; // Beta-blockers, etc.
  activityRestrictions?: string;

  // Device Integration
  polarDeviceId?: string;
  samsungHealthAccount?: string;
  preferredDataSource?: 'polar' | 'samsung' | 'manual';

  zoomHandle?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PatientCreationAttributes extends Optional<PatientAttributes, 'id' | 'isActive'> {}

class Patient extends Model<PatientAttributes, PatientCreationAttributes> implements PatientAttributes {
  public id!: number;
  public therapistId!: number;
  public userId?: number;

  // Name
  public firstName?: string;
  public lastName?: string;
  public name!: string;

  // Demographics
  public dateOfBirth?: Date;
  public gender?: 'male' | 'female' | 'other';
  public age?: number;

  // Primary Contact
  public email?: string;
  public primaryPhone?: string;
  public primaryPhoneType?: 'mobile' | 'home' | 'work';
  public alternatePhone?: string;
  public preferredContactMethod?: 'phone' | 'email' | 'text';
  public bestTimeToContact?: 'morning' | 'afternoon' | 'evening';

  // Mailing Address
  public streetAddress?: string;
  public city?: string;
  public state?: string;
  public postalCode?: string;
  public country?: string;
  public address?: string;

  // Emergency Contact #1
  public emergencyContact1Name?: string;
  public emergencyContact1Relationship?: string;
  public emergencyContact1Phone?: string;
  public emergencyContact1AlternatePhone?: string;
  public emergencyContact1Email?: string;
  public emergencyContact1SameAddress?: boolean;

  // Emergency Contact #2
  public emergencyContact2Name?: string;
  public emergencyContact2Relationship?: string;
  public emergencyContact2Phone?: string;
  public emergencyContact2AlternatePhone?: string;
  public emergencyContact2Email?: string;
  public emergencyContact2SameAddress?: boolean;

  // Physical Measurements
  public height?: number;
  public heightUnit?: 'in' | 'cm';
  public startingWeight?: number;
  public currentWeight?: number;
  public targetWeight?: number;
  public weightUnit?: 'kg' | 'lbs';
  public race?: string;
  public nationality?: string;

  // Prior Surgical Procedures
  public priorSurgicalProcedures?: string[];
  public devicesImplanted?: string[];
  public priorSurgeryNotes?: string;
  public hospitalName?: string;
  public surgeonName?: string;
  public surgeryDate?: Date;
  public dischargeDate?: Date;
  public dischargeInstructions?: string;

  // Medical History
  public priorHealthConditions?: string[];
  public currentConditions?: string[];
  public nonCardiacMedications?: string;
  public allergies?: string;

  // Heart Condition
  public diagnosisDate?: Date;
  public heartConditions?: string[];
  public currentTreatmentProtocol?: string[];
  public recommendedTreatments?: string[];

  // Cardiac Vitals
  public restingHeartRate?: number;
  public maxHeartRate?: number;
  public targetHeartRateMin?: number;
  public targetHeartRateMax?: number;
  public baselineBpSystolic?: number;
  public baselineBpDiastolic?: number;
  public ejectionFraction?: number;
  public cardiacDiagnosis?: string[];
  public medicationsAffectingHR?: string[];
  public activityRestrictions?: string;

  // Device Integration
  public polarDeviceId?: string;
  public samsungHealthAccount?: string;
  public preferredDataSource?: 'polar' | 'samsung' | 'manual';

  public zoomHandle?: string;
  public notes?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    Patient.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        therapistId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Link to the patient user account for their data',
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        firstName: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        lastName: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        dateOfBirth: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Patient date of birth for age calculation',
        },
        gender: {
          type: DataTypes.STRING(10),
          allowNull: true,
          comment: 'male, female, or other',
        },
        age: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Auto-calculated from dateOfBirth',
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        primaryPhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        primaryPhoneType: {
          type: DataTypes.STRING(10),
          allowNull: true,
          comment: 'mobile, home, or work',
        },
        alternatePhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        preferredContactMethod: {
          type: DataTypes.STRING(10),
          allowNull: true,
          comment: 'phone, email, or text',
        },
        bestTimeToContact: {
          type: DataTypes.STRING(15),
          allowNull: true,
          comment: 'morning, afternoon, or evening',
        },
        streetAddress: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        city: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        state: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        postalCode: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        country: {
          type: DataTypes.STRING(100),
          allowNull: true,
          defaultValue: 'United States',
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Legacy address field for backward compatibility',
        },
        emergencyContact1Name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        emergencyContact1Relationship: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        emergencyContact1Phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        emergencyContact1AlternatePhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        emergencyContact1Email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        emergencyContact1SameAddress: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        emergencyContact2Name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        emergencyContact2Relationship: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        emergencyContact2Phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        emergencyContact2AlternatePhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        emergencyContact2Email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        emergencyContact2SameAddress: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        race: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        nationality: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        priorSurgicalProcedures: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'CABG, Valve Replacement, etc.',
        },
        devicesImplanted: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'Pacemaker, ICD, Stents, etc.',
        },
        priorSurgeryNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        hospitalName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        surgeonName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        dischargeDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        dischargeInstructions: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        priorHealthConditions: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'Diabetes, CKD, COPD, etc.',
        },
        currentConditions: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'Non-cardiac current conditions',
        },
        nonCardiacMedications: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        allergies: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        diagnosisDate: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Date of heart condition diagnosis',
        },
        heartConditions: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'CAD, CHF, AFib, etc.',
        },
        currentTreatmentProtocol: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },
        recommendedTreatments: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },
        restingHeartRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Baseline resting HR for MET calculations',
        },
        maxHeartRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Can override 220-age if doctor sets specific limit',
        },
        targetHeartRateMin: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Safe exercise zone minimum HR',
        },
        targetHeartRateMax: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Safe exercise zone maximum HR',
        },
        baselineBpSystolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Resting systolic blood pressure',
        },
        baselineBpDiastolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Resting diastolic blood pressure',
        },
        ejectionFraction: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Left ventricular ejection fraction (%)',
        },
        cardiacDiagnosis: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'Primary cardiac diagnoses',
        },
        medicationsAffectingHR: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'Beta-blockers, etc. that affect heart rate response',
        },
        activityRestrictions: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Weight limits, movements to avoid, etc.',
        },
        polarDeviceId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Polar heart monitor device ID',
        },
        samsungHealthAccount: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Samsung Health / Galaxy Watch account',
        },
        preferredDataSource: {
          type: DataTypes.STRING(20),
          allowNull: true,
          comment: 'polar, samsung, or manual',
        },
        zoomHandle: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        surgeryDate: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Day 0 - the date of heart surgery',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        height: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Height in inches or cm',
        },
        heightUnit: {
          type: DataTypes.STRING(2),
          allowNull: true,
          defaultValue: 'in',
          comment: 'in for inches, cm for centimeters',
        },
        startingWeight: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Weight at start of therapy',
        },
        currentWeight: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Most recent weight measurement',
        },
        targetWeight: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Goal weight for patient',
        },
        weightUnit: {
          type: DataTypes.STRING(3),
          allowNull: true,
          defaultValue: 'lbs',
          comment: 'kg or lbs',
        },
      },
      {
        sequelize,
        modelName: 'Patient',
        tableName: 'patients',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    Patient.belongsTo(models.User, { foreignKey: 'therapistId', as: 'therapist' });
    Patient.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

Patient.initialize();

export default Patient;
