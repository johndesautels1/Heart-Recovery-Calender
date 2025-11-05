import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface ExercisePrescriptionAttributes {
  id: number;
  patientId: number;
  exerciseId: number;
  prescribedBy: number; // therapist user ID
  startDate: Date;
  endDate?: Date;
  sets?: number;
  reps?: number;
  duration?: number; // in minutes
  frequency: string; // e.g., "daily", "3x/week", "Mon/Wed/Fri"
  notes?: string;
  targetMETMin?: number; // Target minimum MET level
  targetMETMax?: number; // Target maximum MET level
  status: 'active' | 'completed' | 'discontinued';
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExercisePrescriptionCreationAttributes extends Optional<ExercisePrescriptionAttributes, 'id' | 'endDate' | 'sets' | 'reps' | 'duration' | 'notes' | 'createdAt' | 'updatedAt'> {}

class ExercisePrescription extends Model<ExercisePrescriptionAttributes, ExercisePrescriptionCreationAttributes> implements ExercisePrescriptionAttributes {
  public id!: number;
  public patientId!: number;
  public exerciseId!: number;
  public prescribedBy!: number;
  public startDate!: Date;
  public endDate?: Date;
  public sets?: number;
  public reps?: number;
  public duration?: number;
  public frequency!: string;
  public notes?: string;
  public targetMETMin?: number;
  public targetMETMax?: number;
  public status!: 'active' | 'completed' | 'discontinued';
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    ExercisePrescription.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        patientId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'patients',
            key: 'id',
          },
        },
        exerciseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exercises',
            key: 'id',
          },
        },
        prescribedBy: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Therapist user ID who prescribed this exercise',
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        sets: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        reps: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Duration in minutes',
        },
        frequency: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: 'e.g., "daily", "3x/week", "Mon/Wed/Fri"',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        targetMETMin: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Target minimum MET level for this exercise prescription',
        },
        targetMETMax: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Target maximum MET level for this exercise prescription',
        },
        status: {
          type: DataTypes.ENUM('active', 'completed', 'discontinued'),
          defaultValue: 'active',
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'ExercisePrescription',
        tableName: 'exercise_prescriptions',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    ExercisePrescription.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient',
    });
    ExercisePrescription.belongsTo(models.Exercise, {
      foreignKey: 'exerciseId',
      as: 'exercise',
    });
    ExercisePrescription.belongsTo(models.User, {
      foreignKey: 'prescribedBy',
      as: 'therapist',
    });
  }
}

ExercisePrescription.initialize();

export default ExercisePrescription;
