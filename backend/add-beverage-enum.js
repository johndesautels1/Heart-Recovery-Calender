const { Sequelize } = require('sequelize');
const config = require('./src/config/database.js');

async function addBeverageToEnum() {
  const sequelize = new Sequelize(config.development);

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully');

    console.log('Adding "beverage" to meal_entries mealType ENUM...');
    await sequelize.query(
      `ALTER TYPE "enum_meal_entries_mealType" ADD VALUE IF NOT EXISTS 'beverage';`
    );
    console.log('✓ Successfully added "beverage" to mealType ENUM');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

addBeverageToEnum();
