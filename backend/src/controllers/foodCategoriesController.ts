import { Request, Response } from 'express';
import FoodCategory from '../models/FoodCategory';
import FoodItem from '../models/FoodItem';

/**
 * Get all food categories
 */
export const getFoodCategories = async (req: Request, res: Response) => {
  try {
    const categories = await FoodCategory.findAll({
      order: [['sortOrder', 'ASC']],
      include: [
        {
          model: FoodItem,
          as: 'foodItems',
          attributes: ['id', 'name', 'healthRating'],
        },
      ],
    });

    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching food categories:', error);
    res.status(500).json({ error: 'Failed to fetch food categories', details: error.message });
  }
};

/**
 * Get a single food category by ID
 */
export const getFoodCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await FoodCategory.findByPk(id, {
      include: [
        {
          model: FoodItem,
          as: 'foodItems',
          order: [['name', 'ASC']],
        },
      ],
    });

    if (!category) {
      return res.status(404).json({ error: 'Food category not found' });
    }

    res.json(category);
  } catch (error: any) {
    console.error('Error fetching food category:', error);
    res.status(500).json({ error: 'Failed to fetch food category', details: error.message });
  }
};

/**
 * Create a new food category
 */
export const createFoodCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, sortOrder } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await FoodCategory.create({
      name,
      description,
      icon,
      sortOrder: sortOrder || 0,
    });

    res.status(201).json(category);
  } catch (error: any) {
    console.error('Error creating food category:', error);
    res.status(500).json({ error: 'Failed to create food category', details: error.message });
  }
};

/**
 * Update a food category
 */
export const updateFoodCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, sortOrder } = req.body;

    const category = await FoodCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ error: 'Food category not found' });
    }

    await category.update({
      name: name !== undefined ? name : category.name,
      description: description !== undefined ? description : category.description,
      icon: icon !== undefined ? icon : category.icon,
      sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder,
    });

    res.json(category);
  } catch (error: any) {
    console.error('Error updating food category:', error);
    res.status(500).json({ error: 'Failed to update food category', details: error.message });
  }
};

/**
 * Delete a food category
 */
export const deleteFoodCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await FoodCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ error: 'Food category not found' });
    }

    // Check if category has food items
    const itemCount = await FoodItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with food items',
        message: `This category has ${itemCount} food items. Please reassign or delete them first.`
      });
    }

    await category.destroy();

    res.json({ message: 'Food category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting food category:', error);
    res.status(500).json({ error: 'Failed to delete food category', details: error.message });
  }
};
