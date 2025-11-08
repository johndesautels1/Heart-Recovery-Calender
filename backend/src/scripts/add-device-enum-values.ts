import sequelize from '../models/database';

async function addDeviceEnumValues() {
  try {
    console.log('🔍 Finding device_type enum...');

    // Find the enum type name
    const [results] = await sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE '%device%'
      GROUP BY t.typname;
    `) as any;

    console.log('Found enums:', results);

    if (results.length === 0) {
      console.error('❌ No device type enum found!');
      process.exit(1);
    }

    const enumTypeName = results[0].typname;
    console.log(`✅ Using enum type: ${enumTypeName}`);

    // Get all existing enum values
    const [existingValues] = await sequelize.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = '${enumTypeName}'
      ORDER BY e.enumlabel;
    `) as any;

    console.log('Existing enum values:', existingValues.map((v: any) => v.enumlabel));

    const valuesToAdd = ['fitbit', 'garmin', 'googlefit'];

    for (const value of valuesToAdd) {
      const exists = existingValues.some((v: any) => v.enumlabel === value);

      if (!exists) {
        console.log(`➕ Adding '${value}' to enum...`);
        await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE '${value}'`);
        console.log(`✅ Added '${value}'`);
      } else {
        console.log(`⏭️  '${value}' already exists`);
      }
    }

    console.log('✅ All enum values added successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

addDeviceEnumValues();
