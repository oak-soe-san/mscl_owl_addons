---
description: 
globs: 
alwaysApply: true
---
description: Odoo 17 View architecture rules
files: views/*.xml

@rules:
1. View Structure:
   - Proper record IDs with module prefix
   - Logical view inheritance
   - XPath with clear comments

2. Error prevention:
   - Validate field names exist in model
   - Check security access for sensitive views
   - Avoid duplicate view IDs

3. Style:
   - 2-space indentation for XML
   - Group related view elements
   - Alphabetize attributes