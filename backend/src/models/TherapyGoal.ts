import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from './database';

interface TherapyGoalAttributes {
  id: number;
  userId: number;
  therapistId: number;
  goalTitle: string;
  goalDescription: string;
  goalType: 'exercise' | 'activity' | 'mobility' | 'medication_adherence' | 'diet' | 'vitals' | 'other';
  targetValue?: string;
  currentValue?: string;
  unit?: string;
  targetDate?: Date;
  status: 'not_started' | 'in_progress' | 'achieved' | 'modified' | 'abandoned';
  progressPercentage: number;
  milestones?: any;
  notes?: string;
  achievedAt?: Date;
  priority: 'low' | 'medium' | 'high';
  recurring: boolean;
  frequency?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TherapyGoalCreationAttributes extends Optional<TherapyGoalAttributes, 'id'> {}

class TherapyGoal extends Model<TherapyGoalAttributes, TherapyGoalCreationAttributes> implements TherapyGoalAttributes {
  public id!: number;
  public userId!: number;
  public therapistId!: number;
  public goalTitle!: string;
  public goalDescription!: string;
  public goalType!: 'exercise' | 'activity' | 'mobility' | 'medication_adherence' | 'diet' | 'vitals' | 'other';
  public targetValue?: string;
  public currentValue?: string;
  public unit?: string;
  public targetDate?: Date;
  public status!: 'not_started' | 'in_progress' | 'achieved' | 'modified' | 'abandoned';
  public progressPercentage!: number;
  public milestones?: any;
  public notes?: string;
  public achievedAt?: Date;
  public priority!: 'low' | 'medium' | 'high';
  public recurring!: boolean;
  public frequency?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    TherapyGoal.init(
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
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        therapistId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        goalTitle: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        goalDescription: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        goalType: {
          type: DataTypes.ENUM('exercise', 'activity', 'mobility', 'medication_adherence', 'diet', 'vitals', 'other'),
          allowNull: false,
          defaultValue: 'other',
        },
        targetValue: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        currentValue: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        unit: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        targetDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('not_started', 'in_progress', 'achieved', 'modified', 'abandoned'),
          allowNull: false,
          defaultValue: 'not_started',
        },
        progressPercentage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
            max: 100,
          },
        },
        milestones: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: 'Array of milestone objects with date, description, achieved status',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        achievedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        priority: {
          type: DataTypes.ENUM('low', 'medium', 'high'),
          allowNull: false,
          defaultValue: 'medium',
        },
        recurring: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        frequency: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'For recurring goals: daily, weekly, monthly, etc.',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'TherapyGoal',
        tableName: 'therapy_goals',
        timestamps: true,
        indexes: [
          {
            fields: ['userId'],
          },
          {
            fields: ['therapistId'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['goalType'],
          },
          {
            fields: ['targetDate'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    TherapyGoal.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'patient',
    });

    TherapyGoal.belongsTo(models.User, {
      foreignKey: 'therapistId',
      as: 'therapist',
    });
  }
}

// Initialize the model
TherapyGoal.initialize();

export default TherapyGoal;
