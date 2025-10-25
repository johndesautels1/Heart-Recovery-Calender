import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface ActivityAttributes {
  id: number;
  userId: number;
  activityType: 'adl' | 'mobility' | 'recreational' | 'social' | 'exercise';
  activityName: string;
  activityCategory?: string;
  activityDate: Date;
  activityTime?: string;
  status: 'accomplished' | 'caution' | 'not_to_do' | 'issue';
  duration?: number;
  notes?: string;
  symptoms?: string[];
  heartRate?: number;
  bloodPressure?: string;
  painLevel?: number;
  fatigueLevel?: number;
  assistanceRequired: boolean;
  milestone: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ActivityCreationAttributes extends Optional<ActivityAttributes, 'id'> {}

class Activity extends Model<ActivityAttributes, ActivityCreationAttributes> implements ActivityAttributes {
  public id!: number;
  public userId!: number;
  public activityType!: 'adl' | 'mobility' | 'recreational' | 'social' | 'exercise';
  public activityName!: string;
  public activityCategory?: string;
  public activityDate!: Date;
  public activityTime?: string;
  public status!: 'accomplished' | 'caution' | 'not_to_do' | 'issue';
  public duration?: number;
  public notes?: string;
  public symptoms?: string[];
  public heartRate?: number;
  public bloodPressure?: string;
  public painLevel?: number;
  public fatigueLevel?: number;
  public assistanceRequired!: boolean;
  public milestone!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    Activity.init(
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
        activityType: {
          type: DataTypes.ENUM('adl', 'mobility', 'recreational', 'social', 'exercise'),
          allowNull: false,
          comment: 'ADL=Activities of Daily Living',
        },
        activityName: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        activityCategory: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'e.g., bathing, stairs, walking, cycling',
        },
        activityDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        activityTime: {
          type: DataTypes.STRING(10),
          allowNull: true,
          comment: 'Time in HH:MM format',
        },
        status: {
          type: DataTypes.ENUM('accomplished', 'caution', 'not_to_do', 'issue'),
          allowNull: false,
          defaultValue: 'accomplished',
          comment: 'Green=accomplished, Yellow=caution, Red=issue/not_to_do',
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Duration in minutes',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        symptoms: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'Any symptoms experienced during activity',
        },
        heartRate: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Heart rate during/after activity',
        },
        bloodPressure: {
          type: DataTypes.STRING(20),
          allowNull: true,
          comment: 'Format: systolic/diastolic (e.g., 120/80)',
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
        assistanceRequired: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Did patient need help with this activity',
        },
        milestone: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Mark this activity as a milestone achievement',
        },
      },
      {
        sequelize,
        modelName: 'Activity',
        tableName: 'activities',
        timestamps: true,
        indexes: [
          { fields: ['userId'] },
          { fields: ['activityType'] },
          { fields: ['activityDate'] },
          { fields: ['status'] },
          { fields: ['milestone'] },
        ],
      }
    );
  }

  static associate(models: any) {
    Activity.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

Activity.initialize();

export default Activity;
