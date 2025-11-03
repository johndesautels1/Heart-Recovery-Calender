# Read the file with UTF-8 encoding
with open('VitalsSample.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add dyspnea fields to interface
content = content.replace(
    "  chestPainType?: string;\n  createdAt?: Date;",
    "  chestPainType?: string;\n  dyspnea?: number;\n  dyspneaTriggers?: string;\n  createdAt?: Date;"
)

# Add dyspnea fields to class
content = content.replace(
    "  public chestPainType?: string;\n  public readonly createdAt!: Date;",
    "  public chestPainType?: string;\n  public dyspnea?: number;\n  public dyspneaTriggers?: string;\n  public readonly createdAt!: Date;"
)

# Add dyspnea fields to model definition
import re
chest_pain_type_pattern = r"(        chestPainType: \{[^}]+\},)"
replacement = r"""\1
        dyspnea: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Shortness of breath scale (0=none, 1=mild, 2=moderate, 3=severe, 4=very severe)',
          validate: {
            min: 0,
            max: 4,
          },
        },
        dyspneaTriggers: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'What triggers shortness of breath',
        },"""

content = re.sub(chest_pain_type_pattern, replacement, content)

# Write the updated content
with open('VitalsSample.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added dyspnea fields to VitalsSample.ts")
