#This is the odoo coding instruction of odoo 17 development 

#Python instruction 
- Use camelCase for variable and function names
- Use PascalCase for component names
- Use single quotes for strings
- Use 2 spaces for indentation
- Use arrow functions for callbacks
- Use async/await for RPC calls
- Follow Odoo's OWL component structure:
  - Static template property
  - setup() method for initialization
  - Lifecycle hooks (willStart, willUpdateProps, etc.)
- PropTypes validation for all component props
- Use store for shared state management

#JavaScript (OWL Components) Standards
- Use camelCase for variable and function names
- Use PascalCase for component names
- Use single quotes for strings
- Use 2 spaces for indentation
- Use arrow functions for callbacks
- Use async/await for RPC calls
- Follow Odoo's OWL component structure:
  - Static template property
  - setup() method for initialization
  - Lifecycle hooks (willStart, willUpdateProps, etc.)
- PropTypes validation for all component props
- Use store for shared state management

#XML (Views/QWeb) Standards
- Use 2 spaces for indentation
- Attribute ordering:
  1. name
  2. model
  3. type/other attributes
- View IDs format: `<module_name>_view_<type>_<description>`
- Use semantic view inheritance with clear xpaths
- For QWeb templates:
  - Prefix template names with module name
  - Include owl="1" for OWL components
  - Minimal inline JavaScript
- Group related view elements with comments

#Security Rules
- CSV files:
  - Use lowercase for model names
  - Complete group names with module prefix
  - Explicit permissions (1/0, not empty)
- Record rules:
  - Clear naming: `<module_name>_<model>_<rule_type>`
  - Commented domain filters
  - Test coverage for sensitive rules
- Always define ir.model.access.csv before ir.rule.xml

#Git Commit Standards
- Follow conventional commits:
  - feat(module): description
  - fix(module): description
  - refactor(module): description
- Scope should be the Odoo module name
- Body should reference:
  - Affected models
  - View changes if applicable
  - Task/issue numbers

