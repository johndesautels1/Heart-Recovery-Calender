# Read the file with UTF-8 encoding
with open('VitalsSample.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add chest pain fields to interface after edemaSeverity
content = content.replace(
    "  edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  createdAt?: Date;",
    "  edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  chestPain?: boolean;\n  chestPainSeverity?: number;\n  chestPainType?: string;\n  createdAt?: Date;"
)

# Add chest pain fields to class
content = content.replace(
    "  public edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  public readonly createdAt!: Date;",
    "  public edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  public chestPain?: boolean;\n  public chestPainSeverity?: number;\n  public chestPainType?: string;\n  public readonly createdAt!: Date;"
)

# Add chest pain fields to model definition
import re
edema_severity_pattern = r"(        edemaSeverity: \{[^}]+\},)"
replacement = r"""\1
        chestPain: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          comment: 'Presence of chest pain',
        },
        chestPainSeverity: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Chest pain severity (1-10 scale)',
          validate: {
            min: 1,
            max: 10,
          },
        },
        chestPainType: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Type of chest pain (sharp/dull/pressure/burning)',
        },"""

content = re.sub(edema_severity_pattern, replacement, content)

# Write the updated content
with open('VitalsSample.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added chest pain fields to VitalsSample.ts")
