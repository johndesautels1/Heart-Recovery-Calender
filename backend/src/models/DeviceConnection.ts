import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface DeviceConnectionAttributes {
  id: number;
  userId: number;
  deviceType: 'polar' | 'samsung_health' | 'health_connect' | 'strava' | 'fitbit' | 'garmin' | 'googlefit';
  deviceId?: string;
  deviceName?: string;

  // OAuth/Authentication
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  webhookSecret?: string;

  // Device-specific metadata
  polarUserId?: number;
  samsungUserId?: string;
  stravaAthleteId?: string;
  lastSyncedAt?: Date;
  syncStatus: 'active' | 'error' | 'disconnected';
  syncError?: string;

  // Settings
  autoSync: boolean;
  syncExercises: boolean;
  syncHeartRate: boolean;
  syncSteps: boolean;
  syncCalories: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

interface DeviceConnectionCreationAttributes extends Optional<DeviceConnectionAttributes, 'id' | 'deviceId' | 'deviceName' | 'accessToken' | 'refreshToken' | 'tokenExpiresAt' | 'webhookSecret' | 'polarUserId' | 'samsungUserId' | 'stravaAthleteId' | 'lastSyncedAt' | 'syncError' | 'createdAt' | 'updatedAt'> {}

class DeviceConnection extends Model<DeviceConnectionAttributes, DeviceConnectionCreationAttributes> implements DeviceConnectionAttributes {
  public id!: number;
  public userId!: number;
  public deviceType!: 'polar' | 'samsung_health' | 'health_connect' | 'strava' | 'fitbit' | 'garmin' | 'googlefit';
  public deviceId?: string;
  public deviceName?: string;

  public accessToken?: string;
  public refreshToken?: string;
  public tokenExpiresAt?: Date;
  public webhookSecret?: string;

  public polarUserId?: number;
  public samsungUserId?: string;
  public stravaAthleteId?: string;
  public lastSyncedAt?: Date;
  public syncStatus!: 'active' | 'error' | 'disconnected';
  public syncError?: string;

  public autoSync!: boolean;
  public syncExercises!: boolean;
  public syncHeartRate!: boolean;
  public syncSteps!: boolean;
  public syncCalories!: boolean;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    DeviceConnection.init(
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
        deviceType: {
          type: DataTypes.ENUM('polar', 'samsung_health', 'health_connect', 'strava', 'fitbit', 'garmin', 'googlefit'),
          allowNull: false,
          comment: 'Type of device/service connected',
        },
        deviceId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Unique device identifier from the provider',
        },
        deviceName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'User-friendly device name (e.g., "Polar H10", "Galaxy Watch 8")',
        },
        accessToken: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'OAuth access token (encrypted)',
        },
        refreshToken: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'OAuth refresh token (encrypted)',
        },
        tokenExpiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'When the access token expires',
        },
        webhookSecret: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Secret key for webhook verification',
        },
        polarUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Polar Flow user ID',
        },
        samsungUserId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Samsung Health user ID',
        },
        stravaAthleteId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Strava athlete ID',
        },
        lastSyncedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp of last successful data sync',
        },
        syncStatus: {
          type: DataTypes.ENUM('active', 'error', 'disconnected'),
          allowNull: false,
          defaultValue: 'active',
          comment: 'Current sync status',
        },
        syncError: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Last sync error message',
        },
        autoSync: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Automatically sync data from device',
        },
        syncExercises: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Sync exercise/workout data',
        },
        syncHeartRate: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Sync heart rate data',
        },
        syncSteps: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Sync step count data',
        },
        syncCalories: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Sync calorie burn data',
        },
      },
      {
        sequelize,
        modelName: 'DeviceConnection',
        tableName: 'device_connections',
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['userId', 'deviceType'],
            name: 'unique_user_device',
          },
        ],
      }
    );
  }

  static associate(models: any) {
    DeviceConnection.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

DeviceConnection.initialize();

export default DeviceConnection;
