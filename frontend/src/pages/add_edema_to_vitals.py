import re

# Read the file
with open('VitalsPage.tsx', 'r') as f:
    content = f.read()

# Add edema fields to the schema
schema_pattern = r"(const vitalsSchema = z\.object\(\{[^}]+  notes: z\.string\(\)\.optional\(\),\n  symptoms: z\.string\(\)\.optional\(\),\n  medicationsTaken: z\.boolean\(\)\.optional\(\),)"
schema_replacement = r"\1\n  edema: z.string().optional(),\n  edemaSeverity: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),"
content = re.sub(schema_pattern, schema_replacement, content, flags=re.DOTALL)

# Add edema fields to the form (after symptoms textarea)
form_pattern = r'(          <div className="space-y-2">\n            <label className="block text-sm font-medium font-bold">\n              Symptoms \(optional\)\n            </label>\n            <textarea[^>]+>\n            </textarea>\n          </div>)'
form_replacement = r'''\1

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Edema/Swelling (optional)
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="Location (ankles/feet/hands/abdomen)"
              {...register('edema')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Edema Severity (optional)
            </label>
            <select
              className="glass-input"
              {...register('edemaSeverity')}
            >
              <option value="">Select severity</option>
              <option value="none">None</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>'''
content = re.sub(form_pattern, form_replacement, content, flags=re.DOTALL)

# Write the updated content
with open('VitalsPage.tsx', 'w') as f:
    f.write(content)

print("Successfully added edema fields to VitalsPage.tsx")
