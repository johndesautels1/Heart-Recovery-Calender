import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface ECGSampleAttributes {
  id: number;
  userId: number;
  vitalsSampleId?: number; // Optional link to VitalsSample for correlation
  timestamp: Date;
  sampleIndex: number; // Index within recording session for ordering
  voltage: number; // ECG voltage in millivolts (mV)
  samplingRate: number; // Sampling rate in Hz (130 for Polar H10)
  leadType: string; // ECG lead type (e.g., "Lead I" for Polar H10)
  deviceId: string; // Device identifier (e.g., "polar_h10_bluetooth")
  sessionId?: string; // Optional session ID to group samples from same recording
  rPeak: boolean; // True if this sample is an R-peak
  createdAt?: Date;
  updatedAt?: Date;
}

interface ECGSampleCreationAttributes extends Optional<ECGSampleAttributes, 'id' | 'rPeak'> {}

class ECGSample extends Model<ECGSampleAttributes, ECGSampleCreationAttributes> implements ECGSampleAttributes {
  public id!: number;
  public userId!: number;
  public vitalsSampleId?: number;
  public timestamp!: Date;
  public sampleIndex!: number;
  public voltage!: number;
  public samplingRate!: number;
  public leadType!: string;
  public deviceId!: string;
  public sessionId?: string;
  public rPeak!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    ECGSample.init(
      {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          primaryKey: true,
          comment: 'Primary key for ECG sample',
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Foreign key to users table',
        },
        vitalsSampleId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'vitals_samples',
            key: 'id',
          },
          comment: 'Optional foreign key to vitals_samples for correlation with broader vitals data',
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: 'Exact timestamp of this ECG sample',
        },
        sampleIndex: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: 'Sequential index within recording session (0, 1, 2, ...) for ordering',
        },
        voltage: {
          type: DataTypes.FLOAT,
          allowNull: false,
          comment: 'ECG voltage in millivolts (mV) - typically ranges from -3.0 to +3.0 mV',
          validate: {
            min: -10.0,
            max: 10.0,
          },
        },
        samplingRate: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 130,
          comment: 'Sampling rate in Hz (130 for Polar H10)',
          validate: {
            min: 1,
            max: 1000,
          },
        },
        leadType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'Lead I',
          comment: 'ECG lead type (e.g., "Lead I", "Lead II", "V1") - Polar H10 uses Lead I',
        },
        deviceId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: 'Device identifier (e.g., "polar_h10_bluetooth", "Polar H10 9D3A412E")',
        },
        sessionId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Optional session ID (UUID) to group samples from the same recording session',
        },
        rPeak: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'True if this sample is an R-peak (QRS complex peak)',
        },
      },
      {
        sequelize,
        modelName: 'ECGSample',
        tableName: 'ecg_samples',
        timestamps: true,
        indexes: [
          {
            fields: ['userId', 'timestamp'],
          },
          {
            fields: ['sessionId'],
          },
          {
            fields: ['vitalsSampleId'],
          },
          {
            fields: ['rPeak'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    ECGSample.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ECGSample.belongsTo(models.VitalsSample, { foreignKey: 'vitalsSampleId', as: 'vitalsSample' });
  }
}

ECGSample.initialize();

export default ECGSample;
