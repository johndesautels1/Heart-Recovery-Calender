import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from './database';

interface HabitLogAttributes {
  id: number;
  habitId: number;
  userId: number;
  completedAt: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HabitLogCreationAttributes extends Optional<HabitLogAttributes, 'id'> {}

class HabitLog extends Model<HabitLogAttributes, HabitLogCreationAttributes> implements HabitLogAttributes {
  public id!: number;
  public habitId!: number;
  public userId!: number;
  public completedAt!: Date;
  public notes?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    HabitLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        habitId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'habits',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
        completedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        notes: {
          type: DataTypes.TEXT,
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
        modelName: 'HabitLog',
        tableName: 'habit_logs',
        timestamps: true,
        indexes: [
          {
            fields: ['habitId'],
          },
          {
            fields: ['userId'],
          },
          {
            fields: ['completedAt'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    HabitLog.belongsTo(models.Habit, {
      foreignKey: 'habitId',
      as: 'habit',
    });

    HabitLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

// Initialize the model
HabitLog.initialize();

export default HabitLog;
