const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function addBeverages() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Check existing categories
    const [existingCategories] = await sequelize.query(
      'SELECT id, name, icon FROM food_categories ORDER BY "sortOrder"'
    );

    console.log('\nExisting categories:');
    existingCategories.forEach(cat => {
      console.log(`  ${cat.id}. ${cat.icon || ''} ${cat.name}`);
    });

    // Check if Beverages category exists
    const [beverageCheck] = await sequelize.query(
      `SELECT id FROM food_categories WHERE name = 'Beverages'`
    );

    if (beverageCheck.length === 0) {
      console.log('\n Adding Beverages category...');
      await sequelize.query(`
        INSERT INTO food_categories (name, description, icon, "sortOrder", "createdAt", "updatedAt")
        VALUES ('Beverages', 'Drinks and fluids', '🥤', 10, NOW(), NOW())
        RETURNING id
      `);
      console.log('✓ Beverages category added');
    } else {
      console.log('\n✓ Beverages category already exists');
    }

    // Get beverages category ID
    const [beverageCat] = await sequelize.query(
      `SELECT id FROM food_categories WHERE name = 'Beverages'`
    );
    const beverageId = beverageCat[0].id;

    // Add common beverages
    const beverages = [
      { name: 'Water', healthRating: 'green', servingSize: '8 oz', calories: 0, sodium: 0 },
      { name: 'Milk (Whole)', healthRating: 'yellow', servingSize: '8 oz', calories: 150, sodium: 120, protein: 8, carbs: 12, fat: 8, cholesterol: 24 },
      { name: 'Milk (Skim)', healthRating: 'green', servingSize: '8 oz', calories: 80, sodium: 120, protein: 8, carbs: 12, fat: 0, cholesterol: 5 },
      { name: 'Orange Juice', healthRating: 'yellow', servingSize: '8 oz', calories: 110, sodium: 0, carbs: 26, notes: 'High in sugar, drink in moderation' },
      { name: 'Coffee (Black)', healthRating: 'green', servingSize: '8 oz', calories: 2, sodium: 5 },
      { name: 'Tea (Unsweetened)', healthRating: 'green', servingSize: '8 oz', calories: 0, sodium: 0 },
      { name: 'Beer', healthRating: 'red', servingSize: '12 oz', calories: 150, sodium: 15, carbs: 13, notes: 'Alcohol - limit consumption' },
      { name: 'Wine (Red)', healthRating: 'yellow', servingSize: '5 oz', calories: 125, sodium: 5, carbs: 4, notes: 'Moderate consumption may benefit heart health' },
      { name: 'Soda (Regular)', healthRating: 'red', servingSize: '12 oz', calories: 140, sodium: 40, carbs: 39, notes: 'High in sugar - avoid' },
      { name: 'Soda (Diet)', healthRating: 'yellow', servingSize: '12 oz', calories: 0, sodium: 40, notes: 'Artificial sweeteners - use sparingly' },
      { name: 'Coconut Water', healthRating: 'green', servingSize: '8 oz', calories: 45, sodium: 250, carbs: 9, notes: 'Good source of electrolytes' },
      { name: 'Almond Milk (Unsweetened)', healthRating: 'green', servingSize: '8 oz', calories: 30, sodium: 150, protein: 1, carbs: 1, fat: 2.5 },
    ];

    console.log('\nAdding beverage items...');
    for (const bev of beverages) {
      // Check if exists
      const [exists] = await sequelize.query(
        `SELECT id FROM food_items WHERE name = ? AND "categoryId" = ?`,
        { replacements: [bev.name, beverageId] }
      );

      if (exists.length === 0) {
        await sequelize.query(`
          INSERT INTO food_items (
            "categoryId", name, "healthRating", calories, protein, carbs, fat,
            fiber, sodium, cholesterol, "servingSize", notes, "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            beverageId,
            bev.name,
            bev.healthRating,
            bev.calories || null,
            bev.protein || null,
            bev.carbs || null,
            bev.fat || null,
            bev.fiber || null,
            bev.sodium || null,
            bev.cholesterol || null,
            bev.servingSize || null,
            bev.notes || null,
          ]
        });
        console.log(`  ✓ Added ${bev.name}`);
      } else {
        console.log(`  - ${bev.name} already exists`);
      }
    }

    console.log('\n✅ Beverages setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addBeverages();
