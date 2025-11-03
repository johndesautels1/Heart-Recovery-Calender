# Read the file
with open('index.ts', 'r') as f:
    content = f.read()

# Remove GoalTemplate from the models object since it's not imported
content = content.replace(',\n  GoalTemplate,', ',')

# Write the updated content
with open('index.ts', 'w') as f:
    f.write(content)

print("Fixed index.ts - removed GoalTemplate reference")
