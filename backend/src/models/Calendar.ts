import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface CalendarAttributes {
  id: number;
  userId: number;
  name: string;
  type: 'medications' | 'appointments' | 'exercise' | 'vitals' | 'diet' | 'symptoms' | 'general';
  color: string;
  isSharedWithDoctor: boolean;
  isActive: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CalendarCreationAttributes extends Optional<CalendarAttributes, 'id' | 'isSharedWithDoctor' | 'isActive'> {}

class Calendar extends Model<CalendarAttributes, CalendarCreationAttributes> implements CalendarAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public type!: 'medications' | 'appointments' | 'exercise' | 'vitals' | 'diet' | 'symptoms' | 'general';
  public color!: string;
  public isSharedWithDoctor!: boolean;
  public isActive!: boolean;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    Calendar.init(
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
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM('medications', 'appointments', 'exercise', 'vitals', 'diet', 'symptoms', 'general'),
          allowNull: false,
          defaultValue: 'general',
        },
        color: {
          type: DataTypes.STRING(7),
          allowNull: false,
          defaultValue: '#3f51b5',
          validate: {
            is: /^#[0-9A-F]{6}$/i,
          },
        },
        isSharedWithDoctor: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Calendar',
        tableName: 'calendars',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    Calendar.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Calendar.hasMany(models.CalendarEvent, { foreignKey: 'calendarId', as: 'events' });
  }
}

Calendar.initialize();

export default Calendar;