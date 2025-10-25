import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface FoodItemAttributes {
  id: number;
  categoryId: number;
  name: string;
  healthRating: 'green' | 'yellow' | 'red';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  cholesterol?: number;
  servingSize?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FoodItemCreationAttributes extends Optional<FoodItemAttributes, 'id'> {}

class FoodItem extends Model<FoodItemAttributes, FoodItemCreationAttributes> implements FoodItemAttributes {
  public id!: number;
  public categoryId!: number;
  public name!: string;
  public healthRating!: 'green' | 'yellow' | 'red';
  public calories?: number;
  public protein?: number;
  public carbs?: number;
  public fat?: number;
  public fiber?: number;
  public sodium?: number;
  public cholesterol?: number;
  public servingSize?: string;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    FoodItem.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        categoryId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'food_categories',
            key: 'id',
          },
        },
        name: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        healthRating: {
          type: DataTypes.ENUM('green', 'yellow', 'red'),
          allowNull: false,
          defaultValue: 'green',
          comment: 'Green=heart-healthy, Yellow=moderation, Red=avoid/limit',
        },
        calories: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Calories per serving',
        },
        protein: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Protein in grams',
        },
        carbs: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Carbohydrates in grams',
        },
        fat: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Fat in grams',
        },
        fiber: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Fiber in grams',
        },
        sodium: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Sodium in milligrams',
        },
        cholesterol: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Cholesterol in milligrams',
        },
        servingSize: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'Standard serving size (e.g., "1 cup", "3 oz")',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Additional nutritional notes or preparation suggestions',
        },
      },
      {
        sequelize,
        modelName: 'FoodItem',
        tableName: 'food_items',
        timestamps: true,
        indexes: [
          { fields: ['categoryId'] },
          { fields: ['healthRating'] },
          { fields: ['name'] },
        ],
      }
    );
  }

  static associate(models: any) {
    console.log('[FoodItem.associate] Called with models:', Object.keys(models));
    console.log('[FoodItem.associate] models.FoodCategory exists?', !!models.FoodCategory);
    console.log('[FoodItem.associate] Setting up belongsTo with FoodCategory');
    FoodItem.belongsTo(models.FoodCategory, {
      foreignKey: 'categoryId',
      as: 'category',
    });
    console.log('[FoodItem.associate] belongsTo setup complete');

    console.log('[FoodItem.associate] Setting up hasMany with MealItemEntry');
    FoodItem.hasMany(models.MealItemEntry, {
      foreignKey: 'foodItemId',
      as: 'mealEntries',
    });
    console.log('[FoodItem.associate] hasMany setup complete');
  }
}

FoodItem.initialize();

export default FoodItem;
