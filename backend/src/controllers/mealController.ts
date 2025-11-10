import { Request, Response } from 'express';
import MealEntry from '../models/MealEntry';
import User from '../models/User';
import Medication from '../models/Medication';
import { Op } from 'sequelize';
import { sendHeartHealthAlert, sendHawkAlert } from '../services/notificationService';
import { checkFoodAgainstMedications, MedicationInteractionResult } from '../data/cardiacMedicationInteractions';

const DIETARY_LIMITS = {
  calories: 2000,
  sodium: 2300,
  cholesterol: 300,
  saturatedFat: 20
};

// Alert thresholds for heart-critical nutrients
const ALERT_THRESHOLDS = {
  warning: 80,   // 80% of daily limit
  critical: 90,  // 90% of daily limit
  exceeded: 100  // 100% of daily limit
};

/**
 * 🚨 FOOD-MEDICATION INTERACTION CHECKER
 *
 * Checks if foods in the meal interact with the user's active cardiac medications.
 * Returns warnings for frontend display and sends Hawk Alerts for severe/critical interactions.
 *
 * PROCESS:
 * 1. Load user's active medications from database
 * 2. Check food items against medication interaction database
 * 3. Format warnings for frontend UI display
 * 4. Send Hawk Alert for critical/severe interactions
 * 5. Return structured warnings (non-blocking - meal can still be saved)
 *
 * SEVERITY HANDLING:
 * - critical: Hawk Alert + detailed email/SMS + frontend red banner
 * - severe: Hawk Alert + email/SMS + frontend orange warning
 * - moderate: Frontend orange warning only
 * - mild: Frontend info message only
 *
 * @param userId - User ID to check medications for
 * @param foodItemsText - Comma-separated food items from meal
 * @returns Array of interaction warnings for frontend display
 */
interface MedicationWarning {
  medicationName: string;
  medicationCategory: string;
  severity: 'critical' | 'severe' | 'moderate' | 'mild';
  interaction: string;
  recommendation: string;
  mechanism: string;
  matchedFoods: string[];
}

async function checkMedicationInteractions(userId: number, foodItemsText: string): Promise<MedicationWarning[]> {
  try {
    if (!foodItemsText || foodItemsText.trim() === '') {
      return []; // No food items to check
    }

    // Load user's active medications
    const userMedications = await Medication.findAll({
      where: {
        userId,
        isActive: true
      }
    });

    if (userMedications.length === 0) {
      console.log('[MEDICATION-CHECK] User has no active medications');
      return []; // No medications to check against
    }

    // Get medication names for checking
    const medicationNames = userMedications.map(med => med.name);
    console.log(`[MEDICATION-CHECK] Checking food "${foodItemsText}" against ${medicationNames.length} medications: ${medicationNames.join(', ')}`);

    // Check interactions using our database
    const interactionResults = checkFoodAgainstMedications(foodItemsText, medicationNames);

    if (interactionResults.length === 0) {
      console.log('[MEDICATION-CHECK] No interactions found');
      return [];
    }

    // Format warnings for frontend
    const warnings: MedicationWarning[] = [];
    let criticalInteractions = 0;
    let severeInteractions = 0;

    for (const result of interactionResults) {
      for (const interaction of result.triggeredInteractions) {
        // Find which specific foods triggered this interaction
        const matchedFoods: string[] = [];
        const foodLower = foodItemsText.toLowerCase();
        for (const keyword of interaction.foodKeywords) {
          if (foodLower.includes(keyword)) {
            matchedFoods.push(keyword);
          }
        }

        warnings.push({
          medicationName: result.medication.genericName,
          medicationCategory: result.medication.category,
          severity: interaction.severity,
          interaction: interaction.interaction,
          recommendation: interaction.recommendation,
          mechanism: interaction.mechanism,
          matchedFoods: matchedFoods
        });

        // Count severity for Hawk Alert
        if (interaction.severity === 'critical') criticalInteractions++;
        if (interaction.severity === 'severe') severeInteractions++;
      }
    }

    console.log(`[MEDICATION-CHECK] Found ${warnings.length} interaction(s): ${criticalInteractions} critical, ${severeInteractions} severe`);

    // Send Hawk Alert for critical or severe interactions
    if (criticalInteractions > 0 || severeInteractions > 0) {
      // Load user details for alert
      const user = await User.findByPk(userId);
      if (user && user.email) {
        const severity = criticalInteractions > 0 ? 'danger' : 'warning';
        const medicationNamesList = [...new Set(warnings.map(w => `${w.medicationName} (${w.medicationCategory})`))];
        const topInteraction = warnings[0]; // Highest severity (already sorted)

        const message = criticalInteractions > 0
          ? `CRITICAL: You consumed ${topInteraction.matchedFoods.join(', ')} which has a life-threatening interaction with ${topInteraction.medicationName}.`
          : `You consumed ${topInteraction.matchedFoods.join(', ')} which interacts with ${topInteraction.medicationName}.`;

        const recommendation = topInteraction.recommendation + ' Contact your doctor immediately if you experience any unusual symptoms.';

        // Send Hawk Alert (async, non-blocking)
        sendHawkAlert(
          user.email,
          user.phoneNumber,
          'food_medication_interaction',
          severity,
          medicationNamesList,
          message,
          recommendation,
          [], // Care team emails - could be loaded from user profile
          warnings.map(w => w.matchedFoods).flat()
        ).catch(error => {
          console.error('[MEDICATION-CHECK] Error sending Hawk Alert:', error);
        });

        console.log(`[MEDICATION-CHECK] Hawk Alert sent for ${severity} food-medication interaction`);
      }
    }

    return warnings;
  } catch (error) {
    // Don't throw - we don't want interaction checks to break meal creation
    console.error('[MEDICATION-CHECK] Error checking medication interactions:', error);
    return [];
  }
}

