import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface UserPreferences {
  reminderDefaults?: {
    medication?: number;     // Minutes before event
    exercise?: number;
    appointment?: number;
    meal?: number;
    vitals?: number;
    hydration?: number;
    mood?: number;
    therapy?: number;
    education?: number;
  };
  sleepGoalHours?: number;
  timeFormat?: '12h' | '24h';
  exportFormat?: 'ics' | 'json' | 'csv';
  importFormat?: string;  // User-selected default import format
  availableExportFormats?: string[];  // User-customizable export formats
  availableImportFormats?: string[];  // User-customizable import formats
  customSettings?: {
    [key: string]: any;  // For extensible custom settings
  };
}

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
  preferences?: UserPreferences;
  role?: 'patient' | 'therapist' | 'admin';
  surgeryDate?: Date;  // Day 0 - the date of heart surgery (for patient users)
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
  public preferences?: UserPreferences;
  public role?: 'patient' | 'therapist' | 'admin';
  public surgeryDate?: Date;
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
        preferences: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: {
            reminderDefaults: {
              medication: 30,      // 30 minutes before
              exercise: 60,        // 1 hour before
              appointment: 1440,   // 24 hours before (1 day)
              meal: 15,            // 15 minutes before
              vitals: 30,          // 30 minutes before
              hydration: 0,        // At time of event
              mood: 0,             // At time of event
              therapy: 120,        // 2 hours before
              education: 60,       // 1 hour before
            },
            timeFormat: '12h',     // 12-hour or 24-hour clock
            exportFormat: 'ics',   // Default export format
            importFormat: 'ics',   // Default import format
            availableExportFormats: ['ics', 'json', 'csv', 'xlsx', 'pdf'],  // Available export formats
            availableImportFormats: ['ics', 'json', 'csv'],  // Available import formats
            customSettings: {},    // Custom user settings
          },
          comment: 'User preferences including per-category reminder defaults (SET-002), time format (I18N-002), and export format (SET-005)',
        },
        role: {
          type: DataTypes.ENUM('patient', 'therapist', 'admin'),
          allowNull: false,
          defaultValue: 'patient',
        },
        surgeryDate: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Day 0 - the date of heart surgery (for patient users)',
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
