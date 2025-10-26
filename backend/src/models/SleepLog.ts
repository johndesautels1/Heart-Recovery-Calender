import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface SleepLogAttributes {
  id: number;
  userId: number;
  date: Date;
  hoursSlept: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  notes?: string;
  bedTime?: Date;
  wakeTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SleepLogCreationAttributes extends Optional<SleepLogAttributes, 'id' | 'sleepQuality' | 'notes' | 'bedTime' | 'wakeTime' | 'createdAt' | 'updatedAt'> {}

class SleepLog extends Model<SleepLogAttributes, SleepLogCreationAttributes> implements SleepLogAttributes {
  public id!: number;
  public userId!: number;
  public date!: Date;
  public hoursSlept!: number;
  public sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  public notes?: string;
  public bedTime?: Date;
  public wakeTime?: Date;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    SleepLog.init(
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
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          comment: 'Date of the sleep (the day you woke up)',
        },
        hoursSlept: {
          type: DataTypes.DECIMAL(4, 2),
          allowNull: false,
          comment: 'Total hours of sleep',
        },
        sleepQuality: {
          type: DataTypes.ENUM('poor', 'fair', 'good', 'excellent'),
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        bedTime: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Time went to bed',
        },
        wakeTime: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Time woke up',
        },
      },
      {
        sequelize,
        modelName: 'SleepLog',
        tableName: 'sleep_logs',
        timestamps: true,
        indexes: [
          {
            fields: ['userId', 'date'],
            unique: true,
          },
        ],
      }
    );
  }

  static associate(models: any) {
    SleepLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

SleepLog.initialize();

export default SleepLog;
