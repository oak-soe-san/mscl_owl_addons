description: Global Rules for Odoo Development

@git_commit_rules:  
1. **Format**: Follow ISO-style conventions with a structured header and body.  
2. **Header**:  
   - Prefix with **type(scope):**  
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`  
   - Scope: Odoo module name (e.g., `sale`, `account`)  
   - Subject: Imperative mood, <= 50 chars  
3. **Body**:  
   - Explain **what** and **why**, not how (unless critical)  
   - Wrap at 72 chars  
   - Reference issues with `#issue` or `Task-ID: 1234`  
4. **Footer**:  
   - `Signed-off-by: Name <email>` (if required)  
   - `BREAKING CHANGE:` if applicable  
5. **Example**:  
feat(sale): add automatic invoice generation on delivery

Implements automated invoice creation when a delivery is validated

Uses new _post_invoice_on_delivery method

Configurable via Settings > Sales

Task-ID: 1234
Signed-off-by: John Doe john@example.com

**AI MUST:**  
- Use this exact format  
- Avoid vague messages like "updated code"  
- Reference Odoo models/views when applicable  
- Never write "fix bug" without context 