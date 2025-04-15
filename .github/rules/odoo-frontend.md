---
description: 
globs: 
alwaysApply: true
---
description: Odoo 17 JS/OWL/QWeb rules
files: static/src/js/*.js,static/src/xml/*.xml

@rules:
1. OWL Component Standards:
   - Use class syntax with setup()
   - Proper lifecycle hooks
   - Async/await for RPCs

2. QWeb Templates:
   - owl="1" attribute for OWL components
   - t-name prefixes with module name
   - Minimal inline JS

3. Error prevention:
   - Validate props existence before use
   - Error boundaries for components
   - PropTypes validation

@file: ../odoo_common_patterns.txt