import MealEntry from '../models/MealEntry';

export const checkMealCompliance = async (userId: string, date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const meals = await MealEntry.findAll({
    where: {
      userId,
      timestamp: { $gte: start, $lte: end }
    }
  });
  const compliant = meals.filter(m => m.withinSpec).length;
  const total = meals.length;
  return { compliant, total };
};