import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface KnownSideEffects {
  weightGain?: boolean;
  weightLoss?: boolean;
  edema?: boolean;
  fluidRetention?: boolean;
  dizziness?: boolean;
  fatigue?: boolean;
  nausea?: boolean;
  [key: string]: boolean | undefined;
}

interface MedicationAttributes {
  id: number;
  userId: number;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate: Date;
  endDate?: Date;
  timeOfDay?: string;
  purpose?: string;
  sideEffects?: string;
  knownSideEffects?: KnownSideEffects;
  instructions?: string;
  isActive: boolean;
  reminderEnabled?: boolean;
  refillDate?: Date;
  remainingRefills?: number;
  pharmacy?: string;
  pharmacyPhone?: string;
  notes?: string;
  effectivenessRating?: number;
  isOTC?: boolean;
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
  public timeOfDay?: string;
  public purpose?: string;
  public sideEffects?: string;
  public knownSideEffects?: KnownSideEffects;
  public instructions?: string;
  public isActive!: boolean;
  public reminderEnabled?: boolean;
  public refillDate?: Date;
  public remainingRefills?: number;
  public pharmacy?: string;
  public pharmacyPhone?: string;
  public notes?: string;
  public effectivenessRating?: number;
  public isOTC?: boolean;
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
        timeOfDay: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'When to take the medication',
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
        knownSideEffects: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'known_side_effects',
          comment: 'Structured side effect flags for Hawk Alert system (weightGain, weightLoss, edema, etc.)',
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
        reminderEnabled: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
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
        effectivenessRating: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'effectiveness_rating',
          comment: 'Effectiveness rating (1-5 stars)',
          validate: {
            min: 1,
            max: 5,
          },
        },
        isOTC: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          field: 'is_otc',
          comment: 'Whether this is an over-the-counter medication',
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
    Medication.hasMany(models.MedicationLog, { foreignKey: 'medicationId', as: 'logs' });
  }
}

Medication.initialize();

export default Medication;
export { KnownSideEffects };