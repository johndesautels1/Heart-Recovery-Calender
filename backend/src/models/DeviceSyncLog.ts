import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface DeviceSyncLogAttributes {
  id: number;
  deviceConnectionId: number;
  syncType: 'manual' | 'webhook' | 'scheduled' | 'realtime';
  dataType: 'exercise' | 'heart_rate' | 'steps' | 'calories' | 'vitals' | 'all';
  status: 'pending' | 'success' | 'error' | 'partial';

  // Sync details
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;

  // Error tracking
  errorMessage?: string;
  errorDetails?: string;

  // Metadata
  externalIds?: string;  // JSON array of external IDs synced
  syncMetadata?: string; // JSON object with device-specific metadata

  createdAt?: Date;
  updatedAt?: Date;
}

interface DeviceSyncLogCreationAttributes extends Optional<DeviceSyncLogAttributes, 'id' | 'completedAt' | 'recordsProcessed' | 'recordsCreated' | 'recordsUpdated' | 'recordsSkipped' | 'errorMessage' | 'errorDetails' | 'externalIds' | 'syncMetadata' | 'createdAt' | 'updatedAt'> {}

class DeviceSyncLog extends Model<DeviceSyncLogAttributes, DeviceSyncLogCreationAttributes> implements DeviceSyncLogAttributes {
  public id!: number;
  public deviceConnectionId!: number;
  public syncType!: 'manual' | 'webhook' | 'scheduled' | 'realtime';
  public dataType!: 'exercise' | 'heart_rate' | 'steps' | 'calories' | 'vitals' | 'all';
  public status!: 'pending' | 'success' | 'error' | 'partial';

  public startedAt!: Date;
  public completedAt?: Date;
  public recordsProcessed?: number;
  public recordsCreated?: number;
  public recordsUpdated?: number;
  public recordsSkipped?: number;

  public errorMessage?: string;
  public errorDetails?: string;

  public externalIds?: string;
  public syncMetadata?: string;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    DeviceSyncLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        deviceConnectionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'device_connections',
            key: 'id',
          },
        },
        syncType: {
          type: DataTypes.ENUM('manual', 'webhook', 'scheduled', 'realtime'),
          allowNull: false,
          comment: 'How the sync was triggered',
        },
        dataType: {
          type: DataTypes.ENUM('exercise', 'heart_rate', 'steps', 'calories', 'vitals', 'all'),
          allowNull: false,
          comment: 'Type of data being synced',
        },
        status: {
          type: DataTypes.ENUM('pending', 'success', 'error', 'partial'),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'Sync operation status',
        },
        startedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: 'When the sync started',
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'When the sync completed',
        },
        recordsProcessed: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Total records attempted to sync',
        },
        recordsCreated: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'New records created',
        },
        recordsUpdated: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Existing records updated',
        },
        recordsSkipped: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Records skipped (duplicates, errors)',
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Error message if sync failed',
        },
        errorDetails: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Detailed error information (stack trace, etc.)',
        },
        externalIds: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'JSON array of external IDs that were synced',
        },
        syncMetadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'JSON object with additional sync metadata',
        },
      },
      {
        sequelize,
        modelName: 'DeviceSyncLog',
        tableName: 'device_sync_logs',
        timestamps: true,
        indexes: [
          {
            fields: ['deviceConnectionId', 'startedAt'],
            name: 'device_sync_history',
          },
          {
            fields: ['status'],
            name: 'sync_status_idx',
          },
        ],
      }
    );
  }

  static associate(models: any) {
    DeviceSyncLog.belongsTo(models.DeviceConnection, {
      foreignKey: 'deviceConnectionId',
      as: 'deviceConnection',
    });
  }
}

DeviceSyncLog.initialize();

export default DeviceSyncLog;