/**
 * Get Meals with Date Filtering
 *
 * CRITICAL: This endpoint supports multiple date filtering modes to serve all three pages:
 *
 * 1. SINGLE DAY MODE (used by FoodDiaryPage in daily view):
 *    ?date=2025-01-10 → Returns meals for that specific day (00:00:00 - 23:59:59)
 *
 * 2. DATE RANGE MODE (used by FoodDiaryPage in weekly/monthly views):
 *    ?startDate=2025-01-01&endDate=2025-01-07 → Returns meals in that range
 *    Also supports legacy params: ?start=2025-01-01&end=2025-01-07
 *
 * 3. NO DATE MODE (used by MealsPage for all planned meals):
 *    No date params → Returns all meals for the user
 *
 * DATE HANDLING:
 * - All dates are normalized to full day ranges (00:00:00 - 23:59:59)
 * - This ensures meals created at any time during the day are captured
 * - Uses Sequelize Op.gte and Op.lte for inclusive range filtering
 *
 * BUG FIX HISTORY:
 * - Fixed 2025-01-10: Parameter mismatch (frontend sent startDate/endDate, backend expected start/end)
 * - Now supports both parameter names for backward compatibility
 */
export const getMeals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { date, start, end, startDate, endDate, mealType } = req.query;
    const where: any = { userId };

    // Support both 'startDate/endDate' (from frontend) and 'start/end' (legacy)
    const actualStart = (startDate || start) as string | undefined;
    const actualEnd = (endDate || end) as string | undefined;

    if (date) {
      const dayStart = new Date(date as string);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date as string);
      dayEnd.setHours(23, 59, 59, 999);
      where.timestamp = { [Op.gte]: dayStart, [Op.lte]: dayEnd };
    } else if (actualStart || actualEnd) {
      where.timestamp = {};
      if (actualStart) {
        const startDay = new Date(actualStart);
        startDay.setHours(0, 0, 0, 0);
        where.timestamp[Op.gte] = startDay;
      }
      if (actualEnd) {
        const endDay = new Date(actualEnd);
        endDay.setHours(23, 59, 59, 999);
        where.timestamp[Op.lte] = endDay;
      }
    }

    if (mealType) where.mealType = mealType;

    const meals = await MealEntry.findAll({ where, order: [['timestamp', 'DESC']] });
    console.log(`[Meals API] Found ${meals.length} meals for user ${userId} between ${actualStart || 'beginning'} and ${actualEnd || 'now'}`);
    res.json({ data: meals });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addMeal = async (req: Request, res: Response) => {
  try {
    // Use userId from body if provided (for therapists adding for patients), otherwise use authenticated user's ID
    const userId = req.body.userId || req.user?.id;
    const { userId: _, ...bodyWithoutUserId } = req.body; // Remove userId from body to avoid duplication

    const withinSpec = checkCompliance(bodyWithoutUserId);
    const mealData = { userId, ...bodyWithoutUserId, withinSpec, timestamp: bodyWithoutUserId.timestamp || new Date() };

    // 🚨 NEW: Check for food-medication interactions BEFORE creating meal
    const medicationWarnings = await checkMedicationInteractions(userId, mealData.foodItems);

    const meal = await MealEntry.create(mealData);

    // 🚨 HEART-CRITICAL: Check daily sodium and cholesterol limits after meal creation
    await checkDailyLimitsAndAlert(userId, meal.timestamp);

    // Return meal data WITH medication warnings for frontend to display
    res.status(201).json({
      ...meal.toJSON(),
      medicationWarnings: medicationWarnings.length > 0 ? medicationWarnings : undefined
    });
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDailySummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const meals = await MealEntry.findAll({
      where: { userId, timestamp: { [Op.gte]: dayStart, [Op.lte]: dayEnd } }
    });

    const totals = { calories: 0, sodium: 0, cholesterol: 0, saturatedFat: 0, totalFat: 0, fiber: 0, sugar: 0, protein: 0, carbohydrates: 0 };
    meals.forEach(meal => {
      totals.calories += meal.calories || 0;
      totals.sodium += meal.sodium || 0;
      totals.cholesterol += meal.cholesterol || 0;
      totals.saturatedFat += meal.saturatedFat || 0;
      totals.totalFat += meal.totalFat || 0;
      totals.fiber += meal.fiber || 0;
      totals.sugar += meal.sugar || 0;
      totals.protein += meal.protein || 0;
      totals.carbohydrates += meal.carbohydrates || 0;
    });

    const mealsLogged = meals.length;
    const compliantMeals = meals.filter(m => m.withinSpec).length;
    const compliancePercentage = mealsLogged > 0 ? Math.round((compliantMeals / mealsLogged) * 100) : 100;

    res.json({ date, totals, limits: DIETARY_LIMITS, mealsLogged, compliancePercentage });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCompliance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    const meals = await MealEntry.findAll({
      where: { userId, timestamp: { [Op.gte]: startDate, [Op.lte]: endDate } }
    });

    const totalMeals = meals.length;
    const compliantMeals = meals.filter(m => m.withinSpec).length;
    const complianceRate = totalMeals > 0 ? (compliantMeals / totalMeals) * 100 : 0;

    const trends = {
      sodium: { average: totalMeals > 0 ? Math.round(meals.reduce((s, m) => s + (m.sodium || 0), 0) / totalMeals) : 0, overLimitDays: 0 },
      cholesterol: { average: totalMeals > 0 ? Math.round(meals.reduce((s, m) => s + (m.cholesterol || 0), 0) / totalMeals) : 0, overLimitDays: 0 },
      saturatedFat: { average: totalMeals > 0 ? Math.round(meals.reduce((s, m) => s + (m.saturatedFat || 0), 0) / totalMeals) : 0, overLimitDays: 0 }
    };

    res.json({ totalMeals, compliantMeals, complianceRate: Math.round(complianceRate), trends });
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const meal = await MealEntry.findOne({ where: { id, userId } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json(meal);
  } catch (error) {
    console.error('Error fetching meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const meal = await MealEntry.findOne({ where: { id, userId } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    const withinSpec = checkCompliance(req.body);
    await meal.update({ ...req.body, withinSpec });
    res.json(meal);
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMealStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!status || !['planned', 'completed', 'missed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: planned, completed, or missed' });
    }

    const meal = await MealEntry.findOne({ where: { id, userId } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });

    await meal.update({ status });
    res.json(meal);
  } catch (error) {
    console.error('Error updating meal status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const meal = await MealEntry.findOne({ where: { id, userId } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    await meal.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check Per-Meal Compliance
 *
 * Determines if a single meal meets the dietary specifications for heart recovery patients.
 * Uses the "quarter rule" - each meal should contain no more than 1/4 of daily limits.
 *
 * PER-MEAL LIMITS (1/4 of daily):
 * - Sodium: ≤575mg (2300mg / 4)
 * - Cholesterol: ≤75mg (300mg / 4)
 * - Saturated Fat: ≤5g (20g / 4)
 *
 * USAGE:
 * - Called when creating/updating meals to set the 'withinSpec' flag
 * - This flag is used for compliance percentage calculations
 * - Does NOT prevent saving non-compliant meals (users can still log unhealthy meals)
 *
 * @param mealData - The meal data containing nutrition information
 * @returns true if meal meets all per-meal limits, false otherwise
 */
function checkCompliance(mealData: any): boolean {
  const sodium = mealData.sodium || 0;
  const cholesterol = mealData.cholesterol || 0;
  const saturatedFat = mealData.saturatedFat || 0;
  return sodium <= DIETARY_LIMITS.sodium / 4 && cholesterol <= DIETARY_LIMITS.cholesterol / 4 && saturatedFat <= DIETARY_LIMITS.saturatedFat / 4;
}

/**
 * 🚨 HEART-CRITICAL SAFETY FEATURE: Daily Limit Monitoring & Alerts
 *
 * Automatically checks cumulative daily sodium and cholesterol intake after each meal
 * and sends email/SMS alerts to protect heart recovery patients from dangerous levels.
 *
 * ALERT THRESHOLDS:
 * - 80% of daily limit (warning) - First notification to patient
 * - 90% of daily limit (critical) - Urgent warning
 * - 100% of daily limit (exceeded) - Critical alert
 *
 * DAILY LIMITS:
 * - Sodium: 2300mg (AHA recommendation for heart patients)
 * - Cholesterol: 300mg (Standard cardiac diet guideline)
 *
 * IMPORTANT BEHAVIOR:
 * - Called automatically after every meal creation (see addMeal function)
 * - Calculates totals for the ENTIRE DAY (00:00:00 - 23:59:59 of meal timestamp)
 * - Sends notifications via sendHeartHealthAlert (email + SMS if available)
 * - Errors are caught and logged but DO NOT block meal creation
 * - Multiple alerts can be sent per day as user approaches/exceeds limits
 *
 * @param userId - The user ID to check and notify
 * @param mealTimestamp - The timestamp of the meal just created (used to determine "today")
 */
async function checkDailyLimitsAndAlert(userId: number, mealTimestamp: Date): Promise<void> {
  try {
    // Get user info for notifications
    const user = await User.findByPk(userId);
    if (!user || !user.email) {
      console.warn('[HEART-SAFETY] Cannot send alerts: user or email not found for userId:', userId);
      return;
    }

    // Calculate today's date range (start/end of day)
    const dayStart = new Date(mealTimestamp);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(mealTimestamp);
    dayEnd.setHours(23, 59, 59, 999);

    // Query all meals for today
    const todaysMeals = await MealEntry.findAll({
      where: {
        userId,
        timestamp: { [Op.gte]: dayStart, [Op.lte]: dayEnd }
      }
    });

    // Calculate daily totals
    let totalSodium = 0;
    let totalCholesterol = 0;

    todaysMeals.forEach(meal => {
      totalSodium += meal.sodium || 0;
      totalCholesterol += meal.cholesterol || 0;
    });

    // Calculate percentages
    const sodiumPercentage = (totalSodium / DIETARY_LIMITS.sodium) * 100;
    const cholesterolPercentage = (totalCholesterol / DIETARY_LIMITS.cholesterol) * 100;

    console.log(`[HEART-SAFETY] Daily totals for user ${userId}: Sodium ${Math.round(totalSodium)}mg (${Math.round(sodiumPercentage)}%), Cholesterol ${Math.round(totalCholesterol)}mg (${Math.round(cholesterolPercentage)}%)`);

    // Send alerts for sodium if at or exceeding 80% threshold
    if (sodiumPercentage >= ALERT_THRESHOLDS.warning) {
      console.log(`[HEART-SAFETY] 🚨 Sodium alert triggered at ${Math.round(sodiumPercentage)}% of daily limit`);
      await sendHeartHealthAlert(
        user.email,
        user.phoneNumber,
        'sodium',
        totalSodium,
        DIETARY_LIMITS.sodium,
        sodiumPercentage
      );
    }

    // Send alerts for cholesterol if at or exceeding 80% threshold
    if (cholesterolPercentage >= ALERT_THRESHOLDS.warning) {
      console.log(`[HEART-SAFETY] 🚨 Cholesterol alert triggered at ${Math.round(cholesterolPercentage)}% of daily limit`);
      await sendHeartHealthAlert(
        user.email,
        user.phoneNumber,
        'cholesterol',
        totalCholesterol,
        DIETARY_LIMITS.cholesterol,
        cholesterolPercentage
      );
    }
  } catch (error) {
    // Don't throw - we don't want alerts to break meal creation
    console.error('[HEART-SAFETY] Error checking daily limits and sending alerts:', error);
  }
}
