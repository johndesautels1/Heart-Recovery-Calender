import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface AlertAttributes {
  id: number;
  userId: number;
  therapistId?: number;
  alertType: 'medication_missed' | 'activity_issue' | 'vital_concern' | 'goal_overdue' | 'routine_skipped' | 'other';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionTaken?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: number;
  notificationSent: boolean;
  notificationMethods?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface AlertCreationAttributes extends Optional<AlertAttributes, 'id'> {}

class Alert extends Model<AlertAttributes, AlertCreationAttributes> implements AlertAttributes {
  public id!: number;
  public userId!: number;
  public therapistId?: number;
  public alertType!: 'medication_missed' | 'activity_issue' | 'vital_concern' | 'goal_overdue' | 'routine_skipped' | 'other';
  public severity!: 'info' | 'warning' | 'critical';
  public title!: string;
  public message!: string;
  public relatedEntityType?: string;
  public relatedEntityId?: number;
  public actionTaken?: string;
  public resolved!: boolean;
  public resolvedAt?: Date;
  public resolvedBy?: number;
  public notificationSent!: boolean;
  public notificationMethods?: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    Alert.init(
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
          comment: 'Patient this alert is about',
        },
        therapistId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Therapist to notify (if applicable)',
        },
        alertType: {
          type: DataTypes.ENUM('medication_missed', 'activity_issue', 'vital_concern', 'goal_overdue', 'routine_skipped', 'other'),
          allowNull: false,
        },
        severity: {
          type: DataTypes.ENUM('info', 'warning', 'critical'),
          allowNull: false,
          defaultValue: 'info',
        },
        title: {
          type: DataTypes.STRING(200),
          allowNull: false,
          comment: 'Brief alert title',
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: 'Detailed alert message',
        },
        relatedEntityType: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: 'e.g., "medication", "activity", "therapy_routine"',
        },
        relatedEntityId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'ID of related entity',
        },
        actionTaken: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Action taken to resolve alert',
        },
        resolved: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        resolvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        resolvedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        notificationSent: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        notificationMethods: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          comment: 'Methods used: ["sms", "email", "push"]',
        },
      },
      {
        sequelize,
        modelName: 'Alert',
        tableName: 'alerts',
        timestamps: true,
        indexes: [
          { fields: ['userId'] },
          { fields: ['therapistId'] },
          { fields: ['alertType'] },
          { fields: ['severity'] },
          { fields: ['resolved'] },
          { fields: ['createdAt'] },
        ],
      }
    );
  }

  static associate(models: any) {
    Alert.belongsTo(models.User, { foreignKey: 'userId', as: 'patient' });
    Alert.belongsTo(models.User, { foreignKey: 'therapistId', as: 'therapist' });
    Alert.belongsTo(models.User, { foreignKey: 'resolvedBy', as: 'resolver' });
  }
}

Alert.initialize();

export default Alert;
