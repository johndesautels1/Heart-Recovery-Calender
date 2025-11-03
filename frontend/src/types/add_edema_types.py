# Read the file with UTF-8 encoding
with open('index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add edema fields to VitalsSample interface
content = content.replace(
    "  deviceId?: string;\n  createdAt: string;",
    "  deviceId?: string;\n  edema?: string;\n  edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  createdAt: string;"
)

# Write the updated content
with open('index.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added edema fields to types/index.ts")
