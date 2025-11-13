const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

// Define Exercise model
const Exercise = sequelize.define('Exercise', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.ENUM('upper_body', 'lower_body', 'cardio', 'flexibility', 'balance', 'breathing', 'core'),
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false,
  },
  equipmentNeeded: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  videoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  minPostOpWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  maxPostOpWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  contraindications: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  recoveryBenefit: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  defaultSets: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  defaultReps: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  defaultDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'exercises',
  timestamps: true,
});

const newExercises = [
  // ACTIVITIES (Recreational/Sports) - Cardio category
  {
    name: "Tennis (Doubles)",
    description: "Playing doubles tennis at moderate pace",
    category: "cardio",
    difficulty: "intermediate",
    equipmentNeeded: "Tennis racket, tennis balls, court",
    minPostOpWeek: 10,
    maxPostOpWeek: null,
    instructions: "1. Start with warm-up\n2. Play doubles for less running\n3. Focus on moderate intensity\n4. Take breaks between games\n5. Stay hydrated",
    recoveryBenefit: "Excellent cardiovascular workout, improves agility and coordination, soCAIl activity boosts mental health, fun way to maintain fitness",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 45,
    isActive: true
  },
  {
    name: "Pickleball",
    description: "Playing pickleball at recreational level",
    category: "cardio",
    difficulty: "intermediate",
    equipmentNeeded: "Pickleball paddle, ball, court",
    minPostOpWeek: 9,
    maxPostOpWeek: null,
    instructions: "1. Warm up first\n2. Play at comfortable pace\n3. Less intense than tennis\n4. Good for lateral movement\n5. SoCAIl and fun",
    recoveryBenefit: "Lower impact than tennis, excellent cardio, improves balance and coordination, soCAIl engagement, easier on joints",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 40,
    isActive: true
  },
  {
    name: "Cycling (Outdoor, Easy)",
    description: "Leisure cycling on flat terrain",
    category: "cardio",
    difficulty: "beginner",
    equipmentNeeded: "Bicycle, helmet",
    minPostOpWeek: 7,
    maxPostOpWeek: null,
    instructions: "1. Choose flat route\n2. Start with short rides\n3. Wear helmet always\n4. Maintain comfortable pace\n5. Build distance gradually",
    recoveryBenefit: "Low-impact cardio, strengthens legs, improves endurance, outdoor activity benefits mental health",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 20,
    isActive: true
  },
  {
    name: "Cycling (Outdoor, Moderate)",
    description: "Cycling with some hills at moderate pace",
    category: "cardio",
    difficulty: "intermediate",
    equipmentNeeded: "Bicycle, helmet",
    minPostOpWeek: 9,
    maxPostOpWeek: null,
    instructions: "1. Warm up on flat terrain\n2. Include gentle hills\n3. Shift gears appropriately\n4. Monitor heart rate\n5. Cool down properly",
    recoveryBenefit: "Builds cardiovascular endurance, strengthens leg muscles, improves stamina, outdoor recreation",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 35,
    isActive: true
  },
  {
    name: "Hiking (Easy Trail)",
    description: "Walking on easy, well-maintained trail",
    category: "cardio",
    difficulty: "beginner",
    equipmentNeeded: "Comfortable shoes, water bottle",
    minPostOpWeek: 8,
    maxPostOpWeek: null,
    instructions: "1. Choose flat, easy trail\n2. Wear supportive footwear\n3. Bring water and snacks\n4. Start with short hikes\n5. Enjoy nature",
    recoveryBenefit: "Outdoor activity boosts mood, variable terrain improves balance, nature reduces stress, builds leg strength",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 30,
    isActive: true
  },
  {
    name: "Hiking (Moderate Trail)",
    description: "Hiking on trails with elevation changes",
    category: "cardio",
    difficulty: "intermediate",
    equipmentNeeded: "Hiking shoes, water, trekking poles optional",
    minPostOpWeek: 10,
    maxPostOpWeek: null,
    instructions: "1. Choose trail with moderate elevation\n2. Use trekking poles for stability\n3. Take breaks as needed\n4. Watch footing on uneven terrain\n5. Pack emergency supplies",
    recoveryBenefit: "Excellent cardiovascular workout, builds leg and core strength, mental health benefits from nature, functional fitness",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 45,
    isActive: true
  },
  {
    name: "Dancing (SoCAIl)",
    description: "SoCAIl dancing at moderate intensity",
    category: "cardio",
    difficulty: "intermediate",
    equipmentNeeded: "None",
    minPostOpWeek: 8,
    maxPostOpWeek: null,
    instructions: "1. Choose your dance style\n2. Start slow and build\n3. Take breaks between songs\n4. Stay hydrated\n5. Have fun with it",
    recoveryBenefit: "Fun cardiovascular exercise, improves coordination and balance, soCAIl engagement, boosts mood and confidence",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 30,
    isActive: true
  },
  {
    name: "Golf (Walking)",
    description: "Playing golf and walking the course",
    category: "cardio",
    difficulty: "intermediate",
    equipmentNeeded: "Golf clubs, golf balls",
    minPostOpWeek: 10,
    maxPostOpWeek: null,
    instructions: "1. Walk the course instead of cart\n2. Carry light bag or use pull cart\n3. Pace yourself\n4. Stay hydrated\n5. Enjoy the game",
    recoveryBenefit: "Moderate cardio from walking, rotational movement for core, outdoor activity, soCAIl interaction, stress relief",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 120,
    isActive: true
  },
  {
    name: "Gardening (Light)",
    description: "Light gardening activities like watering, planting",
    category: "flexibility",
    difficulty: "beginner",
    equipmentNeeded: "Garden tools, gloves",
    minPostOpWeek: 7,
    maxPostOpWeek: null,
    instructions: "1. Avoid heavy lifting initially\n2. Use proper bending technique\n3. Take frequent breaks\n4. Use kneeling pad\n5. Stay hydrated",
    recoveryBenefit: "Gentle movement and stretching, purposeful activity, outdoor time, stress relief, functional bending and reaching",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 30,
    isActive: true
  },
  {
    name: "Gardening (Moderate)",
    description: "Moderate gardening with raking, digging",
    category: "core",
    difficulty: "intermediate",
    equipmentNeeded: "Garden tools, gloves",
    minPostOpWeek: 10,
    maxPostOpWeek: null,
    instructions: "1. Use proper lifting mechanics\n2. Avoid heavy loads\n3. Alternate tasks\n4. Take breaks\n5. Bend from knees not back",
    recoveryBenefit: "Functional strength training, core engagement, flexibility work, purposeful exercise, stress relief",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 45,
    isActive: true
  },
  {
    name: "Kayaking (Calm Water)",
    description: "Recreational kayaking on calm water",
    category: "cardio",
    difficulty: "intermediate",
    equipmentNeeded: "Kayak, paddle, life vest",
    minPostOpWeek: 10,
    maxPostOpWeek: null,
    instructions: "1. Wear life vest always\n2. Start on calm water\n3. Use proper paddling technique\n4. Take breaks as needed\n5. Stay close to shore initially",
    recoveryBenefit: "Upper body and core workout, low impact, outdoor activity, improves balance, peaceful exercise",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 40,
    isActive: true
  },
  {
    name: "Bowling",
    description: "Recreational bowling activity",
    category: "upper_body",
    difficulty: "beginner",
    equipmentNeeded: "Bowling ball, bowling shoes",
    minPostOpWeek: 9,
    maxPostOpWeek: null,
    instructions: "1. Use lighter ball initially\n2. Focus on form not power\n3. Take breaks between games\n4. SoCAIl activity\n5. Have fun",
    recoveryBenefit: "Arm and shoulder movement, soCAIl activity, low intensity, functional motion, enjoyable recreation",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 60,
    isActive: true
  },

  // STRUCTURED EXERCISES (PT-style)
  {
    name: "Resistance Band Chest Press",
    description: "Chest press using resistance band",
    category: "upper_body",
    difficulty: "intermediate",
    equipmentNeeded: "Resistance band",
    minPostOpWeek: 8,
    maxPostOpWeek: null,
    instructions: "1. Secure band behind you at chest height\n2. Hold handles at chest level\n3. Press forward extending arms\n4. Control return to start\n5. Breathe out on press",
    recoveryBenefit: "Strengthens chest muscles with controlled resistance, safer than free weights, progressive resistance",
    defaultSets: 2,
    defaultReps: 12,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Resistance Band Shoulder External Rotation",
    description: "Rotator cuff strengthening",
    category: "upper_body",
    difficulty: "beginner",
    equipmentNeeded: "Resistance band",
    minPostOpWeek: 6,
    maxPostOpWeek: null,
    instructions: "1. Hold band with elbow at 90 degrees\n2. Keep elbow at side\n3. Rotate forearm outward\n4. Return slowly\n5. Switch arms",
    recoveryBenefit: "Strengthens rotator cuff, prevents shoulder injury, improves shoulder stability",
    defaultSets: 2,
    defaultReps: 15,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Resistance Band Leg Press",
    description: "Seated leg press with band",
    category: "lower_body",
    difficulty: "beginner",
    equipmentNeeded: "Resistance band",
    minPostOpWeek: 5,
    maxPostOpWeek: null,
    instructions: "1. Sit with band around one foot\n2. Hold ends of band\n3. Push foot forward extending leg\n4. Control return\n5. Switch legs",
    recoveryBenefit: "Strengthens quads without weights, safe progression, controlled resistance",
    defaultSets: 2,
    defaultReps: 15,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Wall Slides (Shoulder)",
    description: "Shoulder mobility against wall",
    category: "flexibility",
    difficulty: "beginner",
    equipmentNeeded: "Wall",
    minPostOpWeek: 4,
    maxPostOpWeek: null,
    instructions: "1. Stand with back against wall\n2. Arms at sides, elbows bent 90 degrees\n3. Slide arms up wall overhead\n4. Keep back and arms touching wall\n5. Lower slowly",
    recoveryBenefit: "Improves shoulder mobility, safe overhead motion, posture improvement",
    defaultSets: 2,
    defaultReps: 10,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Foam Roller Upper Back",
    description: "Self-massage for upper back",
    category: "flexibility",
    difficulty: "beginner",
    equipmentNeeded: "Foam roller",
    minPostOpWeek: 6,
    maxPostOpWeek: null,
    instructions: "1. Lie with roller under upper back\n2. Support head with hands\n3. Roll slowly up and down\n4. Pause on tender spots\n5. Breathe deeply",
    recoveryBenefit: "Releases muscle tension, improves posture, reduces pain, promotes relaxation",
    defaultSets: 1,
    defaultReps: 1,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Bird Dog Exercise",
    description: "Core stability exercise on hands and knees",
    category: "core",
    difficulty: "intermediate",
    equipmentNeeded: "Exercise mat",
    minPostOpWeek: 8,
    maxPostOpWeek: null,
    instructions: "1. Start on hands and knees\n2. Extend right arm forward and left leg back\n3. Keep back straight and level\n4. Hold 5 seconds\n5. Switch sides",
    recoveryBenefit: "Core stability, balance improvement, back strengthening, functional movement pattern",
    defaultSets: 2,
    defaultReps: 10,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Dead Bug Exercise",
    description: "Core exercise lying on back",
    category: "core",
    difficulty: "beginner",
    equipmentNeeded: "Exercise mat",
    minPostOpWeek: 6,
    maxPostOpWeek: null,
    instructions: "1. Lie on back, arms up toward ceiling\n2. Knees bent, feet in air\n3. Lower right arm and left leg slowly\n4. Return and switch sides\n5. Keep back flat on floor",
    recoveryBenefit: "Safe core strengthening, coordination, no spinal stress, functional core control",
    defaultSets: 2,
    defaultReps: 10,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Side Plank (Knees)",
    description: "Modified side plank from knees",
    category: "core",
    difficulty: "intermediate",
    equipmentNeeded: "Exercise mat",
    minPostOpWeek: 8,
    maxPostOpWeek: null,
    instructions: "1. Lie on side, prop up on elbow\n2. Knees bent, stack legs\n3. Lift hips off ground\n4. Hold 10-20 seconds\n5. Switch sides",
    recoveryBenefit: "Lateral core strength, oblique muscles, balance improvement, functional stability",
    defaultSets: 2,
    defaultReps: 5,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Single Leg Balance (Eyes Closed)",
    description: "Advanced balance exercise",
    category: "balance",
    difficulty: "advanced",
    equipmentNeeded: "None",
    minPostOpWeek: 10,
    maxPostOpWeek: null,
    instructions: "1. Stand near wall for safety\n2. Lift one foot off ground\n3. Close eyes\n4. Hold 10-30 seconds\n5. Switch legs",
    recoveryBenefit: "Advanced balance training, proprioception, fall prevention, challenges vestibular system",
    defaultSets: 2,
    defaultReps: 5,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Bosu Ball Balance",
    description: "Standing balance on unstable surface",
    category: "balance",
    difficulty: "intermediate",
    equipmentNeeded: "Bosu ball",
    minPostOpWeek: 9,
    maxPostOpWeek: null,
    instructions: "1. Start with dome side up\n2. Step onto center carefully\n3. Find balance\n4. Hold 30 seconds\n5. Progress to exercises on bosu",
    recoveryBenefit: "Dynamic balance, core engagement, ankle strength, functional stability training",
    defaultSets: 2,
    defaultReps: 5,
    defaultDuration: 5,
    isActive: true
  },
  {
    name: "Pursed Lip Breathing",
    description: "Controlled exhalation breathing technique",
    category: "breathing",
    difficulty: "beginner",
    equipmentNeeded: "None",
    minPostOpWeek: 1,
    maxPostOpWeek: null,
    instructions: "1. Breathe in through nose 2 counts\n2. Purse lips like whistling\n3. Exhale slowly through pursed lips 4 counts\n4. Repeat 5 times\n5. Do whenever short of breath",
    recoveryBenefit: "Slows breathing rate, keeps airways open longer, reduces work of breathing, calms anxiety",
    defaultSets: 3,
    defaultReps: 5,
    defaultDuration: 3,
    isActive: true
  },
  {
    name: "Box Breathing",
    description: "4-4-4-4 breathing pattern for relaxation",
    category: "breathing",
    difficulty: "beginner",
    equipmentNeeded: "None",
    minPostOpWeek: 2,
    maxPostOpWeek: null,
    instructions: "1. Breathe in for 4 counts\n2. Hold for 4 counts\n3. Breathe out for 4 counts\n4. Hold empty for 4 counts\n5. Repeat 4-5 times",
    recoveryBenefit: "Reduces stress and anxiety, lowers heart rate, improves focus, calms nervous system",
    defaultSets: 2,
    defaultReps: 5,
    defaultDuration: 3,
    isActive: true
  },
  {
    name: "Doorway Chest Stretch",
    description: "Standing chest and shoulder stretch",
    category: "flexibility",
    difficulty: "beginner",
    equipmentNeeded: "Doorway",
    minPostOpWeek: 5,
    maxPostOpWeek: null,
    instructions: "1. Stand in doorway\n2. Place forearms on door frame\n3. Gently lean forward\n4. Feel stretch across chest\n5. Hold 20-30 seconds",
    recoveryBenefit: "Opens chest after surgery, improves posture, reduces shoulder tightness, increases flexibility",
    defaultSets: 2,
    defaultReps: 3,
    defaultDuration: 3,
    isActive: true
  },
  {
    name: "Standing Hamstring Stretch",
    description: "Standing forward bend to stretch hamstrings",
    category: "flexibility",
    difficulty: "beginner",
    equipmentNeeded: "Chair for support",
    minPostOpWeek: 5,
    maxPostOpWeek: null,
    instructions: "1. Stand with one foot on low step\n2. Keep leg straight\n3. Lean forward from hips\n4. Feel stretch in back of thigh\n5. Hold 20 seconds, switch legs",
    recoveryBenefit: "Improves hamstring flexibility, reduces lower back tightness, better walking mechanics",
    defaultSets: 2,
    defaultReps: 3,
    defaultDuration: 3,
    isActive: true
  }
];

async function addExercises() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    for (const exercise of newExercises) {
      const created = await Exercise.create(exercise);
      console.log(`✓ Added: ${created.name}`);
    }

    console.log(`\n✓ Successfully added ${newExercises.length} new exercises!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addExercises();
