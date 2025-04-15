---
description: 
globs: 
alwaysApply: true
---
description: Odoo security conventions
files: security/*.csv,security/*.xml

@rules:
1. Access Rights:
   - Complete model names
   - Explicit permissions (don't rely on defaults)
   - Group-based security

2. Record Rules:
   - Clear domain filters
   - Commented rule purposes
   - Proper model_name format

3. Error prevention:
   - Validate model names exist
   - Check CSV formatting
   - Test rules in debug mode