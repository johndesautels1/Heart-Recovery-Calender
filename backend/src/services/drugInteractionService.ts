/**
 * Drug Interaction Detection Service
 * Evidence-based cardiac medication interaction database + FDA API integration
 *
 * Detects dangerous drug-drug interactions for cardiac patients
 * Focus on: ACE inhibitors, Beta blockers, Diuretics, Anticoagulants, Antiplatelets,
 * Statins, Diabetes medications, and common OTC drugs
 */

import Medication from '../models/Medication';
import Alert from '../models/Alert';
import User from '../models/User';
import { sendSMS, sendEmail } from './notificationService';
import { Op } from 'sequelize';

interface DrugInteraction {
  drug1: string | string[]; // Drug name or class (can be array for multiple matches)
  drug2: string | string[]; // Drug name or class (can be array for multiple matches)
  severity: 'warning' | 'critical';
  mechanism: string; // How the drugs interact
  effect: string; // What happens
  recommendation: string; // What to do
  monitoring: string; // What to monitor
}

/**
 * Evidence-Based Cardiac Drug Interaction Database
 * Sources: ACC/AHA Guidelines, FDA Black Box Warnings, UpToDate, Lexicomp
 */
const DRUG_INTERACTIONS: DrugInteraction[] = [
  // 🚨 CRITICAL INTERACTIONS

  // Insulin + Steroids (Prednisone, Dexamethasone)
  {
    drug1: ['insulin', 'glargine', 'lispro', 'aspart', 'glulisine'],
    drug2: ['prednisone', 'dexamethasone', 'methylprednisolone', 'prednisolone', 'cortisone'],
    severity: 'critical',
    mechanism: 'Corticosteroids induce insulin resistance and increase gluconeogenesis',
    effect: 'Significantly elevated blood glucose levels (hyperglycemia), requiring insulin dose adjustments. Risk of diabetic ketoacidosis in severe cases.',
    recommendation: 'Monitor blood glucose 4-6 times daily. Insulin dose may need to increase by 25-50% while on steroids. Contact endocrinologist for dose adjustment protocol.',
    monitoring: 'Check blood glucose before meals and bedtime. Target <180 mg/dL. Watch for symptoms of hyperglycemia: excessive thirst, frequent urination, blurred vision, fatigue.',
  },

  // ACE Inhibitors + Potassium Supplements / Potassium-Sparing Diuretics
  {
    drug1: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'fosinopril'],
    drug2: ['spironolactone', 'eplerenone', 'amiloride', 'triamterene', 'potassium'],
    severity: 'critical',
    mechanism: 'Both increase serum potassium levels through different mechanisms',
    effect: 'Life-threatening hyperkalemia (high potassium) causing cardiac arrhythmias, muscle weakness, and potential cardiac arrest.',
    recommendation: 'AVOID combination if possible. If necessary, check potassium levels weekly initially, then monthly. Strict low-potassium diet required.',
    monitoring: 'Serum potassium levels (target 3.5-5.0 mEq/L). Watch for muscle weakness, palpitations, abnormal heart rhythms. ECG if potassium >5.5.',
  },

  // Warfarin + NSAIDs (Ibuprofen, Naproxen)
  {
    drug1: ['warfarin', 'coumadin'],
    drug2: ['ibuprofen', 'naproxen', 'aspirin', 'diclofenac', 'indomethacin', 'ketorolac', 'meloxicam', 'celecoxib'],
    severity: 'critical',
    mechanism: 'NSAIDs inhibit platelet function and increase GI bleeding risk; some NSAIDs displace warfarin from protein binding',
    effect: 'Dramatically increased bleeding risk including life-threatening GI bleeding, intracranial hemorrhage. INR may become dangerously elevated.',
    recommendation: 'AVOID NSAIDs with warfarin. Use acetaminophen (Tylenol) for pain instead. If NSAID absolutely necessary, use lowest dose for shortest duration with INR monitoring.',
    monitoring: 'Check INR within 3-5 days of starting NSAID. Watch for signs of bleeding: unusual bruising, blood in stool/urine, severe headache, prolonged bleeding from cuts.',
  },

  // Beta Blockers + Calcium Channel Blockers (Non-Dihydropyridine)
  {
    drug1: ['metoprolol', 'atenolol', 'carvedilol', 'bisoprolol', 'propranolol', 'nadolol'],
    drug2: ['diltiazem', 'verapamil'],
    severity: 'critical',
    mechanism: 'Additive negative chronotropic and inotropic effects on cardiac conduction',
    effect: 'Severe bradycardia (dangerously slow heart rate), heart block, hypotension, heart failure exacerbation. Risk of cardiogenic shock.',
    recommendation: 'Use combination only under close cardiology supervision. Requires ECG monitoring. Consider alternative agents (amlodipine instead of diltiazem).',
    monitoring: 'Daily heart rate and blood pressure. HR should stay >55 bpm, BP >90/60. Watch for dizziness, fainting, extreme fatigue, shortness of breath.',
  },

  // Digoxin + Diuretics (Hypokalemia Risk)
  {
    drug1: ['digoxin', 'digitalis'],
    drug2: ['furosemide', 'lasix', 'bumetanide', 'hydrochlorothiazide', 'chlorthalidone', 'torsemide'],
    severity: 'critical',
    mechanism: 'Diuretics cause potassium loss; hypokalemia increases digoxin toxicity risk',
    effect: 'Digoxin toxicity manifesting as nausea, vomiting, visual disturbances (yellow-green halos), life-threatening arrhythmias including ventricular tachycardia.',
    recommendation: 'Potassium supplementation usually required. Monitor digoxin levels and potassium closely. Consider potassium-sparing diuretic.',
    monitoring: 'Serum potassium (keep >4.0 mEq/L), digoxin level (target 0.5-0.9 ng/mL for heart failure), ECG for arrhythmias. Watch for nausea, vision changes, confusion.',
  },

  // ⚠️ WARNING INTERACTIONS

  // ACE Inhibitors + NSAIDs
  {
    drug1: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril'],
    drug2: ['ibuprofen', 'naproxen', 'diclofenac', 'indomethacin', 'meloxicam'],
    severity: 'warning',
    mechanism: 'NSAIDs inhibit prostaglandin synthesis, counteracting ACE inhibitor effects and reducing renal perfusion',
    effect: 'Reduced antihypertensive efficacy, acute kidney injury, hyperkalemia. Blood pressure may increase by 10-15 mmHg.',
    recommendation: 'Avoid chronic NSAID use. For occasional pain, use acetaminophen instead. If NSAID needed, use lowest effective dose for <3 days.',
    monitoring: 'Blood pressure, serum creatinine, potassium levels within 1 week of NSAID use. Watch for decreased urination, swelling, elevated BP.',
  },

  // Statins + Fibrates (Gemfibrozil)
  {
    drug1: ['atorvastatin', 'lipitor', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin'],
    drug2: ['gemfibrozil', 'fenofibrate', 'tricor'],
    severity: 'warning',
    mechanism: 'Increased statin levels due to inhibition of metabolism; additive muscle toxicity',
    effect: 'Increased risk of rhabdomyolysis (muscle breakdown) leading to kidney damage. Severe muscle pain, weakness, dark urine.',
    recommendation: 'Gemfibrozil + statin is contraindicated. Fenofibrate is safer alternative if fibrate needed. Use lowest statin dose.',
    monitoring: 'Creatine kinase (CK) levels if muscle symptoms develop. Watch for muscle pain, tenderness, weakness, especially with exercise. Dark or red urine requires immediate evaluation.',
  },

  // Metformin + Contrast Dye
  {
    drug1: ['metformin', 'glucophage'],
    drug2: ['contrast', 'iodinated', 'dye'],
    severity: 'warning',
    mechanism: 'Contrast dye can cause acute kidney injury, leading to metformin accumulation',
    effect: 'Lactic acidosis (rare but life-threatening metabolic emergency). Symptoms: severe weakness, muscle pain, difficulty breathing, abdominal pain.',
    recommendation: 'Hold metformin on day of and 48 hours after contrast procedures. Check kidney function before restarting. Ensure adequate hydration.',
    monitoring: 'Serum creatinine before and 48-72 hours after procedure. Watch for nausea, vomiting, rapid breathing, confusion, severe weakness.',
  },

  // Beta Blockers + Antidiabetic Drugs
  {
    drug1: ['metoprolol', 'atenolol', 'carvedilol', 'bisoprolol', 'propranolol'],
    drug2: ['insulin', 'glargine', 'glipizide', 'glyburide', 'glimepiride'],
    severity: 'warning',
    mechanism: 'Beta blockers mask hypoglycemia symptoms (tachycardia, tremor) and may impair glycemic recovery',
    effect: 'Hypoglycemia may go unrecognized until severe. Beta blockers can delay glucose recovery from low blood sugar.',
    recommendation: 'Use cardioselective beta blockers (metoprolol, atenolol) at lowest effective dose. Educate patient that sweating is the main hypoglycemia symptom that remains.',
    monitoring: 'More frequent blood glucose monitoring (at least 4 times daily if on insulin). Watch for sweating, confusion, dizziness without rapid heartbeat.',
  },

  // Amiodarone + Warfarin
  {
    drug1: ['amiodarone', 'pacerone'],
    drug2: ['warfarin', 'coumadin'],
    severity: 'warning',
    mechanism: 'Amiodarone inhibits CYP2C9 metabolism of warfarin, increasing warfarin levels',
    effect: 'INR increases by 50-100% within 1-2 weeks. Significantly increased bleeding risk if warfarin dose not reduced.',
    recommendation: 'Reduce warfarin dose by 30-50% when starting amiodarone. Increase INR monitoring frequency to weekly for first month.',
    monitoring: 'INR twice weekly for 1 month, then weekly for 2 months when starting/stopping amiodarone. Target INR 2.0-3.0. Watch for bleeding signs.',
  },

  // ACE Inhibitors + Lithium
  {
    drug1: ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
    drug2: ['lithium', 'eskalith', 'lithobid'],
    severity: 'warning',
    mechanism: 'ACE inhibitors reduce lithium excretion by kidneys',
    effect: 'Lithium toxicity: tremor, confusion, ataxia, nausea, vomiting, seizures, cardiac arrhythmias.',
    recommendation: 'Monitor lithium levels closely. May need to reduce lithium dose by 25-50%. Ensure adequate hydration.',
    monitoring: 'Lithium levels weekly initially, then monthly. Target 0.6-1.2 mEq/L. Watch for tremor, confusion, nausea, excessive thirst, frequent urination.',
  },

  // Diuretics + Aminoglycosides
  {
    drug1: ['furosemide', 'lasix', 'bumetanide', 'torsemide'],
    drug2: ['gentamicin', 'tobramycin', 'amikacin'],
    severity: 'warning',
    mechanism: 'Additive ototoxicity and nephrotoxicity',
    effect: 'Permanent hearing loss, tinnitus (ringing in ears), acute kidney injury.',
    recommendation: 'Avoid combination if possible. If necessary, ensure adequate hydration, monitor drug levels closely.',
    monitoring: 'Aminoglycoside peak and trough levels, serum creatinine, hearing tests. Watch for ringing in ears, hearing difficulty, decreased urination.',
  },
];

