import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface TherapyRoutineAttributes {
  id: number;
  userId: number;
  therapistId: number;
  phaseId: number;
  routineName: string;
  exercises: any;
  scheduledDate: Date;
  scheduledTime?: string;
  durationMinutes: number;
  completed: boolean;
  completedAt?: Date;
  status: 'scheduled' | 'completed' | 'skipped' | 'issue';
  completionNotes?: string;
  painLevel?: number;
  fatigueLevel?: number;
  heartRateData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TherapyRoutineCreationAttributes extends Optional<TherapyRoutineAttributes, 'id'> {}

class TherapyRoutine extends Model<TherapyRoutineAttributes, TherapyRoutineCreationAttributes> implements TherapyRoutineAttributes {
  public id!: number;
  public userId!: number;
  public therapistId!: number;
  public phaseId!: number;
  public routineName!: string;
  public exercises!: any;
  public scheduledDate!: Date;
  public scheduledTime?: string;
  public durationMinutes!: number;
  public completed!: boolean;
  public completedAt?: Date;
  public status!: 'scheduled' | 'completed' | 'skipped' | 'issue';
  public completionNotes?: string;
  public painLevel?: number;
  public fatigueLevel?: number;
  public heartRateData?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    TherapyRoutine.init(
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
          comment: 'Patient this routine is assigned to',
        },
        therapistId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Therapist who prescribed the routine',
        },
        phaseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'physical_therapy_phases',
            key: 'id',
          },
          comment: 'Recovery phase this routine belongs to',
        },
        routineName: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        exercises: {
          type: DataTypes.JSONB,
          allowNull: false,
          comment: 'Array of exercises with sets, reps, duration',
        },
        scheduledDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        scheduledTime: {
          type: DataTypes.STRING(10),
          allowNull: true,
          comment: 'Time in HH:MM format',
        },
        durationMinutes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 30,
        },
        completed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('scheduled', 'completed', 'skipped', 'issue'),
          allowNull: false,
          defaultValue: 'scheduled',
        },
        completionNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        painLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '1-10 scale',
        },
        fatigueLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '1-10 scale',
        },
        heartRateData: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: 'Heart rate before, during, after exercise',
        },
      },
      {
        sequelize,
        modelName: 'TherapyRoutine',
        tableName: 'therapy_routines',
        timestamps: true,
        indexes: [
          { fields: ['userId'] },
          { fields: ['therapistId'] },
          { fields: ['phaseId'] },
          { fields: ['scheduledDate'] },
          { fields: ['status'] },
        ],
      }
    );
  }

  static associate(models: any) {
    TherapyRoutine.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'patient',
    });

    TherapyRoutine.belongsTo(models.User, {
      foreignKey: 'therapistId',
      as: 'therapist',
    });

    TherapyRoutine.belongsTo(models.PhysicalTherapyPhase, {
      foreignKey: 'phaseId',
      as: 'phase',
    });
  }
}

TherapyRoutine.initialize();

export default TherapyRoutine;
