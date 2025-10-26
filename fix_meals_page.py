#!/usr/bin/env python3
import re

# Read the file
with open(r'frontend\src\pages\MealsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Only replace text-gray when it's NOT inside a template literal className
# We'll do this more carefully by only replacing when className=" (not className={`)

# Replace standalone className with text-gray colors
content = re.sub(
    r'className="([^"]*?)text-gray-800([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--ink)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-gray-700([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--ink-gold)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-gray-600([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--ink-gold)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-gray-500([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--muted)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-gray-400([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--muted)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-blue-600([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--cyan)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-green-600([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--good)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-yellow-600([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--warn)\' }}',
    content
)

content = re.sub(
    r'className="([^"]*?)text-red-600([^"]*?)"',
    r'className="\1\2" style={{ color: \'var(--bad)\' }}',
    content
)

# Clean up double spaces
content = re.sub(r'  +', ' ', content)

# Clean up className="" (empty classes)
content = re.sub(r'className="\s+"', 'className=""', content)

# Write back
with open(r'frontend\src\pages\MealsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("MealsPage fixed!")
