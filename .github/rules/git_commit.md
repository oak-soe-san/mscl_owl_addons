description: Enforce ISO commit standards for Odoo 17  
files: .git/COMMIT_EDITMSG  

@rules:  
1. **Odoo-Specific Scopes**:  
   - Use module names (e.g., `account`, `stock`, `task_manager`)  
   - For multi-module changes: `core`, `api`, or `base`  
2. **Body Requirements**:  
   - Mention affected models (e.g., `sale.order`, `task.task`)  
   - Note view/xml changes if UI-related  
3. **Validation**:  
   - Reject messages missing type/scope  
   - Require Jira/Task-ID for fixes  
   - Add `[MIG]` prefix for migration commits  

@example:  
fix(account): prevent duplicate invoice numbers

Overrides _get_last_sequence() in account.move

Adds unique constraint on name and company_id

Fixes #4567

[CI] Tests updated for sequence validation 