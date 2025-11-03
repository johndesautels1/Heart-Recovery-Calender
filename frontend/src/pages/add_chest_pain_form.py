import re

# Read the file with UTF-8 encoding
with open('VitalsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add chest pain fields to schema
schema_pattern = r"(  edemaSeverity: z\.enum\(\['none', 'mild', 'moderate', 'severe'\]\)\.optional\(\),)"
schema_replacement = r"""\1
  chestPain: z.boolean().optional(),
  chestPainSeverity: z.number().min(1).max(10).optional(),
  chestPainType: z.string().optional(),"""
content = re.sub(schema_pattern, schema_replacement, content)

# Add chest pain form after edema severity
form_pattern = r'(          <div className="space-y-2">\n            <label className="block text-sm font-medium font-bold">\n              Edema Severity \(optional\)\n            </label>\n            <select[^>]+>[^<]+<option value="">Select severity</option>[^<]+<option value="none">None</option>[^<]+<option value="mild">Mild</option>[^<]+<option value="moderate">Moderate</option>[^<]+<option value="severe">Severe</option>[^<]+</select>\n          </div>)'
form_replacement = r'''\1

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Chest Pain
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="chestPain"
                className="rounded border-gray-300"
                {...register('chestPain')}
              />
              <label htmlFor="chestPain" className="text-sm">
                Experiencing chest pain
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Chest Pain Severity (1-10)
            </label>
            <Input
              type="number"
              min="1"
              max="10"
              placeholder="1-10"
              {...register('chestPainSeverity', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Chest Pain Type
            </label>
            <select
              className="glass-input"
              {...register('chestPainType')}
            >
              <option value="">Select type</option>
              <option value="sharp">Sharp</option>
              <option value="dull">Dull</option>
              <option value="pressure">Pressure</option>
              <option value="burning">Burning</option>
            </select>
          </div>'''
content = re.sub(form_pattern, form_replacement, content, flags=re.DOTALL)

# Write the updated content
with open('VitalsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added chest pain form to VitalsPage.tsx")
