import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface MealEntryAttributes {
  id: number;
  userId: number;
  timestamp: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodItems: string;
  calories?: number;
  sodium?: number;
  cholesterol?: number;
  saturatedFat?: number;
  totalFat?: number;
  fiber?: number;
  sugar?: number;
  protein?: number;
  carbohydrates?: number;
  withinSpec: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MealEntryCreationAttributes extends Optional<MealEntryAttributes, 'id' | 'withinSpec'> {}

class MealEntry extends Model<MealEntryAttributes, MealEntryCreationAttributes> implements MealEntryAttributes {
  public id!: number;
  public userId!: number;
  public timestamp!: Date;
  public mealType!: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  public foodItems!: string;
  public calories?: number;
  public sodium?: number;
  public cholesterol?: number;
  public saturatedFat?: number;
  public totalFat?: number;
  public fiber?: number;
  public sugar?: number;
  public protein?: number;
  public carbohydrates?: number;
  public withinSpec!: boolean;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    MealEntry.init(
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
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        mealType: {
          type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
          allowNull: false,
        },
        foodItems: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        calories: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        sodium: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Sodium in mg',
        },
        cholesterol: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Cholesterol in mg',
        },
        saturatedFat: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Saturated fat in grams',
        },
        totalFat: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Total fat in grams',
        },
        fiber: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Fiber in grams',
        },
        sugar: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Sugar in grams',
        },
        protein: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Protein in grams',
        },
        carbohydrates: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: 'Carbohydrates in grams',
        },
        withinSpec: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          comment: 'Whether meal meets dietary specifications',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'MealEntry',
        tableName: 'meal_entries',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    MealEntry.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

MealEntry.initialize();

export default MealEntry;