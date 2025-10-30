import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface DailyScoreAttributes {
  id: number;
  userId: number;
  scoreDate: Date;
  postSurgeryDay?: number;

  // Category scores (0-100 scale for each)
  exerciseScore?: number;
  nutritionScore?: number;
  medicationScore?: number;
  sleepScore?: number;
  vitalsScore?: number;
  hydrationScore?: number;

  // Total score (weighted average of all categories)
  totalDailyScore?: number;

  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DailyScoreCreationAttributes extends Optional<DailyScoreAttributes, 'id' | 'postSurgeryDay' | 'exerciseScore' | 'nutritionScore' | 'medicationScore' | 'sleepScore' | 'vitalsScore' | 'hydrationScore' | 'totalDailyScore' | 'notes' | 'createdAt' | 'updatedAt'> {}

class DailyScore extends Model<DailyScoreAttributes, DailyScoreCreationAttributes> implements DailyScoreAttributes {
  public id!: number;
  public userId!: number;
  public scoreDate!: Date;
  public postSurgeryDay?: number;

  public exerciseScore?: number;
  public nutritionScore?: number;
  public medicationScore?: number;
  public sleepScore?: number;
  public vitalsScore?: number;
  public hydrationScore?: number;

  public totalDailyScore?: number;

  public notes?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    DailyScore.init(
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
          comment: 'User being scored',
        },
        scoreDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          comment: 'Date of this daily score',
        },
        postSurgeryDay: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Days since surgery (Day 0 = surgery date), auto-calculated by trigger',
        },

        // Category scores (0-100 scale)
        exerciseScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Exercise/Activities score (0-100)',
        },
        nutritionScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Meals/Nutrition score (0-100)',
        },
        medicationScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Medication adherence score (0-100)',
        },
        sleepScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Sleep quality score (0-100)',
        },
        vitalsScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Vitals health score (0-100)',
        },
        hydrationScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Hydration compliance score (0-100)',
        },

        // Total score
        totalDailyScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Total daily score - weighted average of all categories (0-100)',
        },

        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Optional notes for this day',
        },
      },
      {
        sequelize,
        modelName: 'DailyScore',
        tableName: 'daily_scores',
        timestamps: true,
        indexes: [
          {
            fields: ['userId', 'scoreDate'],
            unique: true,
          },
          {
            fields: ['userId', 'postSurgeryDay'],
          },
          {
            fields: ['scoreDate'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    DailyScore.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

DailyScore.initialize();

export default DailyScore;
