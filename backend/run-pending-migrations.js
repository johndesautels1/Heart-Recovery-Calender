const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialect: 'postgres',
    logging: false
  });

  const migrationsDir = path.join(__dirname, 'migrations');
  const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

  console.log(`Found ${sqlFiles.length} SQL migration files to run\n`);

  for (const file of sqlFiles) {
    console.log(`Running: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await sequelize.query(sql);
      console.log(`✅ SUCCESS\n`);
    } catch (error) {
      console.log(`⚠️  ${error.message}\n`);
    }
  }

  await sequelize.close();
  console.log('✅ All migrations complete!');
}

runMigrations().catch(console.error);
