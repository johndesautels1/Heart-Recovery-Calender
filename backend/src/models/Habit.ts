import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from './database';

interface HabitAttributes {
  id: number;
  userId: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'custom';
  targetDaysPerWeek?: number;
  streakCount: number;
  lastCompleted?: Date;
  isActive: boolean;
  category?: 'exercise' | 'medication' | 'nutrition' | 'sleep' | 'stress_management' | 'other';
  createdAt?: Date;
  updatedAt?: Date;
}

interface HabitCreationAttributes extends Optional<HabitAttributes, 'id' | 'streakCount' | 'isActive'> {}

class Habit extends Model<HabitAttributes, HabitCreationAttributes> implements HabitAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public description?: string;
  public frequency!: 'daily' | 'weekly' | 'custom';
  public targetDaysPerWeek?: number;
  public streakCount!: number;
  public lastCompleted?: Date;
  public isActive!: boolean;
  public category?: 'exercise' | 'medication' | 'nutrition' | 'sleep' | 'stress_management' | 'other';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    Habit.init(
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
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        frequency: {
          type: DataTypes.ENUM('daily', 'weekly', 'custom'),
          allowNull: false,
          defaultValue: 'daily',
        },
        targetDaysPerWeek: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: 1,
            max: 7,
          },
        },
        streakCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lastCompleted: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        category: {
          type: DataTypes.ENUM('exercise', 'medication', 'nutrition', 'sleep', 'stress_management', 'other'),
          allowNull: true,
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
        modelName: 'Habit',
        tableName: 'habits',
        timestamps: true,
        indexes: [
          {
            fields: ['userId'],
          },
          {
            fields: ['isActive'],
          },
          {
            fields: ['category'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    Habit.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Habit.hasMany(models.HabitLog, {
      foreignKey: 'habitId',
      as: 'logs',
    });
  }
}

// Initialize the model
Habit.initialize();

export default Habit;
