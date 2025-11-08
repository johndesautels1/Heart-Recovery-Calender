module.exports = {
  up: async (queryInterface, Sequelize) => {
    // PostgreSQL ALTER TYPE ADD VALUE cannot run inside a transaction
    // We need to commit any open transaction first
    const sequelize = queryInterface.sequelize;

    try {
      // Find the enum type name
      const [results] = await sequelize.query(`
        SELECT t.typname
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname LIKE '%device_type%'
        GROUP BY t.typname
        LIMIT 1;
      `);

      const enumTypeName = results[0]?.typname || 'enum_device_connections_deviceType';
      console.log(`Found enum type: ${enumTypeName}`);

      // Helper function to check if enum value exists
      const enumValueExists = async (value) => {
        const [rows] = await sequelize.query(`
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = '${enumTypeName}' AND e.enumlabel = '${value}'
        `);
        return rows.length > 0;
      };

      // Add fitbit
      if (!(await enumValueExists('fitbit'))) {
        await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE 'fitbit'`);
        console.log('✅ Added fitbit');
      } else {
        console.log('⏭️  fitbit already exists');
      }

      // Add garmin
      if (!(await enumValueExists('garmin'))) {
        await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE 'garmin'`);
        console.log('✅ Added garmin');
      } else {
        console.log('⏭️  garmin already exists');
      }

      // Add googlefit
      if (!(await enumValueExists('googlefit'))) {
        await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE 'googlefit'`);
        console.log('✅ Added googlefit');
      } else {
        console.log('⏭️  googlefit already exists');
      }

      console.log('✅ Migration completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // PostgreSQL doesn't support removing enum values easily
    console.log('⚠️  Warning: Cannot automatically remove enum values in PostgreSQL');
    console.log('⚠️  To revert this migration, you must manually recreate the enum type');
  }
};
