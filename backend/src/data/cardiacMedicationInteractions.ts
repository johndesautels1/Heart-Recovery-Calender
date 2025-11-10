/**
 * Cardiac Medication-Food Interaction Database
 *
 * Contains comprehensive interactions between cardiac medications and foods
 * for heart recovery patients. Each interaction includes severity level and
 * specific guidance for patient safety.
 *
 * SEVERITY LEVELS:
 * - 'critical': Life-threatening interaction, immediate medical attention required
 * - 'severe': Dangerous interaction, contact doctor today
 * - 'moderate': Significant interaction, discuss with doctor at next visit
 * - 'mild': Minor interaction, be aware but not urgent
 */

export interface FoodInteraction {
  foodKeywords: string[]; // Keywords to match in meal foodItems (lowercase)
  interaction: string; // What happens when combined
  severity: 'critical' | 'severe' | 'moderate' | 'mild';
  recommendation: string; // What patient should do
  mechanism: string; // Why this interaction occurs (for education)
}

export interface CardiacMedication {
  genericName: string;
  brandNames: string[]; // Common brand names
  category: string; // Drug class
  foodInteractions: FoodInteraction[];
  generalGuidance: string; // Overall dietary advice for this medication
}

/**
 * Comprehensive Cardiac Medication Database
 * Focused on medications commonly prescribed for heart disease, heart failure,
 * hypertension, and post-cardiac surgery recovery
 */