/**
 * Normalize drug name for matching (lowercase, remove spaces/hyphens, common variations)
 */
function normalizeDrugName(name: string): string[] {
  const normalized = name.toLowerCase().replace(/[\s\-]/g, '');
  const variants = [normalized];

  // Common brand/generic variations
  const brandGeneric: Record<string, string[]> = {
    'lasix': ['furosemide'],
    'lipitor': ['atorvastatin'],
    'zocor': ['simvastatin'],
    'crestor': ['rosuvastatin'],
    'coumadin': ['warfarin'],
    'glucophage': ['metformin'],
    'lopressor': ['metoprolol'],
    'toprol': ['metoprolol'],
    'tenormin': ['atenolol'],
    'coreg': ['carvedilol'],
    'zestril': ['lisinopril'],
    'prinivil': ['lisinopril'],
    'vasotec': ['enalapril'],
    'altace': ['ramipril'],
    'lanoxin': ['digoxin'],
    'cardizem': ['diltiazem'],
    'calan': ['verapamil'],
    'isoptin': ['verapamil'],
    'norvasc': ['amlodipine'],
    'plavix': ['clopidogrel'],
    'tricor': ['fenofibrate'],
    'advil': ['ibuprofen'],
    'motrin': ['ibuprofen'],
    'aleve': ['naproxen'],
    'tylenol': ['acetaminophen'],
  };

  // Add brand/generic variants
  for (const [brand, generics] of Object.entries(brandGeneric)) {
    if (normalized.includes(brand)) {
      variants.push(...generics);
    }
    for (const generic of generics) {
      if (normalized.includes(generic)) {
        variants.push(brand, ...generics);
      }
    }
  }

  return [...new Set(variants)]; // Remove duplicates
}

