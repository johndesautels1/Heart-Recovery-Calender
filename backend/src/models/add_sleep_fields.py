import re

with open('SleepLog.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new fields to interface
content = content.replace(
    "  wakeTime?: Date;\n  createdAt?: Date;",
    "  wakeTime?: Date;\n  isNap?: boolean;\n  napDuration?: number;\n  dreamNotes?: string;\n  sleepScore?: number;\n  createdAt?: Date;"
)

# Add new fields to class
content = content.replace(
    "  public wakeTime?: Date;\n  public readonly createdAt?: Date;",
    "  public wakeTime?: Date;\n  public isNap?: boolean;\n  public napDuration?: number;\n  public dreamNotes?: string;\n  public sleepScore?: number;\n  public readonly createdAt?: Date;"
)

# Add new fields to model definition
wake_time_pattern = r"(        wakeTime: \{[^}]+\},)"
replacement = r"""\1
        isNap: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Whether this is a nap (not overnight sleep)',
        },
        napDuration: {
          type: DataTypes.DECIMAL(4, 2),
          allowNull: true,
          comment: 'Duration of nap in hours',
        },
        dreamNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Dream journal notes',
        },
        sleepScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Calculated sleep score (0-100)',
          validate: {
            min: 0,
            max: 100,
          },
        },"""

content = re.sub(wake_time_pattern, replacement, content)

with open('SleepLog.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added sleep tracking fields")
