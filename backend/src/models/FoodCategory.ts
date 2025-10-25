import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './index';

interface FoodCategoryAttributes {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FoodCategoryCreationAttributes extends Optional<FoodCategoryAttributes, 'id'> {}

class FoodCategory extends Model<FoodCategoryAttributes, FoodCategoryCreationAttributes> implements FoodCategoryAttributes {
  public id!: number;
  public name!: string;
  public description?: string;
  public icon?: string;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    FoodCategory.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        icon: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: 'Emoji or icon identifier for the category',
        },
        sortOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Display order for categories',
        },
      },
      {
        sequelize,
        modelName: 'FoodCategory',
        tableName: 'food_categories',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    FoodCategory.hasMany(models.FoodItem, {
      foreignKey: 'categoryId',
      as: 'foodItems',
    });
  }
}

FoodCategory.initialize();

export default FoodCategory;
