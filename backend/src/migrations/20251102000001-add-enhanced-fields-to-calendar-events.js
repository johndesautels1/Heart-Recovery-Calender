/**
 * Migration: Add Enhanced Fields to CalendarEvents
 *
 * Adds the following fields to calendar_events table:
 * - deletedAt: For soft-delete functionality (paranoid mode)
 * - privacyLevel: ENUM for privacy control ('private', 'shared', 'clinical')
 * - therapyGoalId: Foreign key linking to therapy_goals table
 * - attachments: JSONB field for file metadata storage
 * - tags: TEXT ARRAY for flexible categorization
 *
 * Related Tasks: DEL-001, PRIV-001, GOAL-001, ATT-001, CAL-007
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add deletedAt column for soft-delete (paranoid mode)
    const tableInfo = await queryInterface.describeTable('calendar_events');

    if (!tableInfo.deletedAt) {
      await queryInterface.addColumn('calendar_events', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp - NULL means not deleted'
      });
    }

    // 2. Create privacy level ENUM type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_calendar_events_privacyLevel AS ENUM('private', 'shared', 'clinical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Add privacyLevel column using raw SQL to avoid Sequelize quoting issues
    if (!tableInfo.privacyLevel) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "calendar_events"
        ADD COLUMN "privacyLevel" enum_calendar_events_privacyLevel NOT NULL DEFAULT 'private';
      `);

      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN "calendar_events"."privacyLevel" IS 'Privacy level: private (patient only), shared (with therapist), clinical (medical team)';
      `);
    }

    // 4. Add therapyGoalId foreign key
    if (!tableInfo.therapyGoalId) {
      await queryInterface.addColumn('calendar_events', 'therapyGoalId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'therapy_goals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Links event to a therapy goal for progress tracking'
      });
    }

    // 5. Add attachments JSONB field
    if (!tableInfo.attachments) {
      await queryInterface.addColumn('calendar_events', 'attachments', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Stores file metadata: [{filename, url, type, size, uploadedAt}]'
      });
    }

    // 6. Add tags TEXT ARRAY
    if (!tableInfo.tags) {
      await queryInterface.addColumn('calendar_events', 'tags', {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
        defaultValue: null,
        comment: 'Flexible categorization tags (e.g., #recovery, #milestone, #urgent)'
      });
    }

    // Add indexes for performance (check if they exist first)
    const indexes = await queryInterface.showIndex('calendar_events');
    const indexNames = indexes.map(idx => idx.name);

    if (!indexNames.includes('calendar_events_deletedAt_idx')) {
      await queryInterface.addIndex('calendar_events', ['deletedAt'], {
        name: 'calendar_events_deletedAt_idx'
      });
    }

    if (!indexNames.includes('calendar_events_privacyLevel_idx')) {
      await queryInterface.addIndex('calendar_events', ['privacyLevel'], {
        name: 'calendar_events_privacyLevel_idx'
      });
    }

    if (!indexNames.includes('calendar_events_therapyGoalId_idx')) {
      await queryInterface.addIndex('calendar_events', ['therapyGoalId'], {
        name: 'calendar_events_therapyGoalId_idx'
      });
    }

    // GIN index for tags array for fast lookups
    if (!indexNames.includes('calendar_events_tags_gin_idx')) {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS calendar_events_tags_gin_idx ON calendar_events USING GIN (tags);
      `);
    }

    console.log('✅ Migration complete: Added 5 enhanced fields to calendar_events table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS calendar_events_tags_gin_idx;
    `);
    await queryInterface.removeIndex('calendar_events', 'calendar_events_therapyGoalId_idx');
    await queryInterface.removeIndex('calendar_events', 'calendar_events_privacyLevel_idx');
    await queryInterface.removeIndex('calendar_events', 'calendar_events_deletedAt_idx');

    // Remove columns
    await queryInterface.removeColumn('calendar_events', 'tags');
    await queryInterface.removeColumn('calendar_events', 'attachments');
    await queryInterface.removeColumn('calendar_events', 'therapyGoalId');
    await queryInterface.removeColumn('calendar_events', 'privacyLevel');
    await queryInterface.removeColumn('calendar_events', 'deletedAt');

    // Drop ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_calendar_events_privacyLevel;
    `);

    console.log('⏪ Rollback complete: Removed enhanced fields from calendar_events');
  }
};
