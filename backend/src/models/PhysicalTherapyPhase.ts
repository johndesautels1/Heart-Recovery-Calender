import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface PhysicalTherapyPhaseAttributes {
  id: number;
  phaseNumber: number;
  phaseName: string;
  weekStart: number;
  weekEnd: number;
  description: string;
  focusAreas: string[];
  restrictions: string[];
  exerciseLibrary: any;
  targetHeartRate?: string;
  intensityLevel: 'very_light' | 'light' | 'moderate' | 'vigorous';
  createdAt?: Date;
  updatedAt?: Date;
}

interface PhysicalTherapyPhaseCreationAttributes extends Optional<PhysicalTherapyPhaseAttributes, 'id'> {}

class PhysicalTherapyPhase extends Model<PhysicalTherapyPhaseAttributes, PhysicalTherapyPhaseCreationAttributes> implements PhysicalTherapyPhaseAttributes {
  public id!: number;
  public phaseNumber!: number;
  public phaseName!: string;
  public weekStart!: number;
  public weekEnd!: number;
  public description!: string;
  public focusAreas!: string[];
  public restrictions!: string[];
  public exerciseLibrary!: any;
  public targetHeartRate?: string;
  public intensityLevel!: 'very_light' | 'light' | 'moderate' | 'vigorous';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    PhysicalTherapyPhase.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        phaseNumber: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },
        phaseName: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        weekStart: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        weekEnd: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        focusAreas: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
        },
        restrictions: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
        },
        exerciseLibrary: {
          type: DataTypes.JSONB,
          allowNull: false,
          comment: 'JSON object containing array of exercises with sets, reps, duration, frequency',
        },
        targetHeartRate: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        intensityLevel: {
          type: DataTypes.ENUM('very_light', 'light', 'moderate', 'vigorous'),
          allowNull: false,
          defaultValue: 'very_light',
        },
      },
      {
        sequelize,
        modelName: 'PhysicalTherapyPhase',
        tableName: 'physical_therapy_phases',
        timestamps: true,
        indexes: [
          { fields: ['phaseNumber'] },
        ],
      }
    );
  }

  static associate(models: any) {
    PhysicalTherapyPhase.hasMany(models.TherapyRoutine, {
      foreignKey: 'phaseId',
      as: 'routines',
    });
  }
}

PhysicalTherapyPhase.initialize();

export default PhysicalTherapyPhase;
