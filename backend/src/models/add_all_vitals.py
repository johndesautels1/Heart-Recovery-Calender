import re

with open('VitalsSample.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ALL new fields to interface at once
content = content.replace(
    "  deviceId?: string;\n  createdAt?: Date;",
    """  deviceId?: string;
  edema?: string;
  edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';
  chestPain?: boolean;
  chestPainSeverity?: number;
  chestPainType?: string;
  dyspnea?: number;
  dyspneaTriggers?: string;
  dizziness?: boolean;
  dizzinessSeverity?: number;
  dizzinessFrequency?: string;
  energyLevel?: number;
  stressLevel?: number;
  anxietyLevel?: number;
  createdAt?: Date;"""
)

# Add ALL new fields to class
content = content.replace(
    "  public deviceId?: string;\n  public readonly createdAt!: Date;",
    """  public deviceId?: string;
  public edema?: string;
  public edemaSeverity?: 'none' | 'mild' | 'moderate' | 'severe';
  public chestPain?: boolean;
  public chestPainSeverity?: number;
  public chestPainType?: string;
  public dyspnea?: number;
  public dyspneaTriggers?: string;
  public dizziness?: boolean;
  public dizzinessSeverity?: number;
  public dizzinessFrequency?: string;
  public energyLevel?: number;
  public stressLevel?: number;
  public anxietyLevel?: number;
  public readonly createdAt!: Date;"""
)

# Add ALL new fields to model definition
device_id_pattern = r"(        deviceId: \{[^}]+\},)"
replacement = r"""\1
        edema: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Location of edema/swelling (ankles/feet/hands/abdomen)',
        },
        edemaSeverity: {
          type: DataTypes.ENUM('none', 'mild', 'moderate', 'severe'),
          allowNull: true,
          comment: 'Severity of edema/swelling',
        },
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
        },
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
        },
        dizziness: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          comment: 'Presence of dizziness/lightheadedness',
        },
        dizzinessSeverity: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Dizziness severity (1-10 scale)',
          validate: {
            min: 1,
            max: 10,
          },
        },
        dizzinessFrequency: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'How often dizziness occurs',
        },
        energyLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Energy level (1-10 scale, 1=exhausted, 10=energetic)',
          validate: {
            min: 1,
            max: 10,
          },
        },
        stressLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Stress level (1-10 scale, 1=relaxed, 10=very stressed)',
          validate: {
            min: 1,
            max: 10,
          },
        },
        anxietyLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Anxiety level (1-10 scale, 1=calm, 10=very anxious)',
          validate: {
            min: 1,
            max: 10,
          },
        },"""

content = re.sub(device_id_pattern, replacement, content)

with open('VitalsSample.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added all vitals fields")
