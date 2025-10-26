import EventTemplate from '../models/EventTemplate';

type EventTemplateCategory = 'therapy' | 'consultation' | 'checkup' | 'exercise' | 'education' | 'assessment' | 'group_session' | 'follow_up';

interface EventTemplateSeedData {
  name: string;
  description: string;
  category: EventTemplateCategory;
  defaultDuration: number;
  defaultLocation: string;
  color: string;
  requiresPatientAcceptance: boolean;
  isActive: boolean;
}

const eventTemplates: EventTemplateSeedData[] = [
  // THERAPY SESSIONS
  {
    name: 'Initial Physical Therapy Assessment',
    description: 'Comprehensive evaluation of patient physical capabilities, range of motion, strength, and recovery goals',
    category: 'assessment',
    defaultDuration: 60,
    defaultLocation: 'Cardiac Rehab Center',
    color: '#3B82F6',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Phase I Cardiac Rehab Session',
    description: 'Supervised exercise session for Phase I cardiac rehabilitation (weeks 1-4 post-op)',
    category: 'therapy',
    defaultDuration: 45,
    defaultLocation: 'Cardiac Rehab Center',
    color: '#10B981',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Phase II Cardiac Rehab Session',
    description: 'Supervised exercise session for Phase II cardiac rehabilitation (weeks 5-8 post-op)',
    category: 'therapy',
    defaultDuration: 60,
    defaultLocation: 'Cardiac Rehab Center',
    color: '#10B981',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Phase III Cardiac Rehab Session',
    description: 'Advanced supervised exercise session for Phase III cardiac rehabilitation (weeks 9-12 post-op)',
    category: 'therapy',
    defaultDuration: 60,
    defaultLocation: 'Cardiac Rehab Center',
    color: '#10B981',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Strength Training Session',
    description: 'Supervised resistance training focused on upper and lower body strengthening',
    category: 'exercise',
    defaultDuration: 45,
    defaultLocation: 'Gym/Rehab Center',
    color: '#8B5CF6',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Cardio Conditioning',
    description: 'Aerobic exercise session including treadmill, stationary bike, or elliptical training',
    category: 'exercise',
    defaultDuration: 30,
    defaultLocation: 'Cardiac Rehab Center',
    color: '#EC4899',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Flexibility and Stretching Session',
    description: 'Guided flexibility training and stretching exercises to improve range of motion',
    category: 'exercise',
    defaultDuration: 30,
    defaultLocation: 'Rehab Center',
    color: '#F59E0B',
    requiresPatientAcceptance: true,
    isActive: true,
  },

  // CONSULTATIONS
  {
    name: 'Cardiologist Consultation',
    description: 'Follow-up consultation with cardiologist to review heart health and recovery progress',
    category: 'consultation',
    defaultDuration: 30,
    defaultLocation: 'Cardiology Clinic',
    color: '#EF4444',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Nutritionist Consultation',
    description: 'Dietary counseling session focused on heart-healthy eating and meal planning',
    category: 'consultation',
    defaultDuration: 45,
    defaultLocation: 'Nutrition Office',
    color: '#14B8A6',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Mental Health Counseling',
    description: 'Psychological support session addressing anxiety, depression, or emotional challenges post-surgery',
    category: 'consultation',
    defaultDuration: 50,
    defaultLocation: 'Counseling Center',
    color: '#A855F7',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Medication Review Appointment',
    description: 'Review of current medications, dosages, and potential side effects with clinical pharmacist',
    category: 'consultation',
    defaultDuration: 30,
    defaultLocation: 'Pharmacy/Clinic',
    color: '#06B6D4',
    requiresPatientAcceptance: true,
    isActive: true,
  },

  // CHECKUPS & ASSESSMENTS
  {
    name: 'Post-Op Week 2 Checkup',
    description: 'Two-week post-operative checkup including wound assessment and vital signs review',
    category: 'checkup',
    defaultDuration: 30,
    defaultLocation: 'Surgical Clinic',
    color: '#F97316',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Post-Op Week 6 Checkup',
    description: 'Six-week post-operative comprehensive checkup with surgeon',
    category: 'checkup',
    defaultDuration: 45,
    defaultLocation: 'Surgical Clinic',
    color: '#F97316',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Post-Op Week 12 Checkup',
    description: 'Twelve-week post-operative assessment and clearance evaluation',
    category: 'checkup',
    defaultDuration: 45,
    defaultLocation: 'Surgical Clinic',
    color: '#F97316',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Echocardiogram',
    description: 'Ultrasound examination of heart structure and function',
    category: 'assessment',
    defaultDuration: 60,
    defaultLocation: 'Cardiology Imaging',
    color: '#3B82F6',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Stress Test',
    description: 'Cardiac stress test to evaluate heart function during physical exertion',
    category: 'assessment',
    defaultDuration: 90,
    defaultLocation: 'Cardiology Lab',
    color: '#3B82F6',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'EKG (Electrocardiogram)',
    description: 'Test to measure electrical activity of the heart',
    category: 'assessment',
    defaultDuration: 20,
    defaultLocation: 'Cardiology Clinic',
    color: '#3B82F6',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Blood Work / Lab Tests',
    description: 'Routine blood tests including cholesterol, cardiac enzymes, and other markers',
    category: 'assessment',
    defaultDuration: 15,
    defaultLocation: 'Lab/Clinic',
    color: '#3B82F6',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: '6-Minute Walk Test',
    description: 'Functional assessment measuring distance walked in 6 minutes',
    category: 'assessment',
    defaultDuration: 30,
    defaultLocation: 'Rehab Center',
    color: '#3B82F6',
    requiresPatientAcceptance: false,
    isActive: true,
  },

  // EDUCATION SESSIONS
  {
    name: 'Heart Health Education Class',
    description: 'Educational session covering heart anatomy, cardiac surgery recovery, and lifestyle modifications',
    category: 'education',
    defaultDuration: 90,
    defaultLocation: 'Education Center',
    color: '#22C55E',
    requiresPatientAcceptance: false,
    isActive: true,
  },
  {
    name: 'Medication Management Training',
    description: 'Education on proper medication usage, timing, and recognizing side effects',
    category: 'education',
    defaultDuration: 60,
    defaultLocation: 'Education Center',
    color: '#22C55E',
    requiresPatientAcceptance: false,
    isActive: true,
  },
  {
    name: 'Nutrition Workshop',
    description: 'Interactive workshop on heart-healthy cooking, meal prep, and dietary guidelines',
    category: 'education',
    defaultDuration: 120,
    defaultLocation: 'Education Center',
    color: '#22C55E',
    requiresPatientAcceptance: false,
    isActive: true,
  },
  {
    name: 'Exercise at Home Training',
    description: 'Training session on safe home exercise routines and activity progression',
    category: 'education',
    defaultDuration: 60,
    defaultLocation: 'Rehab Center',
    color: '#22C55E',
    requiresPatientAcceptance: false,
    isActive: true,
  },
  {
    name: 'Stress Management Workshop',
    description: 'Workshop on stress reduction techniques, relaxation, and mindfulness',
    category: 'education',
    defaultDuration: 90,
    defaultLocation: 'Wellness Center',
    color: '#22C55E',
    requiresPatientAcceptance: false,
    isActive: true,
  },

  // GROUP SESSIONS
  {
    name: 'Cardiac Support Group',
    description: 'Peer support group for cardiac surgery patients and families',
    category: 'group_session',
    defaultDuration: 90,
    defaultLocation: 'Community Room',
    color: '#84CC16',
    requiresPatientAcceptance: false,
    isActive: true,
  },
  {
    name: 'Group Exercise Class',
    description: 'Supervised group exercise session for cardiac rehab patients at similar recovery stages',
    category: 'group_session',
    defaultDuration: 60,
    defaultLocation: 'Rehab Center Gym',
    color: '#84CC16',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Family Education Session',
    description: 'Educational session for family members and caregivers of cardiac patients',
    category: 'group_session',
    defaultDuration: 90,
    defaultLocation: 'Education Center',
    color: '#84CC16',
    requiresPatientAcceptance: false,
    isActive: true,
  },

  // FOLLOW-UP APPOINTMENTS
  {
    name: 'Wound Check Follow-Up',
    description: 'Follow-up appointment to assess surgical wound healing',
    category: 'follow_up',
    defaultDuration: 15,
    defaultLocation: 'Surgical Clinic',
    color: '#64748B',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Physical Therapy Progress Review',
    description: 'Review session to assess progress and adjust therapy plan',
    category: 'follow_up',
    defaultDuration: 30,
    defaultLocation: 'Rehab Center',
    color: '#64748B',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Telehealth Check-In',
    description: 'Virtual follow-up appointment via video call',
    category: 'follow_up',
    defaultDuration: 20,
    defaultLocation: 'Virtual/Telehealth',
    color: '#64748B',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Pain Management Follow-Up',
    description: 'Follow-up to assess pain levels and adjust pain management strategy',
    category: 'follow_up',
    defaultDuration: 30,
    defaultLocation: 'Pain Management Clinic',
    color: '#64748B',
    requiresPatientAcceptance: true,
    isActive: true,
  },
  {
    name: 'Cardiac Rehab Graduation',
    description: 'Final session celebrating completion of cardiac rehabilitation program',
    category: 'follow_up',
    defaultDuration: 45,
    defaultLocation: 'Rehab Center',
    color: '#F59E0B',
    requiresPatientAcceptance: false,
    isActive: true,
  },
];

export async function seedEventTemplates() {
  try {
    console.log('🌱 Starting Event Templates seeding...');

    // Clear existing templates
    await EventTemplate.destroy({ where: {} });
    console.log('✅ Cleared existing event templates');

    // Create templates
    const createdTemplates = await EventTemplate.bulkCreate(eventTemplates);
    console.log(`✅ Created ${createdTemplates.length} event templates`);

    // Log summary by category
    const categories = eventTemplates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Event Templates Summary:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} templates`);
    });

    return createdTemplates;
  } catch (error) {
    console.error('❌ Error seeding event templates:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const sequelize = require('../models/database').default;

  sequelize.sync()
    .then(() => seedEventTemplates())
    .then(() => {
      console.log('\n✅ Event Templates seeding completed successfully!');
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}
