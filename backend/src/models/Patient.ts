import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface PatientAttributes {
  id: number;
  therapistId: number;
  userId?: number;  // Link to the patient's user account
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  zoomHandle?: string;
  surgeryDate?: Date;
  notes?: string;
  isActive: boolean;
  height?: number;          // Height in inches or cm
  heightUnit?: 'in' | 'cm'; // Unit of measurement
  startingWeight?: number;  // Weight at start of therapy (kg or lbs)
  currentWeight?: number;   // Most recent weight (kg or lbs)
  targetWeight?: number;    // Goal weight (kg or lbs)
  weightUnit?: 'kg' | 'lbs'; // Unit of measurement
  createdAt?: Date;
  updatedAt?: Date;
}

interface PatientCreationAttributes extends Optional<PatientAttributes, 'id' | 'isActive'> {}

class Patient extends Model<PatientAttributes, PatientCreationAttributes> implements PatientAttributes {
  public id!: number;
  public therapistId!: number;
  public userId?: number;
  public name!: string;
  public email?: string;
  public phone?: string;
  public address?: string;
  public zoomHandle?: string;
  public surgeryDate?: Date;
  public notes?: string;
  public isActive!: boolean;
  public height?: number;
  public heightUnit?: 'in' | 'cm';
  public startingWeight?: number;
  public currentWeight?: number;
  public targetWeight?: number;
  public weightUnit?: 'kg' | 'lbs';
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
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
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
