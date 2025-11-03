import re

# Read the file
with open('VitalsSample.ts', 'r') as f:
    content = f.read()

# Add edema fields to interface after deviceId
content = content.replace(
    "  deviceId?: string;\n  createdAt?: Date;",
    "  deviceId?: string;\n  edema?: string;\n  edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  createdAt?: Date;"
)

# Add edema fields to class after deviceId
content = content.replace(
    "  public deviceId?: string;\n  public readonly createdAt!: Date;",
    "  public deviceId?: string;\n  public edema?: string;\n  public edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  public readonly createdAt!: Date;"
)

# Add edema fields to model definition before closing brace of fields
# Find the deviceId field definition and add after it
device_id_pattern = r"(        deviceId: \{[^}]+\},)"
replacement = r"\1\n        edema: {\n          type: DataTypes.TEXT,\n          allowNull: true,\n          comment: 'Location of edema/swelling (ankles/feet/hands/abdomen)',\n        },\n        edemaSeverity: {\n          type: DataTypes.ENUM('none', 'mild', 'moderate', 'severe'),\n          allowNull: true,\n          comment: 'Severity of edema/swelling',\n        },"

content = re.sub(device_id_pattern, replacement, content)

# Write the updated content
with open('VitalsSample.ts', 'w') as f:
    f.write(content)

print("Successfully added edema fields to VitalsSample.ts")