export const CARDIAC_MEDICATIONS: CardiacMedication[] = [
  // ==================== BLOOD THINNERS (ANTICOAGULANTS) ====================
  {
    genericName: 'Warfarin',
    brandNames: ['Coumadin', 'Jantoven'],
    category: 'Anticoagulant (Blood Thinner)',
    generalGuidance: 'Maintain consistent vitamin K intake. Avoid large amounts of vitamin K-rich foods.',
    foodInteractions: [
      {
        foodKeywords: ['kale', 'spinach', 'collard', 'turnip green', 'mustard green', 'swiss chard', 'parsley', 'cilantro', 'basil'],
        interaction: 'High vitamin K content can reduce Warfarin effectiveness, increasing clot risk',
        severity: 'severe',
        recommendation: 'Limit dark leafy greens or maintain very consistent intake. Consult your doctor before changing diet.',
        mechanism: 'Vitamin K reverses Warfarin\'s anticoagulant effect by promoting clotting factors.'
      },
      {
        foodKeywords: ['broccoli', 'brussels sprout', 'cabbage', 'asparagus', 'green bean'],
        interaction: 'Moderate vitamin K can affect Warfarin levels',
        severity: 'moderate',
        recommendation: 'Keep intake consistent. Don\'t suddenly increase or decrease these vegetables.',
        mechanism: 'Vitamin K interferes with Warfarin\'s mechanism of preventing blood clots.'
      },
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'Increases Warfarin levels, raising bleeding risk',
        severity: 'severe',
        recommendation: 'AVOID grapefruit completely while on Warfarin.',
        mechanism: 'Grapefruit inhibits enzymes that break down Warfarin, causing dangerous accumulation.'
      },
      {
        foodKeywords: ['cranberry', 'cranberry juice'],
        interaction: 'May increase bleeding risk when combined with Warfarin',
        severity: 'moderate',
        recommendation: 'Limit cranberry products. Discuss with doctor if you regularly consume them.',
        mechanism: 'Cranberry may enhance Warfarin\'s anticoagulant effect.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine', 'liquor', 'vodka', 'whiskey', 'cocktail'],
        interaction: 'Increases bleeding risk and affects Warfarin metabolism',
        severity: 'severe',
        recommendation: 'Limit alcohol to 1 drink/day or avoid completely. Never binge drink.',
        mechanism: 'Alcohol impairs blood clotting and alters liver metabolism of Warfarin.'
      },
      {
        foodKeywords: ['liver', 'pate'],
        interaction: 'Extremely high vitamin K content can dramatically reduce Warfarin effectiveness',
        severity: 'critical',
        recommendation: 'AVOID liver and organ meats completely.',
        mechanism: 'Liver contains exceptionally high vitamin K levels that counteract Warfarin.'
      }
    ]
  },

  // ==================== BETA-BLOCKERS ====================
  {
    genericName: 'Metoprolol',
    brandNames: ['Lopressor', 'Toprol-XL'],
    category: 'Beta-Blocker',
    generalGuidance: 'Take with food to reduce side effects. Avoid sudden changes in diet.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'May increase Metoprolol levels, causing excessive heart rate lowering',
        severity: 'moderate',
        recommendation: 'Avoid grapefruit and grapefruit juice.',
        mechanism: 'Grapefruit inhibits enzymes that metabolize Metoprolol.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine', 'liquor'],
        interaction: 'Enhances blood pressure lowering, may cause dangerous hypotension',
        severity: 'severe',
        recommendation: 'Limit alcohol. Never drink excessively.',
        mechanism: 'Both alcohol and beta-blockers lower blood pressure; combined effect can be dangerous.'
      },
      {
        foodKeywords: ['coffee', 'espresso', 'energy drink', 'caffeine', 'red bull', 'monster'],
        interaction: 'Caffeine may counteract beta-blocker effects on heart rate',
        severity: 'mild',
        recommendation: 'Limit caffeine to 1-2 cups/day. Avoid energy drinks.',
        mechanism: 'Caffeine stimulates heart rate while beta-blockers slow it down.'
      }
    ]
  },

  {
    genericName: 'Carvedilol',
    brandNames: ['Coreg', 'Coreg CR'],
    category: 'Beta-Blocker',
    generalGuidance: 'Take with food to slow absorption and reduce side effects.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'Significantly increases Carvedilol levels, may cause severe hypotension',
        severity: 'severe',
        recommendation: 'AVOID grapefruit completely.',
        mechanism: 'Grapefruit dramatically increases Carvedilol absorption and blood levels.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine', 'liquor'],
        interaction: 'Excessive blood pressure lowering, dizziness, fainting risk',
        severity: 'severe',
        recommendation: 'Avoid alcohol or limit to occasional single drink.',
        mechanism: 'Combined vasodilation effect can cause dangerous hypotension.'
      }
    ]
  },

  {
    genericName: 'Atenolol',
    brandNames: ['Tenormin'],
    category: 'Beta-Blocker',
    generalGuidance: 'Can be taken with or without food, but be consistent.',
    foodInteractions: [
      {
        foodKeywords: ['orange', 'orange juice'],
        interaction: 'Orange juice may reduce Atenolol absorption by up to 50%',
        severity: 'moderate',
        recommendation: 'Avoid taking Atenolol with orange juice. Wait 2-4 hours between.',
        mechanism: 'Orange juice inhibits drug transporters needed for Atenolol absorption.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine'],
        interaction: 'Enhanced blood pressure lowering effect',
        severity: 'moderate',
        recommendation: 'Limit alcohol consumption.',
        mechanism: 'Additive hypotensive effects.'
      }
    ]
  },

  // ==================== ACE INHIBITORS ====================
  {
    genericName: 'Lisinopril',
    brandNames: ['Prinivil', 'Zestril'],
    category: 'ACE Inhibitor',
    generalGuidance: 'Limit potassium intake. Can be taken with or without food.',
    foodInteractions: [
      {
        foodKeywords: ['banana', 'avocado', 'potato', 'sweet potato', 'tomato', 'tomato sauce', 'spinach', 'beans', 'lentil', 'yogurt', 'salmon', 'tuna'],
        interaction: 'High potassium foods can cause dangerous hyperkalemia (high blood potassium)',
        severity: 'severe',
        recommendation: 'Limit high-potassium foods. Get regular blood potassium tests.',
        mechanism: 'ACE inhibitors reduce potassium excretion; excess dietary potassium can cause cardiac arrhythmias.'
      },
      {
        foodKeywords: ['salt substitute', 'lite salt', 'nu-salt', 'potassium chloride'],
        interaction: 'Salt substitutes contain potassium and can cause life-threatening hyperkalemia',
        severity: 'critical',
        recommendation: 'NEVER use salt substitutes with ACE inhibitors. Use regular salt in moderation.',
        mechanism: 'Salt substitutes are pure potassium chloride, dramatically raising potassium levels.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine'],
        interaction: 'Excessive blood pressure lowering, increased dizziness',
        severity: 'moderate',
        recommendation: 'Limit alcohol to 1 drink per day.',
        mechanism: 'Combined hypotensive effect.'
      }
    ]
  },

  {
    genericName: 'Enalapril',
    brandNames: ['Vasotec'],
    category: 'ACE Inhibitor',
    generalGuidance: 'Limit potassium-rich foods. Avoid salt substitutes.',
    foodInteractions: [
      {
        foodKeywords: ['banana', 'avocado', 'potato', 'sweet potato', 'beans', 'lentil', 'salmon', 'tuna', 'yogurt', 'milk'],
        interaction: 'High potassium can lead to dangerous heart arrhythmias',
        severity: 'severe',
        recommendation: 'Moderate potassium intake. Regular blood tests required.',
        mechanism: 'ACE inhibitors prevent potassium excretion by the kidneys.'
      },
      {
        foodKeywords: ['salt substitute', 'lite salt', 'no-salt'],
        interaction: 'Extremely dangerous potassium overload',
        severity: 'critical',
        recommendation: 'NEVER use potassium-based salt substitutes.',
        mechanism: 'Direct potassium chloride intake with impaired potassium excretion.'
      }
    ]
  },

  // ==================== DIURETICS (WATER PILLS) ====================
  {
    genericName: 'Furosemide',
    brandNames: ['Lasix'],
    category: 'Loop Diuretic',
    generalGuidance: 'May need potassium supplements. Limit sodium. Take in morning to avoid nighttime urination.',
    foodInteractions: [
      {
        foodKeywords: ['licorice', 'black licorice'],
        interaction: 'Causes dangerous potassium loss and sodium retention',
        severity: 'critical',
        recommendation: 'AVOID licorice completely.',
        mechanism: 'Licorice mimics aldosterone, worsening electrolyte imbalances caused by diuretics.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine'],
        interaction: 'Increased dehydration and blood pressure changes',
        severity: 'moderate',
        recommendation: 'Limit alcohol, especially on hot days.',
        mechanism: 'Both alcohol and Furosemide cause fluid loss and dehydration.'
      },
      {
        foodKeywords: ['salt', 'sodium', 'salty', 'chips', 'pretzels', 'pickles', 'canned soup', 'deli meat'],
        interaction: 'High sodium reduces diuretic effectiveness and causes fluid retention',
        severity: 'severe',
        recommendation: 'Strict low-sodium diet required (less than 2000mg/day).',
        mechanism: 'Sodium causes water retention, counteracting the diuretic effect.'
      }
    ]
  },

  {
    genericName: 'Spironolactone',
    brandNames: ['Aldactone'],
    category: 'Potassium-Sparing Diuretic',
    generalGuidance: 'AVOID potassium supplements and high-potassium foods.',
    foodInteractions: [
      {
        foodKeywords: ['banana', 'avocado', 'potato', 'sweet potato', 'tomato', 'beans', 'lentil', 'spinach', 'salmon', 'yogurt'],
        interaction: 'Dangerous hyperkalemia (high potassium) risk',
        severity: 'critical',
        recommendation: 'LIMIT high-potassium foods. Regular blood potassium monitoring essential.',
        mechanism: 'Spironolactone prevents potassium excretion; dietary potassium accumulates dangerously.'
      },
      {
        foodKeywords: ['salt substitute', 'lite salt', 'potassium chloride'],
        interaction: 'Life-threatening cardiac arrhythmias from potassium overload',
        severity: 'critical',
        recommendation: 'NEVER use salt substitutes. This combination can be fatal.',
        mechanism: 'Direct potassium intake with medication that retains potassium = extreme hyperkalemia.'
      },
      {
        foodKeywords: ['licorice', 'black licorice'],
        interaction: 'Reduces Spironolactone effectiveness',
        severity: 'moderate',
        recommendation: 'Avoid licorice products.',
        mechanism: 'Licorice has opposite hormonal effects to Spironolactone.'
      }
    ]
  },

  // ==================== STATINS (CHOLESTEROL MEDICATIONS) ====================
  {
    genericName: 'Atorvastatin',
    brandNames: ['Lipitor'],
    category: 'Statin',
    generalGuidance: 'Can be taken any time of day with or without food.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'Dramatically increases statin levels, causing muscle damage (rhabdomyolysis) risk',
        severity: 'critical',
        recommendation: 'AVOID grapefruit completely. Risk of serious muscle breakdown.',
        mechanism: 'Grapefruit blocks enzyme that metabolizes statins, causing dangerous accumulation.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine', 'liquor'],
        interaction: 'Increased risk of liver damage when combined with statins',
        severity: 'moderate',
        recommendation: 'Limit alcohol to 1-2 drinks per week. Avoid heavy drinking.',
        mechanism: 'Both alcohol and statins are processed by the liver; combined use increases hepatotoxicity.'
      }
    ]
  },

  {
    genericName: 'Simvastatin',
    brandNames: ['Zocor'],
    category: 'Statin',
    generalGuidance: 'Take in the evening. Avoid grapefruit.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'SEVERE muscle damage risk - potentially life-threatening rhabdomyolysis',
        severity: 'critical',
        recommendation: 'NEVER consume grapefruit with Simvastatin. Most dangerous statin-grapefruit interaction.',
        mechanism: 'Grapefruit increases Simvastatin blood levels by up to 16-fold, causing muscle breakdown.'
      },
      {
        foodKeywords: ['pomelo', 'seville orange', 'tangelo'],
        interaction: 'Similar enzyme inhibition as grapefruit, increases statin levels',
        severity: 'severe',
        recommendation: 'Avoid these citrus fruits.',
        mechanism: 'Contains same enzyme inhibitors as grapefruit.'
      }
    ]
  },

  {
    genericName: 'Rosuvastatin',
    brandNames: ['Crestor'],
    category: 'Statin',
    generalGuidance: 'Can be taken any time. Less affected by grapefruit than other statins but still avoid.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'Increases statin levels, muscle damage risk',
        severity: 'moderate',
        recommendation: 'Avoid grapefruit. While less affected than other statins, still risky.',
        mechanism: 'Grapefruit inhibits statin metabolism.'
      }
    ]
  },

  // ==================== CALCIUM CHANNEL BLOCKERS ====================
  {
    genericName: 'Amlodipine',
    brandNames: ['Norvasc'],
    category: 'Calcium Channel Blocker',
    generalGuidance: 'Can be taken with or without food.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'Increases amlodipine levels, causing excessive blood pressure lowering',
        severity: 'severe',
        recommendation: 'AVOID grapefruit.',
        mechanism: 'Grapefruit increases amlodipine absorption and blood levels.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine'],
        interaction: 'Enhanced blood pressure lowering, dizziness, fainting',
        severity: 'moderate',
        recommendation: 'Limit alcohol consumption.',
        mechanism: 'Combined hypotensive effect.'
      }
    ]
  },

  {
    genericName: 'Diltiazem',
    brandNames: ['Cardizem', 'Tiazac'],
    category: 'Calcium Channel Blocker',
    generalGuidance: 'Take before meals or at bedtime.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'Significantly increases drug levels, severe hypotension risk',
        severity: 'critical',
        recommendation: 'NEVER consume grapefruit with Diltiazem.',
        mechanism: 'Grapefruit can triple Diltiazem blood levels.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine'],
        interaction: 'Excessive blood pressure drop, dizziness',
        severity: 'moderate',
        recommendation: 'Avoid or limit alcohol.',
        mechanism: 'Additive hypotensive effects.'
      }
    ]
  },

  // ==================== DIGOXIN ====================
  {
    genericName: 'Digoxin',
    brandNames: ['Lanoxin', 'Digitek'],
    category: 'Cardiac Glycoside',
    generalGuidance: 'Take on empty stomach when possible. Very narrow therapeutic window - careful monitoring required.',
    foodInteractions: [
      {
        foodKeywords: ['licorice', 'black licorice'],
        interaction: 'Causes potassium loss, increasing Digoxin toxicity risk',
        severity: 'critical',
        recommendation: 'NEVER consume licorice with Digoxin. Can cause fatal arrhythmias.',
        mechanism: 'Low potassium (from licorice) makes heart more sensitive to Digoxin toxicity.'
      },
      {
        foodKeywords: ['fiber supplement', 'psyllium', 'metamucil', 'bran', 'oat bran'],
        interaction: 'High fiber reduces Digoxin absorption',
        severity: 'moderate',
        recommendation: 'Take Digoxin 2 hours before or after high-fiber meals/supplements.',
        mechanism: 'Fiber binds to Digoxin in the gut, preventing absorption.'
      },
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'May increase Digoxin levels unpredictably',
        severity: 'moderate',
        recommendation: 'Avoid grapefruit or maintain very consistent intake.',
        mechanism: 'Grapefruit affects drug transporters that handle Digoxin.'
      }
    ]
  },

  // ==================== ASPIRIN ====================
  {
    genericName: 'Aspirin',
    brandNames: ['Bayer', 'Ecotrin', 'Bufferin'],
    category: 'Antiplatelet Agent',
    generalGuidance: 'Take with food to reduce stomach irritation.',
    foodInteractions: [
      {
        foodKeywords: ['alcohol', 'beer', 'wine', 'liquor'],
        interaction: 'Increased bleeding risk and stomach irritation',
        severity: 'severe',
        recommendation: 'Avoid alcohol. Risk of gastrointestinal bleeding.',
        mechanism: 'Both aspirin and alcohol irritate stomach lining and impair clotting.'
      },
      {
        foodKeywords: ['ginger', 'garlic supplement', 'fish oil', 'omega-3', 'vitamin e'],
        interaction: 'Enhanced antiplatelet effect, increased bleeding risk',
        severity: 'moderate',
        recommendation: 'Discuss supplements with doctor. May need to avoid.',
        mechanism: 'Additive antiplatelet effects increase bleeding risk.'
      }
    ]
  },

  // ==================== CLOPIDOGREL ====================
  {
    genericName: 'Clopidogrel',
    brandNames: ['Plavix'],
    category: 'Antiplatelet Agent',
    generalGuidance: 'Can be taken with or without food. Avoid grapefruit.',
    foodInteractions: [
      {
        foodKeywords: ['grapefruit', 'grapefruit juice'],
        interaction: 'MAY reduce Clopidogrel effectiveness, increasing clot risk',
        severity: 'moderate',
        recommendation: 'Avoid grapefruit to ensure consistent medication effect.',
        mechanism: 'Grapefruit may interfere with activation of Clopidogrel.'
      },
      {
        foodKeywords: ['alcohol', 'beer', 'wine'],
        interaction: 'Increased bleeding risk',
        severity: 'moderate',
        recommendation: 'Limit alcohol consumption.',
        mechanism: 'Combined antiplatelet effects.'
      }
    ]
  }
];

