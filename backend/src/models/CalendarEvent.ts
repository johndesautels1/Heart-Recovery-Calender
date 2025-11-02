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
  eventTemplateId?: number;
  invitationStatus?: 'pending' | 'accepted' | 'declined';
  createdBy?: number;
  patientId?: number;
  exerciseId?: number;
  performanceScore?: number; // 0 = no show, 4 = completed, 6 = met goals, 8 = exceeded goals
  exerciseIntensity?: number; // 1-10 scale
  distanceMiles?: number;
  laps?: number;
  steps?: number;
  elevationFeet?: number;
  durationMinutes?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  caloriesBurned?: number;
  exerciseNotes?: string;
  deletedAt?: Date; // Soft delete timestamp
  privacyLevel?: 'private' | 'shared' | 'clinical'; // Privacy control
  therapyGoalId?: number; // Link to therapy goals
  attachments?: any; // JSONB field for file metadata
  tags?: string[]; // Array of tags for categorization
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
  public eventTemplateId?: number;
  public invitationStatus?: 'pending' | 'accepted' | 'declined';
  public createdBy?: number;
  public patientId?: number;
  public exerciseId?: number;
  public performanceScore?: number;
  public exerciseIntensity?: number;
  public distanceMiles?: number;
  public laps?: number;
  public steps?: number;
  public elevationFeet?: number;
  public durationMinutes?: number;
  public heartRateAvg?: number;
  public heartRateMax?: number;
  public caloriesBurned?: number;
  public exerciseNotes?: string;
  public deletedAt?: Date;
  public privacyLevel?: 'private' | 'shared' | 'clinical';
  public therapyGoalId?: number;
  public attachments?: any;
  public tags?: string[];
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
        eventTemplateId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'event_templates',
            key: 'id',
          },
          comment: 'Reference to event template if event was created from a template',
        },
        invitationStatus: {
          type: DataTypes.ENUM('pending', 'accepted', 'declined'),
          allowNull: true,
          comment: 'Patient invitation status for this event',
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Therapist user ID who created this event',
        },
        patientId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Patient user ID this event is assigned to',
        },
        exerciseId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'exercises',
            key: 'id',
          },
          comment: 'Exercise associated with this event if applicable',
        },
        performanceScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '0 = no show, 4 = completed, 6 = met goals, 8 = exceeded goals',
        },
        exerciseIntensity: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Exercise intensity level (1-10 scale)',
        },
        distanceMiles: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Distance covered in miles',
        },
        laps: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Number of laps completed',
        },
        steps: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Number of steps taken',
        },
        elevationFeet: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Elevation gain in feet',
        },
        durationMinutes: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Actual exercise duration in minutes',
        },
        heartRateAvg: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Average heart rate during exercise',
        },
        heartRateMax: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Maximum heart rate during exercise',
        },
        caloriesBurned: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Estimated calories burned',
        },
        exerciseNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Additional notes about the exercise session',
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Soft delete timestamp - if set, event is considered deleted',
        },
        privacyLevel: {
          type: DataTypes.ENUM('private', 'shared', 'clinical'),
          allowNull: true,
          defaultValue: 'private',
          comment: 'Privacy level: private (patient only), shared (with therapist), clinical (medical records)',
        },
        therapyGoalId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'therapy_goals',
            key: 'id',
          },
          comment: 'Link to therapy goal if this event is part of a therapy plan',
        },
        attachments: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: null,
          comment: 'JSONB field for file attachments metadata (filename, url, type, size)',
        },
        tags: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: true,
          defaultValue: [],
          comment: 'Array of tags for flexible categorization and filtering',
        },
      },
      {
        sequelize,
        modelName: 'CalendarEvent',
        tableName: 'calendar_events',
        timestamps: true,
        paranoid: true, // Enables soft deletes with deletedAt
      }
    );
  }

  static associate(models: any) {
    CalendarEvent.belongsTo(models.Calendar, { foreignKey: 'calendarId', as: 'calendar' });
    CalendarEvent.belongsTo(models.EventTemplate, { foreignKey: 'eventTemplateId', as: 'template' });
    CalendarEvent.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    CalendarEvent.belongsTo(models.User, { foreignKey: 'patientId', as: 'patient' });
    CalendarEvent.belongsTo(models.Exercise, { foreignKey: 'exerciseId', as: 'exercise' });
  }
}

CalendarEvent.initialize();

export default CalendarEvent;