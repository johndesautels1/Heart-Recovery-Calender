import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface NotificationAttributes {
  id: number;
  userId: number;
  type: 'email' | 'sms' | 'push' | 'in-app';
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'read';
  sentAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'status' | 'sentAt' | 'readAt' | 'errorMessage' | 'metadata' | 'createdAt' | 'updatedAt'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: number;
  public userId!: number;
  public type!: 'email' | 'sms' | 'push' | 'in-app';
  public title!: string;
  public message!: string;
  public status!: 'pending' | 'sent' | 'failed' | 'read';
  public sentAt!: Date | undefined;
  public readAt!: Date | undefined;
  public errorMessage!: string | undefined;
  public metadata!: any;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
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
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('email', 'sms', 'push', 'in-app'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed', 'read'),
      allowNull: false,
      defaultValue: 'pending',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
  }
);

export default Notification;
