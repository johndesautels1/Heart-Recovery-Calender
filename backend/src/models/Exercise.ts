import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface ExerciseAttributes {
  id: number;
  name: string;
  description?: string;
  category: 'upper_body' | 'lower_body' | 'cardio' | 'flexibility' | 'balance' | 'breathing' | 'core';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipmentNeeded?: string;
  videoUrl?: string;
  imageUrl?: string;
  minPostOpWeek?: number;
  maxPostOpWeek?: number;
  contraindications?: string;
  instructions?: string;
  recoveryBenefit?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number; // in minutes
  isActive: boolean;
  createdBy?: number; // therapist user ID who created this exercise
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExerciseCreationAttributes extends Optional<ExerciseAttributes, 'id' | 'description' | 'equipmentNeeded' | 'videoUrl' | 'imageUrl' | 'minPostOpWeek' | 'maxPostOpWeek' | 'contraindications' | 'instructions' | 'recoveryBenefit' | 'defaultSets' | 'defaultReps' | 'defaultDuration' | 'createdBy' | 'createdAt' | 'updatedAt'> {}

class Exercise extends Model<ExerciseAttributes, ExerciseCreationAttributes> implements ExerciseAttributes {
  public id!: number;
  public name!: string;
  public description?: string;
  public category!: 'upper_body' | 'lower_body' | 'cardio' | 'flexibility' | 'balance' | 'breathing' | 'core';
  public difficulty!: 'beginner' | 'intermediate' | 'advanced';
  public equipmentNeeded?: string;
  public videoUrl?: string;
  public imageUrl?: string;
  public minPostOpWeek?: number;
  public maxPostOpWeek?: number;
  public contraindications?: string;
  public instructions?: string;
  public recoveryBenefit?: string;
  public defaultSets?: number;
  public defaultReps?: number;
  public defaultDuration?: number;
  public isActive!: boolean;
  public createdBy?: number;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    Exercise.init(
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
          type: DataTypes.ENUM('upper_body', 'lower_body', 'cardio', 'flexibility', 'balance', 'breathing', 'core'),
          allowNull: false,
        },
        difficulty: {
          type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
          allowNull: false,
        },
        equipmentNeeded: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        videoUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        imageUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        minPostOpWeek: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Minimum post-operative week recommended for this exercise',
        },
        maxPostOpWeek: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Maximum post-operative week recommended for this exercise (null = no limit)',
        },
        contraindications: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Medical contraindications or warnings',
        },
        instructions: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Step-by-step instructions',
        },
        recoveryBenefit: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'How this exercise benefits cardiac recovery',
        },
        defaultSets: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        defaultReps: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        defaultDuration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Default duration in minutes',
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
          comment: 'Therapist user ID who created this exercise',
        },
      },
      {
        sequelize,
        modelName: 'Exercise',
        tableName: 'exercises',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    Exercise.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
  }
}

Exercise.initialize();

export default Exercise;
