# Read the file with UTF-8 encoding
with open('index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add chest pain fields to VitalsSample interface
content = content.replace(
    "  edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  createdAt: string;",
    "  edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';\n  chestPain?: boolean;\n  chestPainSeverity?: number;\n  chestPainType?: string;\n  createdAt: string;"
)

# Write the updated content
with open('index.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added chest pain fields to types/index.ts")
