import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface UserAttributes {
  id: number;
  email: string;
  password?: string;
  name: string;
  phoneNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
  profilePhoto?: string;
  timezone?: string;
  backupNotificationEmail?: string;
  role?: 'patient' | 'therapist' | 'admin';
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password?: string;
  public name!: string;
  public phoneNumber?: string;
  public emergencyContact?: string;
  public emergencyPhone?: string;
  public doctorName?: string;
  public doctorPhone?: string;
  public profilePhoto?: string;
  public timezone?: string;
  public backupNotificationEmail?: string;
  public role?: 'patient' | 'therapist' | 'admin';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to exclude password from JSON responses
  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  }

  static initialize() {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
          },
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: true, // Optional for OAuth users
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        phoneNumber: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        emergencyContact: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        emergencyPhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        doctorName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        doctorPhone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        profilePhoto: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        timezone: {
          type: DataTypes.STRING(50),
          defaultValue: 'America/New_York',
        },
        backupNotificationEmail: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isEmail: true,
          },
          comment: 'Secondary email for backup and export notifications',
        },
        role: {
          type: DataTypes.ENUM('patient', 'therapist', 'admin'),
          allowNull: false,
          defaultValue: 'patient',
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    User.hasMany(models.Calendar, { foreignKey: 'userId', as: 'calendars' });
    User.hasMany(models.MealEntry, { foreignKey: 'userId', as: 'meals' });
    User.hasMany(models.VitalsSample, { foreignKey: 'userId', as: 'vitals' });
    User.hasMany(models.Medication, { foreignKey: 'userId', as: 'medications' });
  }
}

User.initialize();

export default User;
