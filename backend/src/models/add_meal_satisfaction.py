import re

with open('MealEntry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new field to interface
content = content.replace(
    "  notes?: string;\n  createdAt?: Date;",
    "  notes?: string;\n  satisfactionRating?: number;\n  createdAt?: Date;"
)

# Add new field to class
content = content.replace(
    "  public notes?: string;\n  public readonly createdAt!: Date;",
    "  public notes?: string;\n  public satisfactionRating?: number;\n  public readonly createdAt!: Date;"
)

# Add new field to model definition
notes_pattern = r"(        notes: \{[^}]+\},)"
replacement = r"""\1
        satisfactionRating: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Meal satisfaction rating (1-5 stars)',
          validate: {
            min: 1,
            max: 5,
          },
        },"""

content = re.sub(notes_pattern, replacement, content)

with open('MealEntry.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added meal satisfaction field")
