module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('goal_templates', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      goal_type: {
        type: Sequelize.ENUM('exercise', 'activity', 'mobility', 'medication_adherence', 'diet', 'vitals', 'other'),
        allowNull: false,
      },
      target_value: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      timeframe: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      category: {
        type: Sequelize.ENUM('cardiac_recovery', 'mobility', 'strength', 'endurance', 'lifestyle', 'medication', 'nutrition'),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('goal_templates', ['category']);
    await queryInterface.addIndex('goal_templates', ['goal_type']);
    await queryInterface.addIndex('goal_templates', ['is_active']);

    // Seed initial goal templates
    await queryInterface.bulkInsert('goal_templates', [
      {
        name: 'Walk 30 Minutes Daily',
        description: 'Build cardiovascular endurance by walking for 30 consecutive minutes without chest pain or excessive shortness of breath',
        goal_type: 'exercise',
        target_value: '30',
        unit: 'minutes',
        timeframe: '4 weeks',
        category: 'cardiac_recovery',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Medication Adherence 100%',
        description: 'Take all prescribed cardiac medications on schedule without missing any doses',
        goal_type: 'medication_adherence',
        target_value: '100',
        unit: '%',
        timeframe: 'ongoing',
        category: 'medication',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Target Heart Rate During Exercise',
        description: 'Maintain heart rate within prescribed range during cardiac rehabilitation exercises',
        goal_type: 'vitals',
        target_value: '60-80',
        unit: '% of max HR',
        timeframe: '8 weeks',
        category: 'cardiac_recovery',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Climb One Flight of Stairs',
        description: 'Safely climb one flight of stairs (12-15 steps) without stopping or experiencing symptoms',
        goal_type: 'mobility',
        target_value: '1',
        unit: 'flight',
        timeframe: '6 weeks',
        category: 'mobility',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Reduce Sodium Intake',
        description: 'Limit daily sodium intake to support heart health and manage blood pressure',
        goal_type: 'diet',
        target_value: '2000',
        unit: 'mg/day',
        timeframe: '2 weeks',
        category: 'nutrition',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Upper Body Strength',
        description: 'Perform arm exercises with light resistance (1-2 lbs) without straining',
        goal_type: 'exercise',
        target_value: '10',
        unit: 'reps per arm',
        timeframe: '8 weeks',
        category: 'strength',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Return to Daily Activities',
        description: 'Resume light household activities like preparing simple meals and light cleaning',
        goal_type: 'activity',
        target_value: '3',
        unit: 'activities/day',
        timeframe: '4 weeks',
        category: 'lifestyle',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Blood Pressure Control',
        description: 'Maintain blood pressure within target range prescribed by cardiologist',
        goal_type: 'vitals',
        target_value: '120/80',
        unit: 'mmHg',
        timeframe: '12 weeks',
        category: 'cardiac_recovery',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Increase Walking Distance',
        description: 'Gradually increase walking distance to build endurance',
        goal_type: 'exercise',
        target_value: '1',
        unit: 'mile',
        timeframe: '8 weeks',
        category: 'endurance',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Attend All Cardiac Rehab Sessions',
        description: 'Complete all scheduled cardiac rehabilitation program sessions',
        goal_type: 'other',
        target_value: '36',
        unit: 'sessions',
        timeframe: '12 weeks',
        category: 'cardiac_recovery',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('goal_templates');
  },
};
