'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create physical_therapy_phases table
    await queryInterface.createTable('physical_therapy_phases', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      phaseNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
      },
      phaseName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      weekStart: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      weekEnd: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      focusAreas: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
      },
      restrictions: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
      },
      exerciseLibrary: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      targetHeartRate: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      intensityLevel: {
        type: Sequelize.ENUM('very_light', 'light', 'moderate', 'vigorous'),
        allowNull: false,
        defaultValue: 'very_light',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create therapy_routines table
    await queryInterface.createTable('therapy_routines', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      therapistId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phaseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'physical_therapy_phases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      routineName: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      exercises: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      scheduledDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      scheduledTime: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      durationMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'skipped', 'issue'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      completionNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      painLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      fatigueLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      heartRateData: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create activities table
    await queryInterface.createTable('activities', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      activityType: {
        type: Sequelize.ENUM('adl', 'mobility', 'recreational', 'soCAIl', 'exercise'),
        allowNull: false,
      },
      activityName: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      activityCategory: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      activityDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      activityTime: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('accomplished', 'caution', 'not_to_do', 'issue'),
        allowNull: false,
        defaultValue: 'accomplished',
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      symptoms: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      heartRate: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bloodPressure: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      painLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      fatigueLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      assistanceRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      milestone: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('physical_therapy_phases', ['phaseNumber']);
    await queryInterface.addIndex('therapy_routines', ['userId']);
    await queryInterface.addIndex('therapy_routines', ['therapistId']);
    await queryInterface.addIndex('therapy_routines', ['phaseId']);
    await queryInterface.addIndex('therapy_routines', ['scheduledDate']);
    await queryInterface.addIndex('therapy_routines', ['status']);
    await queryInterface.addIndex('activities', ['userId']);
    await queryInterface.addIndex('activities', ['activityType']);
    await queryInterface.addIndex('activities', ['activityDate']);
    await queryInterface.addIndex('activities', ['status']);
    await queryInterface.addIndex('activities', ['milestone']);

    // Seed 5-phase cardiac rehab phases (20 weeks total) with exercise library
    await queryInterface.bulkInsert('physical_therapy_phases', [
      {
        id: 1,
        phaseNumber: 1,
        phaseName: 'Acute Recovery (Hospital/Immediate Post-Op)',
        weekStart: 1,
        weekEnd: 1,
        description: 'Initial recovery phase focused on basic mobility and breathing exercises under close medical supervision.',
        focusAreas: ['Breathing exercises', 'Bed mobility', 'Basic range of motion', 'Circulation'],
        restrictions: ['No lifting > 5 lbs', 'No pushing/pulling', 'No reaching overhead', 'No driving'],
        targetHeartRate: 'Resting + 20 bpm max',
        intensityLevel: 'very_light',
        exerciseLibrary: JSON.stringify({
          exercises: [
            { name: 'Deep breathing exercises', sets: 4, reps: 10, duration: '5 min', frequency: 'Every 2 hours' },
            { name: 'Ankle pumps', sets: 3, reps: 15, duration: '3 min', frequency: '4x daily' },
            { name: 'Seated arm circles', sets: 2, reps: 10, duration: '2 min', frequency: '3x daily' },
            { name: 'Supported standing', sets: 3, reps: 1, duration: '1 min', frequency: '3x daily' },
            { name: 'Assisted walking (with support)', sets: 3, reps: 1, duration: '5 min', frequency: '2x daily' },
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        phaseNumber: 2,
        phaseName: 'Early Mobilization (Home Recovery)',
        weekStart: 2,
        weekEnd: 4,
        description: 'Gradual increase in daily activities with focus on gentle movement and building basic endurance.',
        focusAreas: ['Walking progression', 'Light stretching', 'Posture', 'Energy management'],
        restrictions: ['No lifting > 10 lbs', 'No strenuous activities', 'Avoid extreme temperatures', 'No straining'],
        targetHeartRate: '50-60% max HR',
        intensityLevel: 'light',
        exerciseLibrary: JSON.stringify({
          exercises: [
            { name: 'Short walks', sets: 3, reps: 1, duration: '5-10 min', frequency: 'Daily' },
            { name: 'Gentle arm stretches', sets: 2, reps: 10, duration: '5 min', frequency: '2x daily' },
            { name: 'Seated leg lifts', sets: 2, reps: 10, duration: '5 min', frequency: '2x daily' },
            { name: 'Standing heel raises', sets: 2, reps: 10, duration: '3 min', frequency: '2x daily' },
            { name: 'Wall push-ups', sets: 2, reps: 8, duration: '3 min', frequency: 'Daily' },
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        phaseNumber: 3,
        phaseName: 'Progressive Rehabilitation',
        weekStart: 5,
        weekEnd: 8,
        description: 'Structured exercise program with increasing intensity and duration. Focus on cardiovascular endurance.',
        focusAreas: ['Cardiovascular endurance', 'Strength building', 'Flexibility', 'Daily activity reintegration'],
        restrictions: ['No lifting > 15 lbs', 'Avoid competitive sports', 'Monitor heart rate'],
        targetHeartRate: '60-70% max HR',
        intensityLevel: 'moderate',
        exerciseLibrary: JSON.stringify({
          exercises: [
            { name: 'Walking program', sets: 1, reps: 1, duration: '15-20 min', frequency: 'Daily' },
            { name: 'Stationary cycling (light)', sets: 1, reps: 1, duration: '10-15 min', frequency: '5x week' },
            { name: 'Arm ergometer', sets: 1, reps: 1, duration: '5-10 min', frequency: '3x week' },
            { name: 'Light resistance bands', sets: 2, reps: 12, duration: '10 min', frequency: '3x week' },
            { name: 'Balance exercises', sets: 3, reps: 10, duration: '5 min', frequency: 'Daily' },
            { name: 'Gentle yoga/stretching', sets: 1, reps: 1, duration: '15 min', frequency: '3x week' },
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        phaseNumber: 4,
        phaseName: 'Advanced Rehabilitation',
        weekStart: 9,
        weekEnd: 12,
        description: 'Increased exercise intensity with focus on strength, endurance, and return to normal activities.',
        focusAreas: ['Aerobic capacity', 'Muscular strength', 'Functional activities', 'Confidence building'],
        restrictions: ['Lifting limitations gradually removed', 'Avoid maximum exertion', 'Continue monitoring'],
        targetHeartRate: '70-80% max HR',
        intensityLevel: 'moderate',
        exerciseLibrary: JSON.stringify({
          exercises: [
            { name: 'Brisk walking', sets: 1, reps: 1, duration: '30 min', frequency: 'Daily' },
            { name: 'Stationary cycling (moderate)', sets: 1, reps: 1, duration: '20-25 min', frequency: '5x week' },
            { name: 'Light weight training', sets: 2, reps: 12, duration: '20 min', frequency: '3x week' },
            { name: 'Stair climbing', sets: 2, reps: 10, duration: '5 min', frequency: '3x week' },
            { name: 'Swimming (light laps)', sets: 1, reps: 1, duration: '15 min', frequency: '2x week' },
            { name: 'Core strengthening', sets: 2, reps: 15, duration: '10 min', frequency: '3x week' },
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 5,
        phaseNumber: 5,
        phaseName: 'Maintenance & Long-term Wellness',
        weekStart: 13,
        weekEnd: 52,
        description: 'Long-term maintenance program with focus on sustainable exercise habits and lifestyle management.',
        focusAreas: ['Long-term fitness', 'Weight management', 'Stress reduction', 'Lifestyle modification'],
        restrictions: ['Use common sense', 'Listen to body', 'Avoid extreme exertion'],
        targetHeartRate: '70-85% max HR',
        intensityLevel: 'moderate',
        exerciseLibrary: JSON.stringify({
          exercises: [
            { name: 'Walking/jogging', sets: 1, reps: 1, duration: '30-45 min', frequency: '5-7x week' },
            { name: 'Cycling', sets: 1, reps: 1, duration: '30-40 min', frequency: '3-5x week' },
            { name: 'Resistance training', sets: 3, reps: 12, duration: '30 min', frequency: '3x week' },
            { name: 'Swimming', sets: 1, reps: 1, duration: '30 min', frequency: '2-3x week' },
            { name: 'Group fitness classes', sets: 1, reps: 1, duration: '45 min', frequency: '2-3x week' },
            { name: 'Flexibility/yoga', sets: 1, reps: 1, duration: '20 min', frequency: '3x week' },
            { name: 'Recreational activities', sets: 1, reps: 1, duration: '30-60 min', frequency: 'Weekly' },
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('activities');
    await queryInterface.dropTable('therapy_routines');
    await queryInterface.dropTable('physical_therapy_phases');
  },
};