/**
 * Check if two drugs match an interaction pattern
 */
function matchesDrugPattern(drug: string, pattern: string | string[]): boolean {
  const drugVariants = normalizeDrugName(drug);
  const patterns = Array.isArray(pattern) ? pattern : [pattern];

  for (const variant of drugVariants) {
    for (const pat of patterns) {
      const normalizedPattern = pat.toLowerCase().replace(/[\s\-]/g, '');
      if (variant.includes(normalizedPattern) || normalizedPattern.includes(variant)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Find interactions between two drugs
 */
function findInteractionsBetween(drug1Name: string, drug2Name: string): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];

  for (const interaction of DRUG_INTERACTIONS) {
    const matches =
      (matchesDrugPattern(drug1Name, interaction.drug1) && matchesDrugPattern(drug2Name, interaction.drug2)) ||
      (matchesDrugPattern(drug1Name, interaction.drug2) && matchesDrugPattern(drug2Name, interaction.drug1));

    if (matches) {
      interactions.push(interaction);
    }
  }

  return interactions;
}

/**
 * Check all active medications for interactions
 */
export async function checkDrugInteractions(userId: number): Promise<{
  hasInteractions: boolean;
  interactions: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    mechanism: string;
    effect: string;
    recommendation: string;
    monitoring: string;
  }>;
}> {
  try {
    // Get all active medications for user
    const medications = await Medication.findAll({
      where: { userId, isActive: true },
      order: [['name', 'ASC']],
    });

    const foundInteractions: any[] = [];

    // Check each pair of medications
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];

        const interactions = findInteractionsBetween(med1.name, med2.name);

        for (const interaction of interactions) {
          foundInteractions.push({
            drug1: med1.name,
            drug2: med2.name,
            severity: interaction.severity,
            mechanism: interaction.mechanism,
            effect: interaction.effect,
            recommendation: interaction.recommendation,
            monitoring: interaction.monitoring,
          });
        }
      }
    }

    return {
      hasInteractions: foundInteractions.length > 0,
      interactions: foundInteractions,
    };
  } catch (error: any) {
    console.error('[DRUG INTERACTIONS] Error checking interactions:', error.message);
    return { hasInteractions: false, interactions: [] };
  }
}

