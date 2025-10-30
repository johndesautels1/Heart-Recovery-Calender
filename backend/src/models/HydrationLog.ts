import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface HydrationLogAttributes {
  id: number;
  userId: number;
  date: Date;
  totalOunces: number;
  targetOunces?: number;
  postSurgeryDay?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HydrationLogCreationAttributes extends Optional<HydrationLogAttributes, 'id' | 'targetOunces' | 'postSurgeryDay' | 'notes' | 'createdAt' | 'updatedAt'> {}

class HydrationLog extends Model<HydrationLogAttributes, HydrationLogCreationAttributes> implements HydrationLogAttributes {
  public id!: number;
  public userId!: number;
  public date!: Date;
  public totalOunces!: number;
  public targetOunces?: number;
  public postSurgeryDay?: number;
  public notes?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    HydrationLog.init(
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
          comment: 'Date of hydration tracking',
        },
        totalOunces: {
          type: DataTypes.DECIMAL(5, 1),
          allowNull: false,
          defaultValue: 0,
          comment: 'Total fluid intake in ounces for the day',
        },
        targetOunces: {
          type: DataTypes.DECIMAL(5, 1),
          allowNull: true,
          comment: 'Daily target based on body weight (Weight in lbs × 0.5)',
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
      },
      {
        sequelize,
        modelName: 'HydrationLog',
        tableName: 'hydration_logs',
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
    HydrationLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

HydrationLog.initialize();

export default HydrationLog;
