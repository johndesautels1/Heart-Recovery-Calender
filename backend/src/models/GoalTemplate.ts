import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from './database';

interface GoalTemplateAttributes {
  id: number;
  name: string;
  description: string;
  goalType: 'exercise' | 'activity' | 'mobility' | 'medication_adherence' | 'diet' | 'vitals' | 'other';
  targetValue?: string;
  unit?: string;
  timeframe?: string;
  category: 'cardiac_recovery' | 'mobility' | 'strength' | 'endurance' | 'lifestyle' | 'medication' | 'nutrition';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GoalTemplateCreationAttributes extends Optional<GoalTemplateAttributes, 'id' | 'isActive'> {}

class GoalTemplate extends Model<GoalTemplateAttributes, GoalTemplateCreationAttributes> implements GoalTemplateAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public goalType!: 'exercise' | 'activity' | 'mobility' | 'medication_adherence' | 'diet' | 'vitals' | 'other';
  public targetValue?: string;
  public unit?: string;
  public timeframe?: string;
  public category!: 'cardiac_recovery' | 'mobility' | 'strength' | 'endurance' | 'lifestyle' | 'medication' | 'nutrition';
  public isActive!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    GoalTemplate.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        goalType: {
          type: DataTypes.ENUM('exercise', 'activity', 'mobility', 'medication_adherence', 'diet', 'vitals', 'other'),
          allowNull: false,
        },
        targetValue: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        unit: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        timeframe: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'Suggested timeframe: e.g., "4 weeks", "3 months"',
        },
        category: {
          type: DataTypes.ENUM('cardiac_recovery', 'mobility', 'strength', 'endurance', 'lifestyle', 'medication', 'nutrition'),
          allowNull: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        modelName: 'GoalTemplate',
        tableName: 'goal_templates',
        timestamps: true,
        indexes: [
          {
            fields: ['category'],
          },
          {
            fields: ['goalType'],
          },
          {
            fields: ['isActive'],
          },
        ],
      }
    );
  }
}

// Initialize the model
GoalTemplate.initialize();

export default GoalTemplate;
