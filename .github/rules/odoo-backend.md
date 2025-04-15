---
description: 
globs: 
alwaysApply: true
---

# Your rule content
description: Applies to Odoo 17 Python backend files
files: models/*.py,controllers/*.py

@rules:
1. Always use Odoo 17 API conventions:
   - New API decorators (@api.model, @api.depends, etc.)
   - Proper _name and _description for models
   - Field definitions with complete parameters

2. Error prevention:
   - Validate all compute methods have proper @api.depends
   - Ensure super() calls in overrides
   - Add type hints where possible

3. Style:
   - 4-space indentation
   - Group related fields together
   - Alphabetize methods where possible

@file: ../odoo_common_patterns.txt