from odoo import http, _
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class PropertiesLandingPageController(http.Controller):
    @http.route('/properties_landing_page/modules', type='json', auth='user')
    def get_installed_modules(self):
        try:
            modules = request.env['ir.module.module'].sudo().search([
                ('state', '=', 'installed'),
                ('application', '=', True)
            ])
            
            if not modules:
                # Fallback - show at least some modules if no applications
                modules = request.env['ir.module.module'].sudo().search([
                    ('state', '=', 'installed')
                ], limit=20)
                
            return [{
                'id': m.id,
                'name': m.name,
                'shortdesc': m.shortdesc or m.name,
                'icon': m.icon or '/web/static/img/icons/gtk-dialog-info.png',
                'category_id': m.category_id.name if m.category_id else _('Uncategorized'),
                'summary': m.summary or '',
                'url': f'/web#action=base.open_module_tree&id={m.id}&view_type=form',
            } for m in modules]
        except Exception as e:
            _logger.error("Error fetching modules: %s", e)
            return []

    @http.route('/properties_landing_page', type='http', auth='user')
    def landing_page(self, **kw):
        try:
            user = request.env.user
            values = {
                'user': user,
                'company': user.company_id,
            }
            return request.render('properties_landing_page.landing_dashboard_template', values)
        except Exception as e:
            _logger.error("Error rendering landing page: %s", e)
            # Redirect to home if there's an error
            return request.redirect('/web')