/**
 * Helper function to find medications by name (generic or brand)
 */
export function findMedicationByName(medicationName: string): CardiacMedication | undefined {
  const searchTerm = medicationName.toLowerCase().trim();
  return CARDIAC_MEDICATIONS.find(med =>
    med.genericName.toLowerCase() === searchTerm ||
    med.brandNames.some(brand => brand.toLowerCase() === searchTerm)
  );
}

/**
 * Check if food items contain interaction keywords
 */
export function checkFoodAgainstInteractions(
  foodItemsText: string,
  interactions: FoodInteraction[]
): FoodInteraction[] {
  const foodLower = foodItemsText.toLowerCase();
  const triggeredInteractions: FoodInteraction[] = [];

  for (const interaction of interactions) {
    // Check if any of the interaction keywords appear in the food text
    const hasMatch = interaction.foodKeywords.some(keyword => foodLower.includes(keyword));
    if (hasMatch) {
      triggeredInteractions.push(interaction);
    }
  }

  // Sort by severity (critical first, then severe, moderate, mild)
  const severityOrder = { critical: 0, severe: 1, moderate: 2, mild: 3 };
  triggeredInteractions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return triggeredInteractions;
}

/**
 * Check food items against a list of user medications
 * Returns all triggered interactions grouped by medication
 */
export interface MedicationInteractionResult {
  medication: CardiacMedication;
  triggeredInteractions: FoodInteraction[];
}

export function checkFoodAgainstMedications(
  foodItemsText: string,
  userMedications: string[]
): MedicationInteractionResult[] {
  const results: MedicationInteractionResult[] = [];

  for (const medName of userMedications) {
    const medication = findMedicationByName(medName);
    if (!medication) continue;

    const triggeredInteractions = checkFoodAgainstInteractions(foodItemsText, medication.foodInteractions);
    if (triggeredInteractions.length > 0) {
      results.push({ medication, triggeredInteractions });
    }
  }

  // Sort by highest severity interaction
  const severityOrder = { critical: 0, severe: 1, moderate: 2, mild: 3 };
  results.sort((a, b) => {
    const aSeverity = severityOrder[a.triggeredInteractions[0].severity];
    const bSeverity = severityOrder[b.triggeredInteractions[0].severity];
    return aSeverity - bSeverity;
  });

  return results;
}
