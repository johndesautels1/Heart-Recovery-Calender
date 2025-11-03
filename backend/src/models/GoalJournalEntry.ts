import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from './database';

interface GoalJournalEntryAttributes {
  id: number;
  goalId: number;
  userId: number;
  entryDate: Date;
  reflectionText: string;
  progressNotes?: string;
  mood?: 'excellent' | 'good' | 'neutral' | 'challenging' | 'difficult';
  createdAt?: Date;
  updatedAt?: Date;
}

interface GoalJournalEntryCreationAttributes extends Optional<GoalJournalEntryAttributes, 'id'> {}

class GoalJournalEntry extends Model<GoalJournalEntryAttributes, GoalJournalEntryCreationAttributes> implements GoalJournalEntryAttributes {
  public id!: number;
  public goalId!: number;
  public userId!: number;
  public entryDate!: Date;
  public reflectionText!: string;
  public progressNotes?: string;
  public mood?: 'excellent' | 'good' | 'neutral' | 'challenging' | 'difficult';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    GoalJournalEntry.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        goalId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'therapy_goals',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        entryDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        reflectionText: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        progressNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        mood: {
          type: DataTypes.ENUM('excellent', 'good', 'neutral', 'challenging', 'difficult'),
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'GoalJournalEntry',
        tableName: 'goal_journal_entries',
        timestamps: true,
        indexes: [
          {
            fields: ['goalId'],
          },
          {
            fields: ['userId'],
          },
          {
            fields: ['entryDate'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    GoalJournalEntry.belongsTo(models.TherapyGoal, {
      foreignKey: 'goalId',
      as: 'goal',
    });

    GoalJournalEntry.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

// Initialize the model
GoalJournalEntry.initialize();

export default GoalJournalEntry;
