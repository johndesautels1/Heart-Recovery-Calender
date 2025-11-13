import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { models } from '../models';

const { FoodItem, FoodCategory } = models;

/**
 * Get all food items with optional filters
 */
export const getFoodItems = async (req: Request, res: Response) => {
  try {
    const { categoryId, healthRating, search, limit, offset } = req.query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (healthRating) {
      where.healthRating = healthRating;
    }

    if (search) {
      where.name = {
        [Op.iLike]: `%${search}%`,
      };
    }

    const queryOptions: any = {
      where,
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodCategory,
//           as: 'category',
//           attributes: ['id', 'name', 'icon'],
//         },
//       ],
      order: [['name', 'ASC']],
    };

    if (limit) {
      queryOptions.limit = parseInt(limit as string);
    }

    if (offset) {
      queryOptions.offset = parseInt(offset as string);
    }

    const { count, rows } = await FoodItem.findAndCountAll(queryOptions);

    res.json({
      total: count,
      items: rows,
      limit: limit ? parseInt(limit as string) : null,
      offset: offset ? parseInt(offset as string) : 0,
    });
  } catch (error: any) {
    console.error('Error fetching food items:', error);
    res.status(500).json({ error: 'Failed to fetch food items', details: error.message });
  }
};

/**
 * Get food items by category
 */
export const getFoodItemsByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    const items = await FoodItem.findAll({
      where: { categoryId },
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodCategory,
//           as: 'category',
//           attributes: ['id', 'name', 'icon'],
//         },
//       ],
      order: [['name', 'ASC']],
    });

    res.json(items);
  } catch (error: any) {
    console.error('Error fetching food items by category:', error);
    res.status(500).json({ error: 'Failed to fetch food items', details: error.message });
  }
};

/**
 * Get food items by health rating
 */
export const getFoodItemsByHealthRating = async (req: Request, res: Response) => {
  try {
    const { rating } = req.params;

    if (!['green', 'yellow', 'red'].includes(rating)) {
      return res.status(400).json({ error: 'Invalid health rating. Must be green, yellow, or red.' });
    }

    const items = await FoodItem.findAll({
      where: { healthRating: rating },
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodCategory,
//           as: 'category',
//           attributes: ['id', 'name', 'icon'],
//         },
//       ],
      order: [['name', 'ASC']],
    });

    res.json(items);
  } catch (error: any) {
    console.error('Error fetching food items by health rating:', error);
    res.status(500).json({ error: 'Failed to fetch food items', details: error.message });
  }
};

/**
 * Search food items
 */
export const searchFoodItems = async (req: Request, res: Response) => {
  try {
    const { q, categoryId, healthRating } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const where: any = {
      name: {
        [Op.iLike]: `%${q}%`,
      },
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (healthRating) {
      where.healthRating = healthRating;
    }

    const items = await FoodItem.findAll({
      where,
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodCategory,
//           as: 'category',
//           attributes: ['id', 'name', 'icon'],
//         },
//       ],
      order: [['name', 'ASC']],
      limit: 50,
    });

    res.json(items);
  } catch (error: any) {
    console.error('Error searching food items:', error);
    res.status(500).json({ error: 'Failed to search food items', details: error.message });
  }
};

/**
 * Get a single food item by ID
 */
export const getFoodItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await FoodItem.findByPk(id, {
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodCategory,
//           as: 'category',
//         },
//       ],
    });

    if (!item) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    res.json(item);
  } catch (error: any) {
    console.error('Error fetching food item:', error);
    res.status(500).json({ error: 'Failed to fetch food item', details: error.message });
  }
};

/**
 * Create a new food item
 */
export const createFoodItem = async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      name,
      healthRating,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sodium,
      cholesterol,
      servingSize,
      notes,
    } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ error: 'categoryId and name are required' });
    }

    // Verify category exists
    const category = await FoodCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Food category not found' });
    }

    const item = await FoodItem.create({
      categoryId,
      name,
      healthRating: healthRating || 'green',
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sodium,
      cholesterol,
      servingSize,
      notes,
    });

    const itemWithCategory = await FoodItem.findByPk(item.id, {
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodCategory,
//           as: 'category',
//         },
//       ],
    });

    res.status(201).json(itemWithCategory);
  } catch (error: any) {
    console.error('Error creating food item:', error);
    res.status(500).json({ error: 'Failed to create food item', details: error.message });
  }
};

/**
 * Update a food item
 */
export const updateFoodItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const item = await FoodItem.findByPk(id);

    if (!item) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    // If updating categoryId, verify it exists
    if (updateData.categoryId) {
      const category = await FoodCategory.findByPk(updateData.categoryId);
      if (!category) {
        return res.status(404).json({ error: 'Food category not found' });
      }
    }

    await item.update(updateData);

    const updatedItem = await FoodItem.findByPk(id, {
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodCategory,
//           as: 'category',
//         },
//       ],
    });

    res.json(updatedItem);
  } catch (error: any) {
    console.error('Error updating food item:', error);
    res.status(500).json({ error: 'Failed to update food item', details: error.message });
  }
};

/**
 * Delete a food item
 */
export const deleteFoodItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await FoodItem.findByPk(id);

    if (!item) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    await item.destroy();

    res.json({ message: 'Food item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting food item:', error);
    res.status(500).json({ error: 'Failed to delete food item', details: error.message });
  }
};

/**
 * Get food statistics
 */
export const getFoodStats = async (req: Request, res: Response) => {
  try {
    const totalItems = await FoodItem.count();
    const greenItems = await FoodItem.count({ where: { healthRating: 'green' } });
    const yellowItems = await FoodItem.count({ where: { healthRating: 'yellow' } });
    const redItems = await FoodItem.count({ where: { healthRating: 'red' } });
    const totalCategories = await FoodCategory.count();

    const itemsByCategory = await FoodCategory.findAll({
      attributes: [
        'id',
        'name',
        'icon',
      ],
      // TEMPORARY: Removed due to assoCAItion errors
//       // include: [
//         {
//           model: FoodItem,
//           as: 'foodItems',
//           attributes: [],
//         },
//       ],
    });

    const categoryCounts = await Promise.all(
      itemsByCategory.map(async (cat: any) => {
        const count = await FoodItem.count({ where: { categoryId: cat.id } });
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          icon: cat.icon,
          itemCount: count,
        };
      })
    );

    res.json({
      totalItems,
      totalCategories,
      healthRatingBreakdown: {
        green: greenItems,
        yellow: yellowItems,
        red: redItems,
      },
      itemsByCategory: categoryCounts,
    });
  } catch (error: any) {
    console.error('Error fetching food stats:', error);
    res.status(500).json({ error: 'Failed to fetch food stats', details: error.message });
  }
};
