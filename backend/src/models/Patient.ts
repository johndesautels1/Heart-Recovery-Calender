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
