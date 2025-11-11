import Anthropic from '@anthropic-ai/sdk';
import { AggregatedPatientData } from './ciaDataAggregationService';

const AI_MODEL = 'claude-sonnet-4-20250514';
const AI_PROMPT_VERSION = 'v1.0';

interface CIAAnalysisResult {
  recoveryScore: number;
  summary: string;
  riskAssessment: RiskItem[];
  unusualFindings: Finding[];
  actionPlan: ActionItem[];
  detailedAnalysis: any;
}

interface RiskItem {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  finding: string;
  recommendation: string;
  clinicalBasis: string;
}

interface Finding {
  category: string;
  observation: string;
  significance: string;
  trend?: 'improving' | 'stable' | 'declining';
}

interface ActionItem {
  priority: 'immediate' | 'short-term' | 'long-term';
  category: string;
  action: string;
  rationale: string;
  timeline: string;
}

export class CIAAnalysisService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is not set');
    }
    this.client = new Anthropic({ apiKey });
  }

  async analyzePatientData(data: AggregatedPatientData): Promise<CIAAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(data);

    const message = await this.client.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      temperature: 0.3, // Lower temperature for medical analysis
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from Claude response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    // Strip markdown code blocks if present (Claude often wraps JSON in ```json ... ```)
    let jsonText = responseText.trim();
    const markdownMatch = jsonText.match(/```json\n?([\s\S]*?)\n?```/);
    if (markdownMatch) {
      jsonText = markdownMatch[1].trim();
    }

    // Parse the JSON response
    const analysis = JSON.parse(jsonText);

    return {
      recoveryScore: analysis.recoveryScore,
      summary: analysis.summary,
      riskAssessment: analysis.riskAssessment,
      unusualFindings: analysis.unusualFindings,
      actionPlan: analysis.actionPlan,
      detailedAnalysis: analysis.detailedAnalysis || {},
    };
  }

  private buildAnalysisPrompt(data: AggregatedPatientData): string {
    return `You are an expert cardiac recovery analyst with deep knowledge of international cardiac rehabilitation standards (AHA, ESC, ACC guidelines). You will analyze comprehensive patient data from a cardiac surgery recovery monitoring system.

# INTERNATIONAL CARDIAC RECOVERY STANDARDS

## AHA/ACCF Cardiac Rehabilitation Guidelines:
- **Phase I (Inpatient)**: Days 0-7 post-surgery
- **Phase II (Outpatient Supervised)**: Weeks 2-12 post-surgery
- **Phase III (Maintenance)**: 12+ weeks post-surgery

## Target Metrics by Phase:
### Vital Signs:
- **Blood Pressure**: <140/90 mmHg (JNC-8 guidelines)
- **Heart Rate**: Resting 60-100 bpm; Target exercise HR = (220 - age) × 0.6-0.8
- **Oxygen Saturation**: ≥95% at rest, ≥92% during exercise
- **Weight**: Stable ±2 kg/week; BMI trend toward 18.5-25

### Exercise Capacity:
- **Week 2-4**: 1-2 METs, short walks, activities of daily living
- **Week 5-8**: 2-4 METs, increasing duration
- **Week 9-12**: 4-6 METs, structured exercise
- **6-Minute Walk Test**: >400m by week 12 (age-adjusted)

### Sleep Quality:
- **Total Sleep**: 7-9 hours/night
- **Sleep Efficiency**: >85%
- **Deep Sleep**: 15-25% of total
- **REM Sleep**: 20-25% of total

### Nutrition:
- **Sodium**: <2000 mg/day (heart failure) or <2300 mg/day (general)
- **Saturated Fat**: <7% of total calories
- **Fiber**: 25-30 g/day
- **Protein**: 1.2-1.5 g/kg body weight for healing

### Medications:
- **Adherence**: >90% considered optimal
- **Common Post-Cardiac Surgery Meds**: Beta-blockers, ACE inhibitors, statins, antiplatelet agents

## Risk Assessment Criteria:
### Critical (Immediate Medical Attention):
- Systolic BP >180 or <90 mmHg
- Heart rate >120 or <50 bpm at rest
- Oxygen saturation <90%
- New chest pain, dyspnea at rest, severe edema
- Sudden weight gain >2 kg in 24 hours

### High Risk:
- BP 160-179/100-109 mmHg
- Resting HR 100-120 or 50-60 bpm
- Exercise HR exceeding safe zone
- Declining ejection fraction
- Poor medication adherence (<80%)

### Medium Risk:
- BP 140-159/90-99 mmHg
- Inconsistent sleep patterns
- Suboptimal nutrition
- Sedentary behavior

### Low Risk:
- Minor deviations from targets
- Temporary setbacks with recovery trajectory

# METRIC WEIGHTING ALGORITHM

Weight each data category based on:
1. **Availability** (0-1): More data = higher confidence
2. **Recency** (0-1): Recent data weighted more heavily
3. **Clinical Significance** (1-10): Based on evidence for cardiac outcomes

### Weighting Hierarchy:
1. **Vital Signs**: Weight 10 (most critical - direct cardiac function indicators)
2. **Exercise Capacity**: Weight 9 (strong predictor of outcomes)
3. **Medications**: Weight 8 (essential for recovery)
4. **Sleep Quality**: Weight 7 (impacts recovery, inflammation)
5. **Nutrition**: Weight 6 (long-term risk factor modification)
6. **ECG/Cardiac Monitoring**: Weight 10 (when available - arrhythmia detection)
7. **Hydration**: Weight 5
8. **Habits/Lifestyle**: Weight 4

## Recovery Score Calculation (0-100):
\`\`\`
Recovery Score = Σ(Category Score × Category Weight × Availability) / Σ(Category Weight × Availability)

Category Score (0-100) based on:
- Meeting targets: 100
- Within 10% of target: 80-99
- Within 20% of target: 60-79
- Beyond 20% but improving: 40-59
- Beyond 20% and stable: 20-39
- Beyond 20% and declining: 0-19
\`\`\`

# PATIENT DATA TO ANALYZE

**Patient Information:**
${JSON.stringify(data.patient, null, 2)}

**Analysis Period:**
- Surgery Date (Day 0): ${data.surgeryDate || 'Not specified'}
- Days Post-Surgery: ${data.daysPostSurgery || 'Not applicable'}
- Analysis Start: ${data.analysisStartDate}
- Analysis End: ${data.analysisEndDate}

**Data Completeness:**
${JSON.stringify(data.dataCompleteness, null, 2)}

**Vitals Data** (${data.vitals.length} samples):
${data.vitals.length > 0 ? JSON.stringify(data.vitals.slice(0, 50), null, 2) : 'No vitals data available'}

**Sleep Data** (${data.sleep.length} nights):
${data.sleep.length > 0 ? JSON.stringify(data.sleep.slice(0, 30), null, 2) : 'No sleep data available'}

**Exercise Data** (${data.exercise.length} sessions):
${data.exercise.length > 0 ? JSON.stringify(data.exercise.slice(0, 50), null, 2) : 'No exercise data available'}

**Meals Data** (${data.meals.length} entries):
${data.meals.length > 0 ? JSON.stringify(data.meals.slice(0, 50), null, 2) : 'No meals data available'}

**Medications** (${data.medications.length} prescribed):
${JSON.stringify(data.medications, null, 2)}

**Medication Adherence** (${data.medicationLogs.length} logs):
${data.medicationLogs.length > 0 ? JSON.stringify(data.medicationLogs.slice(0, 50), null, 2) : 'No medication logs available'}

**Hydration** (${data.hydration.length} daily logs):
${data.hydration.length > 0 ? JSON.stringify(data.hydration.slice(0, 30), null, 2) : 'No hydration data available'}

**ECG/Cardiac Data** (${data.ecg.length} samples):
${data.ecg.length > 0 ? JSON.stringify(data.ecg.slice(0, 10), null, 2) : 'No ECG data available'}

**Cardiac Team:**
${JSON.stringify(data.providers, null, 2)}

# ANALYSIS INSTRUCTIONS

1. **Flexible Analysis**: Work with whatever data is available. If only 1 metric, analyze it deeply. If 500 metrics, provide comprehensive analysis.

2. **Apply International Standards**: Compare patient metrics against AHA/ESC/ACC guidelines referenced above.

3. **Calculate Recovery Score**: Use the weighting algorithm above. Show your work.

4. **Identify Risks**: Flag anything meeting critical/high/medium criteria.

5. **Find Patterns**: Look for:
   - Trends (improving/declining)
   - Correlations (e.g., poor sleep → higher BP)
   - Anomalies (sudden changes, outliers)
   - Gaps in care (missing meds, skipped activities)

6. **Personalize Recommendations**: Consider:
   - Days post-surgery (phase of recovery)
   - Patient's specific conditions/comorbidities
   - Current trajectory
   - Data completeness

7. **Provide Evidence**: Cite specific data points and explain clinical reasoning.

# OUTPUT FORMAT

Respond with a valid JSON object (no markdown, no extra text):

{
  "recoveryScore": <number 0-100>,
  "summary": "<2-3 paragraph executive summary>",
  "riskAssessment": [
    {
      "category": "<vitals|exercise|medications|sleep|nutrition|cardiac>",
      "severity": "<low|medium|high|critical>",
      "finding": "<what you observed>",
      "recommendation": "<specific action>",
      "clinicalBasis": "<why this matters, cite guidelines>"
    }
  ],
  "unusualFindings": [
    {
      "category": "<category>",
      "observation": "<what you found>",
      "significance": "<clinical importance>",
      "trend": "<improving|stable|declining>"
    }
  ],
  "actionPlan": [
    {
      "priority": "<immediate|short-term|long-term>",
      "category": "<category>",
      "action": "<specific recommendation>",
      "rationale": "<evidence-based reason>",
      "timeline": "<when to implement>"
    }
  ],
  "detailedAnalysis": {
    "vitalsAnalysis": { ... },
    "exerciseAnalysis": { ... },
    "sleepAnalysis": { ... },
    "nutritionAnalysis": { ... },
    "medicationAdherence": { ... },
    "overallTrajectory": "<improving|stable|declining>",
    "comparisonToStandards": { ... }
  }
}

Generate the analysis now based on the patient data provided.`;
  }
}

export default new CIAAnalysisService();
