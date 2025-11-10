import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface MealEntryAttributes {
  id: number;
  userId: number;
  timestamp: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage';
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
  postSurgeryDay?: number;
  notes?: string;
  satisfactionRating?: number;
  status?: 'planned' | 'completed' | 'missed';
  createdAt?: Date;
  updatedAt?: Date;
}

interface MealEntryCreationAttributes extends Optional<MealEntryAttributes, 'id' | 'withinSpec'> {}

/**
 * MealEntry Model - Single Source of Truth for All Meal Data
 *
 * ARCHITECTURE NOTES:
 * - This table serves as the ONLY storage for meal data across the entire application
 * - All three pages (MealsPage, CalendarPage, FoodDiaryPage) read from this table
 * - The 'status' field serves dual purpose:
 *   * 'planned' = Future meals shown in MealsPage calendar
 *   * 'completed' = Logged meals shown in FoodDiaryPage history
 *   * 'missed' = Planned meals that were not consumed
 *
 * DATA FLOW:
 * - MealsPage: Shows planned meals (status='planned'), allows users to plan future meals
 * - CalendarPage: Shows all meals with visual indicators by date
 * - FoodDiaryPage: Shows completed meals (status='completed'), tracks daily nutrition
 * - Dashboard: Aggregates data from this table for summary statistics
 *
 * IMPORTANT FIELDS:
 * - foodItems: Intentionally TEXT field for flexibility (comma-separated or free-form)
 * - timestamp: Used for date filtering across all views (daily/weekly/monthly)
 * - withinSpec: Auto-calculated compliance flag based on dietary limits
 * - postSurgeryDay: Auto-calculated via database trigger based on user's surgery date
 *
 * DIETARY LIMITS (see mealController.ts):
 * - Per-meal limits: sodium ≤575mg, cholesterol ≤75mg, saturatedFat ≤5g (1/4 of daily)
 * - Daily limits: sodium ≤2300mg, cholesterol ≤300mg, saturatedFat ≤20g
 * - Alerts sent at 80%, 90%, and 100% of daily limits
 */
class MealEntry extends Model<MealEntryAttributes, MealEntryCreationAttributes> implements MealEntryAttributes {
  public id!: number;
  public userId!: number;
  public timestamp!: Date;
  public mealType!: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage';
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
  public postSurgeryDay?: number;
  public notes?: string;
  public satisfactionRating?: number;
  public status?: 'planned' | 'completed' | 'missed';
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
          type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack', 'beverage'),
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
        postSurgeryDay: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Days since surgery (Day 0 = surgery date), auto-calculated by trigger',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        satisfactionRating: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Meal satisfaction rating (1-5 stars)',
          validate: {
            min: 1,
            max: 5,
          },
        },
        status: {
          type: DataTypes.ENUM('planned', 'completed', 'missed'),
          allowNull: true,
          defaultValue: 'planned',
          comment: 'Meal completion status',
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