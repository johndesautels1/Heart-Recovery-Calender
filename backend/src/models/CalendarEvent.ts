import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface CalendarEventAttributes {
  id: number;
  calendarId: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  recurrenceRule?: string;
  reminderMinutes?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  notes?: string;
  sleepHours?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CalendarEventCreationAttributes extends Optional<CalendarEventAttributes, 'id' | 'isAllDay' | 'status'> {}

class CalendarEvent extends Model<CalendarEventAttributes, CalendarEventCreationAttributes> implements CalendarEventAttributes {
  public id!: number;
  public calendarId!: number;
  public title!: string;
  public description?: string;
  public startTime!: Date;
  public endTime!: Date;
  public isAllDay!: boolean;
  public location?: string;
  public recurrenceRule?: string;
  public reminderMinutes?: number;
  public status!: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  public notes?: string;
  public sleepHours?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    CalendarEvent.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        calendarId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'calendars',
            key: 'id',
          },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        startTime: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endTime: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        isAllDay: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        recurrenceRule: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        reminderMinutes: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 30,
        },
        status: {
          type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'missed'),
          defaultValue: 'scheduled',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        sleepHours: {
          type: DataTypes.DECIMAL(3, 1),
          allowNull: true,
          comment: 'Hours of restful sleep the night before this date',
        },
      },
      {
        sequelize,
        modelName: 'CalendarEvent',
        tableName: 'calendar_events',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    CalendarEvent.belongsTo(models.Calendar, { foreignKey: 'calendarId', as: 'calendar' });
  }
}

CalendarEvent.initialize();

export default CalendarEvent;