import re

with open('Medication.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new fields to interface
content = content.replace(
    "  notes?: string;\n  createdAt?: Date;",
    "  notes?: string;\n  effectivenessRating?: number;\n  isOTC?: boolean;\n  createdAt?: Date;"
)

# Add new fields to class
content = content.replace(
    "  public notes?: string;\n  public readonly createdAt!: Date;",
    "  public notes?: string;\n  public effectivenessRating?: number;\n  public isOTC?: boolean;\n  public readonly createdAt!: Date;"
)

# Add new fields to model definition - find the notes field definition
notes_pattern = r"(        notes: \{[^}]+\},)"
replacement = r"""\1
        effectivenessRating: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Effectiveness rating (1-5 stars)',
          validate: {
            min: 1,
            max: 5,
          },
        },
        isOTC: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Whether this is an over-the-counter medication',
        },"""

content = re.sub(notes_pattern, replacement, content)

with open('Medication.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added medication tracking fields")
