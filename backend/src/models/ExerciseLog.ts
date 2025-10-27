import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface ExerciseLogAttributes {
  id: number;
  prescriptionId: number;
  patientId: number;
  completedAt: Date;
  actualSets?: number;
  actualReps?: number;
  actualDuration?: number; // in minutes
  weight?: number; // NEW: Weight used (for progressive overload tracking)
  rangeOfMotion?: number; // NEW: Range of motion in degrees or percentage (0-100)
  difficultyRating?: number; // 1-10 scale
  painLevel?: number; // 1-10 scale
  painLocation?: string; // NEW: Where the pain is located
  performanceScore?: number; // 0 = no show, 4 = completed, 6 = met goals, 8 = exceeded goals
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExerciseLogCreationAttributes extends Optional<ExerciseLogAttributes, 'id' | 'actualSets' | 'actualReps' | 'actualDuration' | 'weight' | 'rangeOfMotion' | 'difficultyRating' | 'painLevel' | 'painLocation' | 'performanceScore' | 'notes' | 'createdAt' | 'updatedAt'> {}

class ExerciseLog extends Model<ExerciseLogAttributes, ExerciseLogCreationAttributes> implements ExerciseLogAttributes {
  public id!: number;
  public prescriptionId!: number;
  public patientId!: number;
  public completedAt!: Date;
  public actualSets?: number;
  public actualReps?: number;
  public actualDuration?: number;
  public weight?: number;
  public rangeOfMotion?: number;
  public difficultyRating?: number;
  public painLevel?: number;
  public painLocation?: string;
  public performanceScore?: number;
  public notes?: string;
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
          allowNull: false,
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
        performanceScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '0 = no show, 4 = completed, 6 = met goals, 8 = exceeded goals',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
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
  }
}

ExerciseLog.initialize();

export default ExerciseLog;
