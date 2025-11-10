import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface SleepLogAttributes {
  id: number;
  userId: number;
  date: Date;
  hoursSlept: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  dreamQuality?: 'nightmare' | 'cannot_remember' | 'sporadic' | 'vivid_positive';
  postSurgeryDay?: number;
  notes?: string;
  bedTime?: Date;
  wakeTime?: Date;
  isNap?: boolean;
  napDuration?: number;
  dreamNotes?: string;
  sleepScore?: number;
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
  public dreamQuality?: 'nightmare' | 'cannot_remember' | 'sporadic' | 'vivid_positive';
  public postSurgeryDay?: number;
  public notes?: string;
  public bedTime?: Date;
  public wakeTime?: Date;
  public isNap?: boolean;
  public napDuration?: number;
  public dreamNotes?: string;
  public sleepScore?: number;
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
        dreamQuality: {
          type: DataTypes.ENUM('nightmare', 'cannot_remember', 'sporadic', 'vivid_positive'),
          allowNull: true,
          comment: 'Dream quality: nightmare (0pts), cannot_remember (1pt), sporadic (2pts), vivid_positive (3pts)',
        },
        postSurgeryDay: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Days since surgery (Day 0 = surgery date), auto-calculated by trigger',
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
        isNap: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Whether this is a nap (not overnight sleep)',
        },
        napDuration: {
          type: DataTypes.DECIMAL(4, 2),
          allowNull: true,
          comment: 'Duration of nap in hours',
        },
        dreamNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Dream journal notes',
        },
        sleepScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Calculated sleep score (0-100)',
          validate: {
            min: 0,
            max: 100,
          },
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
