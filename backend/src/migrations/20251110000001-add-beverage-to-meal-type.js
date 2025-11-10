module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'beverage' to the existing mealType ENUM if it doesn't exist
    const [results] = await queryInterface.sequelize.query(
      `SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'beverage' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_meal_entries_mealType')) AS exists;`
    );

    if (!results[0].exists) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_meal_entries_mealType" ADD VALUE 'beverage';`
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // PostgreSQL doesn't support removing ENUM values directly
    // To roll back, we would need to:
    // 1. Create a new ENUM without 'beverage'
    // 2. Alter the column to use the new ENUM
    // 3. Drop the old ENUM
    // For simplicity, we'll leave this as a no-op
    console.log('Rollback not implemented - cannot remove ENUM values in PostgreSQL');
  }
};
