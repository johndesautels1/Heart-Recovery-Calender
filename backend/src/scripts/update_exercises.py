#!/usr/bin/env python3
"""
Script to add formTips and modifications to seedExercises.ts
This works by finding each exercise object and inserting the new fields.
"""

import re
import sys

# Read the file
with open(r'C:\Users\broke\OneDrive\Apps\Heart-Recovery-Calendar\backend\src\scripts\seedExercises.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Track which exercises already have formTips
exercises_with_tips = len(re.findall(r'formTips:', content))
print(f"Exercises already with formTips: {exercises_with_tips}")

# Find all exercises that don't have formTips yet
# Pattern: exercise object ending with isActive: true, followed by optional videoUrl/imageUrl,
# but NO formTips
pattern = r"({\s+name: '[^']+',[\s\S]+?isActive: true,(?:\s+videoUrl: '[^']+',)?(?:\s+imageUrl: '[^']+',)?)\s+(\},)"

matches = re.finditer(pattern, content)

# For demonstration, let's just show what we found
count = 0
for match in matches:
    exercise_text = match.group(1)
    # Check if it already has formTips
    if 'formTips:' not in exercise_text:
        count += 1
        # Extract exercise name
        name_match = re.search(r"name: '([^']+)'", exercise_text)
        if name_match:
            print(f"Exercise {count} needs tips: {name_match.group(1)}")

print(f"\nTotal exercises needing formTips: {count}")
print(f"Already have formTips: {exercises_with_tips}")
print(f"Expected total: {count + exercises_with_tips}")
