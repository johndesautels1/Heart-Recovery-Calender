import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface VitalsSampleAttributes {
  id: number;
  userId: number;
  timestamp: Date;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  heartRateVariability?: number;
  weight?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  hydrationStatus?: number;
  cholesterolTotal?: number;
  cholesterolLDL?: number;
  cholesterolHDL?: number;
  triglycerides?: number;
  respiratoryRate?: number;
  notes?: string;
  symptoms?: string;
  medicationsTaken: boolean;
  source: 'manual' | 'device' | 'import';
  deviceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface VitalsSampleCreationAttributes extends Optional<VitalsSampleAttributes, 'id' | 'medicationsTaken' | 'source'> {}

class VitalsSample extends Model<VitalsSampleAttributes, VitalsSampleCreationAttributes> implements VitalsSampleAttributes {
  public id!: number;
  public userId!: number;
  public timestamp!: Date;
  public bloodPressureSystolic?: number;
  public bloodPressureDiastolic?: number;
  public heartRate?: number;
  public heartRateVariability?: number;
  public weight?: number;
  public temperature?: number;
  public oxygenSaturation?: number;
  public bloodSugar?: number;
  public hydrationStatus?: number;
  public cholesterolTotal?: number;
  public cholesterolLDL?: number;
  public cholesterolHDL?: number;
  public triglycerides?: number;
  public respiratoryRate?: number;
  public notes?: string;
  public symptoms?: string;
  public medicationsTaken!: boolean;
  public source!: 'manual' | 'device' | 'import';
  public deviceId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    VitalsSample.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        bloodPressureSystolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Systolic blood pressure in mmHg',
          validate: {
            min: 50,
            max: 250,
          },
        },
        bloodPressureDiastolic: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Diastolic blood pressure in mmHg',
          validate: {
            min: 30,
            max: 150,
          },
        },
        heartRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Heart rate in beats per minute',
          validate: {
            min: 20,
            max: 250,
          },
        },
        heartRateVariability: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'HRV in milliseconds',
          field: 'hrVariability',
        },
        weight: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Weight in pounds',
        },
        temperature: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Temperature in Fahrenheit',
        },
        oxygenSaturation: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Oxygen saturation percentage',
          validate: {
            min: 50,
            max: 100,
          },
        },
        bloodSugar: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Blood sugar in mg/dL',
        },
        hydrationStatus: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Hydration status percentage (0-100)',
          validate: {
            min: 0,
            max: 100,
          },
        },
        cholesterolTotal: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Total cholesterol in mg/dL',
          field: 'cholesterol',
        },
        cholesterolLDL: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'LDL cholesterol in mg/dL',
          field: 'ldl',
        },
        cholesterolHDL: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'HDL cholesterol in mg/dL',
          field: 'hdl',
        },
        triglycerides: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Triglycerides in mg/dL',
        },
        respiratoryRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Breaths per minute',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        symptoms: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        medicationsTaken: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        source: {
          type: DataTypes.ENUM('manual', 'device', 'import'),
          defaultValue: 'manual',
        },
        deviceId: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'VitalsSample',
        tableName: 'vitals_samples',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    VitalsSample.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

VitalsSample.initialize();

export default VitalsSample;