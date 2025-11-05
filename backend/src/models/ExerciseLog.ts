import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface ExerciseLogAttributes {
  id: number;
  prescriptionId: number | null;
  patientId: number;
  completedAt: Date;
  postSurgeryDay?: number;
  startedAt?: Date;

  // Pre-exercise vitals
  preBpSystolic?: number;
  preBpDiastolic?: number;
  preHeartRate?: number;
  preOxygenSat?: number;

  // During exercise vitals
  duringHeartRateAvg?: number;
  duringHeartRateMax?: number;
  duringBpSystolic?: number;
  duringBpDiastolic?: number;
  duringRespiratoryRate?: number;

  // Post-exercise vitals
  postBpSystolic?: number;
  postBpDiastolic?: number;
  postHeartRate?: number;
  postOxygenSat?: number;

  // Activity-specific metrics
  distanceMiles?: number;
  laps?: number;
  steps?: number;
  elevationFeet?: number;
  caloriesBurned?: number;

  // Exercise tracking
  actualSets?: number;
  actualReps?: number;
  actualDuration?: number;
  weight?: number;
  rangeOfMotion?: number;
  difficultyRating?: number;
  painLevel?: number;
  painLocation?: string;
  perceivedExertion?: number;
  performanceScore?: number;
  notes?: string;

  // Device sync tracking
  dataSource?: 'manual' | 'polar' | 'samsung_health' | 'health_connect' | 'strava';
  externalId?: string;
  deviceConnectionId?: number;
  syncedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

interface ExerciseLogCreationAttributes extends Optional<ExerciseLogAttributes, 'id' | 'actualSets' | 'actualReps' | 'actualDuration' | 'weight' | 'rangeOfMotion' | 'difficultyRating' | 'painLevel' | 'painLocation' | 'performanceScore' | 'notes' | 'createdAt' | 'updatedAt'> {}

class ExerciseLog extends Model<ExerciseLogAttributes, ExerciseLogCreationAttributes> implements ExerciseLogAttributes {
  public id!: number;
  public prescriptionId!: number | null;
  public patientId!: number;
  public completedAt!: Date;
  public postSurgeryDay?: number;
  public startedAt?: Date;

  // Pre-exercise vitals
  public preBpSystolic?: number;
  public preBpDiastolic?: number;
  public preHeartRate?: number;
  public preOxygenSat?: number;

  // During exercise vitals
  public duringHeartRateAvg?: number;
  public duringHeartRateMax?: number;
  public duringBpSystolic?: number;
  public duringBpDiastolic?: number;
  public duringRespiratoryRate?: number;

  // Post-exercise vitals
  public postBpSystolic?: number;
  public postBpDiastolic?: number;
  public postHeartRate?: number;
  public postOxygenSat?: number;

  // Activity-specific metrics
  public distanceMiles?: number;
  public laps?: number;
  public steps?: number;
  public elevationFeet?: number;
  public caloriesBurned?: number;

  // Exercise tracking
  public actualSets?: number;
  public actualReps?: number;
  public actualDuration?: number;
  public weight?: number;
  public rangeOfMotion?: number;
  public difficultyRating?: number;
  public painLevel?: number;
  public painLocation?: string;
  public perceivedExertion?: number;
  public performanceScore?: number;
  public notes?: string;

  // Device sync tracking
  public dataSource?: 'manual' | 'polar' | 'samsung_health' | 'health_connect' | 'strava';
  public externalId?: string;
  public deviceConnectionId?: number;
  public syncedAt?: Date;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    ExerciseLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        prescriptionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'exercise_prescriptions',
            key: 'id',
          },
        },
        patientId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'patients',
            key: 'id',
          },
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        postSurgeryDay: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Days since surgery (Day 0 = surgery date), auto-calculated by trigger',
        },
        startedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'When the exercise session started',
        },
        // Pre-exercise vitals
        preBpSystolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Pre-exercise systolic blood pressure (mmHg)',
        },
        preBpDiastolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Pre-exercise diastolic blood pressure (mmHg)',
        },
        preHeartRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Pre-exercise heart rate (bpm)',
        },
        preOxygenSat: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Pre-exercise oxygen saturation (%)',
        },
        // During exercise vitals
        duringHeartRateAvg: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Average heart rate during exercise (bpm)',
        },
        duringHeartRateMax: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Maximum heart rate during exercise (bpm)',
        },
        duringBpSystolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Blood pressure during exercise - systolic (optional monitoring)',
        },
        duringBpDiastolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Blood pressure during exercise - diastolic (optional monitoring)',
        },
        duringRespiratoryRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Respiratory rate during exercise (breaths per minute)',
        },
        // Post-exercise vitals
        postBpSystolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Post-exercise systolic blood pressure (mmHg)',
        },
        postBpDiastolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Post-exercise diastolic blood pressure (mmHg)',
        },
        postHeartRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Post-exercise heart rate (bpm)',
        },
        postOxygenSat: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Post-exercise oxygen saturation (%)',
        },
        // Activity-specific metrics
        distanceMiles: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Distance covered in miles (running, cycling, swimming, walking)',
        },
        laps: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Number of laps (swimming, track)',
        },
        steps: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Step count (walking, hiking)',
        },
        elevationFeet: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Elevation gain in feet (hiking, cycling)',
        },
        caloriesBurned: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Estimated calories burned',
        },
        actualSets: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        actualReps: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        actualDuration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Actual duration in minutes',
        },
        weight: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Weight used in pounds for progressive overload tracking',
        },
        rangeOfMotion: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Range of motion in degrees (0-180) or percentage (0-100)',
        },
        difficultyRating: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '1-10 scale, 1 = very easy, 10 = very hard',
        },
        painLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '1-10 scale, 1 = no pain, 10 = severe pain',
        },
        painLocation: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Location of pain/discomfort (e.g., chest, shoulder, knee)',
        },
        perceivedExertion: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Borg Scale 1-10 (1=very easy, 10=max effort)',
        },
        performanceScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '0 = no show, 4 = completed, 6 = met goals, 8 = exceeded goals',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        // Device sync tracking
        dataSource: {
          type: DataTypes.ENUM('manual', 'polar', 'samsung_health', 'health_connect', 'strava'),
          allowNull: true,
          defaultValue: 'manual',
          comment: 'Source of the exercise data',
        },
        externalId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'External ID from device/service (e.g., Polar exercise ID)',
        },
        deviceConnectionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'device_connections',
            key: 'id',
          },
          comment: 'Device connection that synced this data',
        },
        syncedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'When this record was synced from device',
        },
      },
      {
        sequelize,
        modelName: 'ExerciseLog',
        tableName: 'exercise_logs',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    ExerciseLog.belongsTo(models.ExercisePrescription, {
      foreignKey: 'prescriptionId',
      as: 'prescription',
    });
    ExerciseLog.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient',
    });
    if (models.DeviceConnection) {
      ExerciseLog.belongsTo(models.DeviceConnection, {
        foreignKey: 'deviceConnectionId',
        as: 'deviceConnection',
      });
    }
  }
}

ExerciseLog.initialize();

export default ExerciseLog;
