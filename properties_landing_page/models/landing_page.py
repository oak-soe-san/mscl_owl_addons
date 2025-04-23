from odoo import models, fields, api

class LandingPage(models.Model):
    _name = 'landing.page'
    _description = 'Landing Page Settings'
    
    name = fields.Char(string='Name', required=True)
    
    @api.model
    def _init_landing_page(self):
        # Create a default record if none exists
        if not self.search([]):
            self.create({'name': 'Default Landing Page Settings'})
        return True
