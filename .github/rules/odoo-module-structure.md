---
description: 
globs: 
alwaysApply: true
---
# Common Odoo 17 Patterns

# Model basics
_MODEL_TEMPLATE = """
class {ModelName}(models.Model):
    _name = '{model.name}'
    _description = '{Description}'
    
    name = fields.Char(string="Name", required=True)
    active = fields.Boolean(default=True)
"""

# Compute method
_COMPUTE_TEMPLATE = """
@api.depends('{field1}', '{field2}')
def _compute_{fieldname}(self):
    for record in self:
        record.{fieldname} = {logic}
"""

# OWL Component
_OWL_TEMPLATE = """
class {ComponentName} extends Component {
    static template = "{module}.{template}";
    
    setup() {
        super.setup();
        {setup_logic}
    }
}
"""