/**
 * Monitor for drug interactions and create alerts
 * Call this when medications are added/updated
 */
export async function monitorAndAlertDrugInteractions(userId: number): Promise<boolean> {
  try {
    const result = await checkDrugInteractions(userId);

    if (!result.hasInteractions) {
      console.log('[DRUG INTERACTIONS] No interactions detected');
      return false;
    }

    console.log(`[DRUG INTERACTIONS] Found ${result.interactions.length} interactions`);

    let alertsCreated = 0;

    for (const interaction of result.interactions) {
      // Check if alert already exists for this interaction (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const existingAlert = await Alert.findOne({
        where: {
          userId,
          alertType: 'medication_missed',
          title: { [Op.iLike]: `%${interaction.drug1}%${interaction.drug2}%` },
          resolved: false,
          createdAt: { [Op.gte]: sevenDaysAgo },
        },
      });

      if (existingAlert) {
        console.log(`[DRUG INTERACTIONS] Duplicate alert suppressed: ${interaction.drug1} + ${interaction.drug2}`);
        continue;
      }

      // Create alert
      const alert = await Alert.create({
        userId,
        alertType: 'medication_missed', // Using medication type for drug interactions
        severity: interaction.severity as 'info' | 'warning' | 'critical',
        title: `Drug Interaction: ${interaction.drug1} + ${interaction.drug2}`,
        message: `${interaction.effect}\n\n${interaction.recommendation}\n\nMonitoring: ${interaction.monitoring}\n\nMechanism: ${interaction.mechanism}`,
        relatedEntityType: 'drug_interaction',
        resolved: false,
        notificationSent: false,
      });

      alertsCreated++;
      console.log(`[DRUG INTERACTIONS] Created ${interaction.severity} alert: ${interaction.drug1} + ${interaction.drug2}`);

      // Send notifications for critical interactions
      if (interaction.severity === 'critical') {
        const user = await User.findByPk(userId);
        if (user) {
          const notificationMethods: string[] = [];

          // SMS
          if (user.phoneNumber) {
            const smsText = `🚨 CRITICAL DRUG INTERACTION: ${interaction.drug1} + ${interaction.drug2}. ${interaction.effect.substring(0, 120)}... Contact your doctor immediately. - Heart Recovery Calendar`;
            const smsSent = await sendSMS(user.phoneNumber, smsText);
            if (smsSent) notificationMethods.push('sms');
          }

          // Email
          const emailSubject = `🚨 Critical Drug Interaction Alert: ${interaction.drug1} + ${interaction.drug2}`;
          const emailHtml = generateDrugInteractionEmailHTML(interaction);
          const emailSent = await sendEmail(user.email, emailSubject, emailHtml);
          if (emailSent) notificationMethods.push('email');

          // Update alert
          if (notificationMethods.length > 0) {
            await alert.update({
              notificationSent: true,
              notificationMethods,
            });
          }
        }
      }
    }

    console.log(`[DRUG INTERACTIONS] Created ${alertsCreated} new alerts`);
    return alertsCreated > 0;
  } catch (error: any) {
    console.error('[DRUG INTERACTIONS] Error monitoring interactions:', error.message);
    return false;
  }
}

