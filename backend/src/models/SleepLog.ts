import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface SleepStage {
  stage: 'awake' | 'light' | 'deep' | 'rem';
  startTime: string;
  endTime: string;
}

interface SleepLogAttributes {
  id: number;
  userId: number;
  date: Date;
  hoursSlept: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  dreamQuality?: 'nightmare' | 'cannot_remember' | 'sporadic' | 'vivid_positive';
  postSurgeryDay?: number;
  notes?: string;
  bedTime?: Date;
  wakeTime?: Date;
  isNap?: boolean;
  napDuration?: number;
  dreamNotes?: string;
  sleepScore?: number;

  // Sleep Stages (from Samsung Galaxy Watch)
  sleepStages?: SleepStage[];
  awakeDuration?: number;
  lightSleepDuration?: number;
  deepSleepDuration?: number;
  remSleepDuration?: number;
  awakePercent?: number;
  lightSleepPercent?: number;
  deepSleepPercent?: number;
  remSleepPercent?: number;

  // Sleep Efficiency
  timeInBed?: number;
  timeAsleep?: number;
  sleepEfficiency?: number;
  sleepOnsetLatency?: number;
  wakeAfterSleepOnset?: number;

  // Sleep Environment
  roomTemperature?: number;
  noiseLevel?: number;
  lightLevel?: number;
  bedtimeRoutine?: string;
  environmentNotes?: string;

  // Sleep Consistency
  bedtimeDeviation?: number;
  waketimeDeviation?: number;

  // Additional Quality Indicators
  sleepInterruptions?: number;
  restfulness?: number;
  morningMood?: 'terrible' | 'poor' | 'okay' | 'good' | 'excellent';

  createdAt?: Date;
  updatedAt?: Date;
}

interface SleepLogCreationAttributes extends Optional<SleepLogAttributes, 'id' | 'sleepQuality' | 'notes' | 'bedTime' | 'wakeTime' | 'createdAt' | 'updatedAt'> {}

class SleepLog extends Model<SleepLogAttributes, SleepLogCreationAttributes> implements SleepLogAttributes {
  public id!: number;
  public userId!: number;
  public date!: Date;
  public hoursSlept!: number;
  public sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  public dreamQuality?: 'nightmare' | 'cannot_remember' | 'sporadic' | 'vivid_positive';
  public postSurgeryDay?: number;
  public notes?: string;
  public bedTime?: Date;
  public wakeTime?: Date;
  public isNap?: boolean;
  public napDuration?: number;
  public dreamNotes?: string;
  public sleepScore?: number;

  // Sleep Stages
  public sleepStages?: SleepStage[];
  public awakeDuration?: number;
  public lightSleepDuration?: number;
  public deepSleepDuration?: number;
  public remSleepDuration?: number;
  public awakePercent?: number;
  public lightSleepPercent?: number;
  public deepSleepPercent?: number;
  public remSleepPercent?: number;

  // Sleep Efficiency
  public timeInBed?: number;
  public timeAsleep?: number;
  public sleepEfficiency?: number;
  public sleepOnsetLatency?: number;
  public wakeAfterSleepOnset?: number;

  // Sleep Environment
  public roomTemperature?: number;
  public noiseLevel?: number;
  public lightLevel?: number;
  public bedtimeRoutine?: string;
  public environmentNotes?: string;

  // Sleep Consistency
  public bedtimeDeviation?: number;
  public waketimeDeviation?: number;

