// Comprehensive medication database with common heart medications
// Data compiled from FDA, WHO, and international pharmaceutical registries

export interface SideEffect {
  effect: string;
  severity: 'critical' | 'warning' | 'mild';  // critical = red flag, warning = yellow flag
  affectsTherapy: boolean;  // Does this affect physical therapy?
}

export interface MedicationInfo {
  name: string;
  genericName?: string;
  brandNames?: string[];
  commonDosages: string[];
  commonFrequencies: string[];
  category: string;
  description?: string;
  sideEffects?: SideEffect[];
  therapyWarnings?: string[];  // Specific warnings for physical therapy
}

export const MEDICATION_DATABASE: MedicationInfo[] = [
  // ACE Inhibitors
  {
    name: 'Lisinopril',
    brandNames: ['Prinivil', 'Zestril'],
    commonDosages: ['2.5mg', '5mg', '10mg', '20mg', '30mg', '40mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'ACE Inhibitor',
    description: 'Used to treat high blood pressure and heart failure',
    sideEffects: [
      { effect: 'Dizziness', severity: 'critical', affectsTherapy: true },
      { effect: 'Orthostatic hypotension', severity: 'critical', affectsTherapy: true },
      { effect: 'Fatigue', severity: 'warning', affectsTherapy: true },
      { effect: 'Dry cough', severity: 'mild', affectsTherapy: false },
      { effect: 'Headache', severity: 'mild', affectsTherapy: false }
    ],
    therapyWarnings: ['Monitor for dizziness during position changes', 'Check blood pressure before exercise', 'May affect exercise tolerance']
  },
  {
    name: 'Enalapril',
    brandNames: ['Vasotec'],
    commonDosages: ['2.5mg', '5mg', '10mg', '20mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'ACE Inhibitor'
  },
  {
    name: 'Ramipril',
    brandNames: ['Altace'],
    commonDosages: ['1.25mg', '2.5mg', '5mg', '10mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'ACE Inhibitor'
  },

  // Beta Blockers
  {
    name: 'Metoprolol',
    brandNames: ['Lopressor', 'Toprol-XL'],
    commonDosages: ['25mg', '50mg', '100mg', '200mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'Beta Blocker',
    description: 'Used to treat high blood pressure, chest pain, and heart failure',
    sideEffects: [
      { effect: 'Dizziness', severity: 'critical', affectsTherapy: true },
      { effect: 'Fatigue', severity: 'critical', affectsTherapy: true },
      { effect: 'Bradycardia (slow heart rate)', severity: 'critical', affectsTherapy: true },
      { effect: 'Orthostatic hypotension', severity: 'critical', affectsTherapy: true },
      { effect: 'Shortness of breath', severity: 'warning', affectsTherapy: true },
      { effect: 'Cold extremities', severity: 'warning', affectsTherapy: true }
    ],
    therapyWarnings: ['Monitor heart rate - should not drop below 50 bpm', 'Reduce exercise intensity if HR response is blunted', 'Watch for excessive fatigue during activity']
  },
  {
    name: 'Atenolol',
    brandNames: ['Tenormin'],
    commonDosages: ['25mg', '50mg', '100mg'],
    commonFrequencies: ['Once daily'],
    category: 'Beta Blocker',
    sideEffects: [
      { effect: 'Fatigue', severity: 'critical', affectsTherapy: true },
      { effect: 'Dizziness', severity: 'critical', affectsTherapy: true },
      { effect: 'Bradycardia', severity: 'critical', affectsTherapy: true },
      { effect: 'Cold extremities', severity: 'warning', affectsTherapy: true }
    ],
    therapyWarnings: ['HR response to exercise will be reduced', 'Monitor for excessive fatigue']
  },
  {
    name: 'Carvedilol',
    brandNames: ['Coreg'],
    commonDosages: ['3.125mg', '6.25mg', '12.5mg', '25mg'],
    commonFrequencies: ['Twice daily'],
    category: 'Beta Blocker',
    sideEffects: [
      { effect: 'Dizziness', severity: 'critical', affectsTherapy: true },
      { effect: 'Orthostatic hypotension', severity: 'critical', affectsTherapy: true },
      { effect: 'Fatigue', severity: 'critical', affectsTherapy: true },
      { effect: 'Bradycardia', severity: 'critical', affectsTherapy: true }
    ],
    therapyWarnings: ['High risk of orthostatic hypotension - stand slowly', 'Monitor BP before and during exercise']
  },
  {
    name: 'Bisoprolol',
    brandNames: ['Zebeta'],
    commonDosages: ['2.5mg', '5mg', '10mg'],
    commonFrequencies: ['Once daily'],
    category: 'Beta Blocker'
  },

  // Calcium Channel Blockers
  {
    name: 'Amlodipine',
    brandNames: ['Norvasc'],
    commonDosages: ['2.5mg', '5mg', '10mg'],
    commonFrequencies: ['Once daily'],
    category: 'Calcium Channel Blocker',
    description: 'Used to treat high blood pressure and chest pain'
  },
  {
    name: 'Diltiazem',
    brandNames: ['Cardizem', 'Tiazac'],
    commonDosages: ['120mg', '180mg', '240mg', '300mg', '360mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'Calcium Channel Blocker'
  },
  {
    name: 'Nifedipine',
    brandNames: ['Procardia', 'Adalat'],
    commonDosages: ['30mg', '60mg', '90mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'Calcium Channel Blocker'
  },

  // Anticoagulants / Antiplatelets
  {
    name: 'Aspirin',
    brandNames: ['Bayer', 'Ecotrin'],
    commonDosages: ['81mg', '162mg', '325mg'],
    commonFrequencies: ['Once daily'],
    category: 'Antiplatelet',
    description: 'Low-dose aspirin for heart attack and stroke prevention'
  },
  {
    name: 'Clopidogrel',
    brandNames: ['Plavix'],
    commonDosages: ['75mg'],
    commonFrequencies: ['Once daily'],
    category: 'Antiplatelet'
  },
  {
    name: 'Warfarin',
    brandNames: ['Coumadin'],
    commonDosages: ['1mg', '2mg', '2.5mg', '3mg', '4mg', '5mg', '6mg', '7.5mg', '10mg'],
    commonFrequencies: ['Once daily'],
    category: 'Anticoagulant'
  },
  {
    name: 'Apixaban',
    brandNames: ['Eliquis'],
    commonDosages: ['2.5mg', '5mg'],
    commonFrequencies: ['Twice daily'],
    category: 'Anticoagulant'
  },
  {
    name: 'Rivaroxaban',
    brandNames: ['Xarelto'],
    commonDosages: ['10mg', '15mg', '20mg'],
    commonFrequencies: ['Once daily'],
    category: 'Anticoagulant'
  },

  // Diuretics
  {
    name: 'Furosemide',
    brandNames: ['Lasix'],
    commonDosages: ['20mg', '40mg', '80mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'Diuretic',
    description: 'Water pill used to reduce fluid retention',
    sideEffects: [
      { effect: 'Orthostatic hypotension', severity: 'critical', affectsTherapy: true },
      { effect: 'Dizziness', severity: 'critical', affectsTherapy: true },
      { effect: 'Dehydration', severity: 'critical', affectsTherapy: true },
      { effect: 'Electrolyte imbalance', severity: 'critical', affectsTherapy: true },
      { effect: 'Muscle weakness', severity: 'warning', affectsTherapy: true },
      { effect: 'Muscle cramps', severity: 'warning', affectsTherapy: true }
    ],
    therapyWarnings: ['High risk of dehydration - ensure adequate hydration', 'Monitor for muscle weakness/cramps', 'Check blood pressure before exercise', 'Stand slowly to prevent falls']
  },
  {
    name: 'Hydrochlorothiazide',
    brandNames: ['Microzide'],
    commonDosages: ['12.5mg', '25mg', '50mg'],
    commonFrequencies: ['Once daily'],
    category: 'Diuretic'
  },
  {
    name: 'Spironolactone',
    brandNames: ['Aldactone'],
    commonDosages: ['25mg', '50mg', '100mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'Diuretic'
  },

  // Statins (Cholesterol)
  {
    name: 'Atorvastatin',
    brandNames: ['Lipitor'],
    commonDosages: ['10mg', '20mg', '40mg', '80mg'],
    commonFrequencies: ['Once daily'],
    category: 'Statin',
    description: 'Used to lower cholesterol'
  },
  {
    name: 'Simvastatin',
    brandNames: ['Zocor'],
    commonDosages: ['5mg', '10mg', '20mg', '40mg', '80mg'],
    commonFrequencies: ['Once daily'],
    category: 'Statin'
  },
  {
    name: 'Rosuvastatin',
    brandNames: ['Crestor'],
    commonDosages: ['5mg', '10mg', '20mg', '40mg'],
    commonFrequencies: ['Once daily'],
    category: 'Statin'
  },
  {
    name: 'Pravastatin',
    brandNames: ['Pravachol'],
    commonDosages: ['10mg', '20mg', '40mg', '80mg'],
    commonFrequencies: ['Once daily'],
    category: 'Statin'
  },

  // Nitrates
  {
    name: 'Nitroglycerin',
    brandNames: ['Nitrostat', 'Nitro-Dur'],
    commonDosages: ['0.3mg', '0.4mg', '0.6mg', '2.5mg', '6.5mg', '9mg'],
    commonFrequencies: ['As needed', 'Three times daily', 'Once daily'],
    category: 'Nitrate',
    description: 'Used for chest pain (angina)'
  },
  {
    name: 'Isosorbide Mononitrate',
    brandNames: ['Imdur', 'Monoket'],
    commonDosages: ['30mg', '60mg', '120mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'Nitrate'
  },

  // ARBs (Angiotensin Receptor Blockers)
  {
    name: 'Losartan',
    brandNames: ['Cozaar'],
    commonDosages: ['25mg', '50mg', '100mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'ARB',
    description: 'Used to treat high blood pressure and protect kidneys'
  },
  {
    name: 'Valsartan',
    brandNames: ['Diovan'],
    commonDosages: ['40mg', '80mg', '160mg', '320mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'ARB'
  },
  {
    name: 'Irbesartan',
    brandNames: ['Avapro'],
    commonDosages: ['75mg', '150mg', '300mg'],
    commonFrequencies: ['Once daily'],
    category: 'ARB'
  },

  // Other Heart Medications
  {
    name: 'Digoxin',
    brandNames: ['Lanoxin'],
    commonDosages: ['0.0625mg', '0.125mg', '0.25mg'],
    commonFrequencies: ['Once daily'],
    category: 'Cardiac Glycoside',
    description: 'Used to treat heart failure and irregular heartbeat'
  },
  {
    name: 'Amiodarone',
    brandNames: ['Cordarone', 'Pacerone'],
    commonDosages: ['200mg', '400mg'],
    commonFrequencies: ['Once daily', 'Twice daily'],
    category: 'Antiarrhythmic'
  },
  {
    name: 'Sacubitril/Valsartan',
    brandNames: ['Entresto'],
    commonDosages: ['24/26mg', '49/51mg', '97/103mg'],
    commonFrequencies: ['Twice daily'],
    category: 'ARN Inhibitor'
  },

  // Common Pain/Other
  {
    name: 'Acetaminophen',
    brandNames: ['Tylenol'],
    commonDosages: ['325mg', '500mg', '650mg'],
    commonFrequencies: ['Every 4-6 hours', 'Three times daily', 'Four times daily'],
    category: 'Pain Reliever'
  }
];

// Standard frequency options from medical practice
export const STANDARD_FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
  'Before meals',
  'After meals',
  'With breakfast',
  'With lunch',
  'With dinner',
  'At bedtime',
  'Weekly',
  'Every other day',
  'Monthly'
];

// Standard time of day options
export const STANDARD_TIMES_OF_DAY = [
  'Morning',
  'Noon',
  'Evening',
  'Bedtime',
  'With breakfast',
  'With lunch',
  'With dinner',
  'Before meals',
  'After meals',
  'As needed'
];

// Search function for autocomplete
export function searchMedications(query: string): MedicationInfo[] {
  if (!query || query.length < 2) return [];

  const lowercaseQuery = query.toLowerCase();

  return MEDICATION_DATABASE.filter(med => {
    // Search in generic name
    if (med.name.toLowerCase().includes(lowercaseQuery)) return true;

    // Search in brand names
    if (med.brandNames?.some(brand => brand.toLowerCase().includes(lowercaseQuery))) return true;

    return false;
  }).slice(0, 10); // Limit to 10 results
}

// Get medication info by name
export function getMedicationInfo(name: string): MedicationInfo | undefined {
  const lowercaseName = name.toLowerCase();

  return MEDICATION_DATABASE.find(med => {
    if (med.name.toLowerCase() === lowercaseName) return true;
    if (med.brandNames?.some(brand => brand.toLowerCase() === lowercaseName)) return true;
    return false;
  });
}