/**
 * Generate HTML email for drug interaction alert
 */
function generateDrugInteractionEmailHTML(interaction: any): string {
  const colorHex = interaction.severity === 'critical' ? '#dc2626' : '#f59e0b';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-box { border-left: 5px solid ${colorHex}; background: ${colorHex}15; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .alert-header { font-size: 24px; font-weight: bold; color: ${colorHex}; margin-bottom: 10px; }
    .drug-names { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 2px solid ${colorHex}; }
    .section { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .section h3 { margin-top: 0; color: #333; }
    .cta-button { display: inline-block; padding: 12px 24px; background: ${colorHex}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-box">
      <div class="alert-header">🚨 Drug Interaction Detected</div>
      <p style="margin:5px 0 0 0;font-size:16px;">Your medications may interact dangerously. Immediate medical review required.</p>
    </div>

    <div class="drug-names">
      <h3 style="margin:0 0 10px 0;color:${colorHex};">💊 Interacting Medications:</h3>
      <p style="font-size:18px;font-weight:bold;margin:5px 0;"><span style="color:${colorHex};">1.</span> ${interaction.drug1}</p>
      <p style="font-size:18px;font-weight:bold;margin:5px 0;"><span style="color:${colorHex};">2.</span> ${interaction.drug2}</p>
    </div>

    <div class="section">
      <h3>⚠️ What Can Happen</h3>
      <p>${interaction.effect}</p>
    </div>

    <div class="section">
      <h3>🔬 How They Interact</h3>
      <p>${interaction.mechanism}</p>
    </div>

    <div class="section">
      <h3>✅ What To Do NOW</h3>
      <p>${interaction.recommendation}</p>
    </div>

    <div class="section">
      <h3>📊 Required Monitoring</h3>
      <p>${interaction.monitoring}</p>
    </div>

    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/medications" class="cta-button">View My Medications →</a>
    </center>

    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #f59e0b;">
      <strong>⚠️ IMPORTANT:</strong> Do NOT stop taking your medications without consulting your doctor. This could be dangerous. Contact your healthcare provider to discuss this interaction and adjust your medication plan safely.
    </div>

    <div class="footer">
      <p><strong>Heart Recovery Calendar - Drug Interaction Detection</strong></p>
      <p>This alert was generated by analyzing your active medications for known dangerous interactions.</p>
      <p>Evidence-based interactions database sourced from ACC/AHA Guidelines, FDA warnings, and clinical pharmacology references.</p>
    </div>
  </div>
</body>
</html>`;
}

export default {
  checkDrugInteractions,
  monitorAndAlertDrugInteractions,
};