  // Additional Quality Indicators
  public sleepInterruptions?: number;
  public restfulness?: number;
  public morningMood?: 'terrible' | 'poor' | 'okay' | 'good' | 'excellent';

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    SleepLog.init(
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
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          comment: 'Date of the sleep (the day you woke up)',
        },
        hoursSlept: {
          type: DataTypes.DECIMAL(4, 2),
          allowNull: false,
          comment: 'Total hours of sleep',
        },
        sleepQuality: {
          type: DataTypes.ENUM('poor', 'fair', 'good', 'excellent'),
          allowNull: true,
        },
        dreamQuality: {
          type: DataTypes.ENUM('nightmare', 'cannot_remember', 'sporadic', 'vivid_positive'),
          allowNull: true,
          comment: 'Dream quality: nightmare (0pts), cannot_remember (1pt), sporadic (2pts), vivid_positive (3pts)',
        },
        postSurgeryDay: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Days since surgery (Day 0 = surgery date), auto-calculated by trigger',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        bedTime: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Time went to bed',
        },
        wakeTime: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Time woke up',
        },
        isNap: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Whether this is a nap (not overnight sleep)',
        },
        napDuration: {
          type: DataTypes.DECIMAL(4, 2),
          allowNull: true,
          comment: 'Duration of nap in hours',
        },
        dreamNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Dream journal notes',
        },
        sleepScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Calculated sleep score (0-100)',
          validate: {
            min: 0,
            max: 100,
          },
        },

        // ============================================================================
        // SLEEP STAGES (from Samsung Galaxy Watch)
        // ============================================================================
        sleepStages: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: 'Array of sleep stages with start/end times',
        },
        awakeDuration: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Minutes awake during sleep',
        },
        lightSleepDuration: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Minutes in light sleep',
        },
        deepSleepDuration: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Minutes in deep sleep',
        },
        remSleepDuration: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Minutes in REM sleep',
        },
        awakePercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Percentage awake (0-100)',
        },
        lightSleepPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Percentage light sleep (0-100)',
        },
        deepSleepPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Percentage deep sleep (ideal: 15-25%)',
        },
        remSleepPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Percentage REM sleep (ideal: 20-25%)',
        },

        // ============================================================================
        // SLEEP EFFICIENCY
        // ============================================================================
        timeInBed: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Total time in bed (minutes)',
        },
        timeAsleep: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Time actually asleep (minutes)',
        },
        sleepEfficiency: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Sleep efficiency % (target: >85%)',
        },
        sleepOnsetLatency: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Time to fall asleep (minutes)',
        },
        wakeAfterSleepOnset: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Minutes awake after falling asleep (WASO)',
        },

        // ============================================================================
        // SLEEP ENVIRONMENT
        // ============================================================================
        roomTemperature: {
          type: DataTypes.DECIMAL(4, 1),
          allowNull: true,
          comment: 'Room temp in °F (ideal: 60-67°F)',
        },
        noiseLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Noise level 1-10 scale',
          validate: {
            min: 1,
            max: 10,
          },
        },
        lightLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Light level 1-10 scale',
          validate: {
            min: 1,
            max: 10,
          },
        },
        bedtimeRoutine: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Bedtime routine notes',
        },
        environmentNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Environment notes',
        },

        // ============================================================================
        // SLEEP CONSISTENCY
        // ============================================================================
        bedtimeDeviation: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Minutes deviation from avg bedtime',
        },
        waketimeDeviation: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: true,
          comment: 'Minutes deviation from avg wake time',
        },

        // ============================================================================
        // ADDITIONAL QUALITY INDICATORS
        // ============================================================================
        sleepInterruptions: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Number of times woke up',
        },
        restfulness: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Restfulness rating 1-10',
          validate: {
            min: 1,
            max: 10,
          },
        },
        morningMood: {
          type: DataTypes.ENUM('terrible', 'poor', 'okay', 'good', 'excellent'),
          allowNull: true,
          comment: 'Mood upon waking',
        },
      },
      {
        sequelize,
        modelName: 'SleepLog',
        tableName: 'sleep_logs',
        timestamps: true,
        indexes: [
          {
            fields: ['userId', 'date'],
            unique: true,
          },
        ],
      }
    );
  }

  static associate(models: any) {
    SleepLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

SleepLog.initialize();

export default SleepLog;
