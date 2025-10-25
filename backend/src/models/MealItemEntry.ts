import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface MealItemEntryAttributes {
  id: number;
  mealEntryId: number;
  foodItemId: number;
  portionSize: 'small' | 'medium' | 'large';
  quantity: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MealItemEntryCreationAttributes extends Optional<MealItemEntryAttributes, 'id'> {}

class MealItemEntry extends Model<MealItemEntryAttributes, MealItemEntryCreationAttributes> implements MealItemEntryAttributes {
  public id!: number;
  public mealEntryId!: number;
  public foodItemId!: number;
  public portionSize!: 'small' | 'medium' | 'large';
  public quantity!: number;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    MealItemEntry.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        mealEntryId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'meal_entries',
            key: 'id',
          },
          comment: 'Reference to the meal entry',
        },
        foodItemId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'food_items',
            key: 'id',
          },
          comment: 'Reference to the food item from the database',
        },
        portionSize: {
          type: DataTypes.ENUM('small', 'medium', 'large'),
          allowNull: false,
          defaultValue: 'medium',
          comment: 'Relative portion size',
        },
        quantity: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 1.0,
          comment: 'Number of servings',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Additional notes about this food item in the meal',
        },
      },
      {
        sequelize,
        modelName: 'MealItemEntry',
        tableName: 'meal_item_entries',
        timestamps: true,
        indexes: [
          { fields: ['mealEntryId'] },
          { fields: ['foodItemId'] },
        ],
      }
    );
  }

  static associate(models: any) {
    MealItemEntry.belongsTo(models.MealEntry, {
      foreignKey: 'mealEntryId',
      as: 'meal',
    });

    MealItemEntry.belongsTo(models.FoodItem, {
      foreignKey: 'foodItemId',
      as: 'foodItem',
    });
  }
}

MealItemEntry.initialize();

export default MealItemEntry;
