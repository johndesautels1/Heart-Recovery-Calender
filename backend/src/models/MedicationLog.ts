import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface MedicationLogAttributes {
  id: number;
  userId: number;
  medicationId: number;
  scheduledTime: Date;
  takenTime?: Date;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MedicationLogCreationAttributes extends Optional<MedicationLogAttributes, 'id'> {}

class MedicationLog extends Model<MedicationLogAttributes, MedicationLogCreationAttributes> implements MedicationLogAttributes {
  public id!: number;
  public userId!: number;
  public medicationId!: number;
  public scheduledTime!: Date;
  public takenTime?: Date;
  public status!: 'scheduled' | 'taken' | 'missed' | 'skipped';
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    MedicationLog.init(
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
        medicationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'medications',
            key: 'id',
          },
        },
        scheduledTime: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        takenTime: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'scheduled',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'MedicationLog',
        tableName: 'medication_logs',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    MedicationLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    MedicationLog.belongsTo(models.Medication, { foreignKey: 'medicationId', as: 'medication' });
  }
}

MedicationLog.initialize();

export default MedicationLog;
