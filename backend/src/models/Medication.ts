import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface MedicationAttributes {
  id: number;
  userId: number;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate: Date;
  endDate?: Date;
  purpose?: string;
  sideEffects?: string;
  instructions?: string;
  isActive: boolean;
  refillDate?: Date;
  remainingRefills?: number;
  pharmacy?: string;
  pharmacyPhone?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MedicationCreationAttributes extends Optional<MedicationAttributes, 'id' | 'isActive'> {}

class Medication extends Model<MedicationAttributes, MedicationCreationAttributes> implements MedicationAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public dosage!: string;
  public frequency!: string;
  public prescribedBy?: string;
  public startDate!: Date;
  public endDate?: Date;
  public purpose?: string;
  public sideEffects?: string;
  public instructions?: string;
  public isActive!: boolean;
  public refillDate?: Date;
  public remainingRefills?: number;
  public pharmacy?: string;
  public pharmacyPhone?: string;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    Medication.init(
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
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        dosage: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: 'e.g., 10mg, 2 tablets',
        },
        frequency: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: 'e.g., Twice daily, Every 8 hours',
        },
        prescribedBy: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        purpose: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'What the medication is for',
        },
        sideEffects: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        instructions: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Special instructions (take with food, etc.)',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        refillDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        remainingRefills: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        pharmacy: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        pharmacyPhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Medication',
        tableName: 'medications',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    Medication.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

Medication.initialize();

export default Medication;