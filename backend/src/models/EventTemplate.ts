import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface EventTemplateAttributes {
  id: number;
  name: string;
  description?: string;
  category: 'therapy' | 'consultation' | 'checkup' | 'exercise' | 'education' | 'assessment' | 'group_session' | 'follow_up';
  defaultDuration: number; // in minutes
  defaultLocation?: string;
  color?: string; // hex color for calendar display
  requiresPatientAcceptance: boolean;
  isActive: boolean;
  createdBy?: number; // therapist user ID
  createdAt?: Date;
  updatedAt?: Date;
}

interface EventTemplateCreationAttributes extends Optional<EventTemplateAttributes, 'id' | 'description' | 'defaultLocation' | 'color' | 'createdBy' | 'createdAt' | 'updatedAt'> {}

class EventTemplate extends Model<EventTemplateAttributes, EventTemplateCreationAttributes> implements EventTemplateAttributes {
  public id!: number;
  public name!: string;
  public description?: string;
  public category!: 'therapy' | 'consultation' | 'checkup' | 'exercise' | 'education' | 'assessment' | 'group_session' | 'follow_up';
  public defaultDuration!: number;
  public defaultLocation?: string;
  public color?: string;
  public requiresPatientAcceptance!: boolean;
  public isActive!: boolean;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    EventTemplate.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        category: {
          type: DataTypes.ENUM('therapy', 'consultation', 'checkup', 'exercise', 'education', 'assessment', 'group_session', 'follow_up'),
          allowNull: false,
        },
        defaultDuration: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: 'Default duration in minutes',
        },
        defaultLocation: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        color: {
          type: DataTypes.STRING(7),
          allowNull: true,
          comment: 'Hex color code for calendar display (e.g., #FF5733)',
        },
        requiresPatientAcceptance: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
          comment: 'Whether patient must accept/decline this event type',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          comment: 'Therapist user ID who created this template',
        },
      },
      {
        sequelize,
        modelName: 'EventTemplate',
        tableName: 'event_templates',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    EventTemplate.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
  }
}

EventTemplate.initialize();

export default EventTemplate;
