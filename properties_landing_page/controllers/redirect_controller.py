from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class LoginRedirectController(http.Controller):
    @http.route('/web/redirect', type='http', auth="user")
    def redirect_to_landing_page(self, **kw):
        """Intercept the standard post-login flow and redirect to properties landing page"""
        return request.redirect('/properties_landing_page')
        
    # This route will replace the standard /web route by overriding with a higher priority
    # to intercept users immediately after login
    @http.route('/web', type='http', auth="user", website=False)
    def web_override(self, **kw):
        """Override the /web route to redirect to properties landing page"""
        return request.redirect('/properties_landing_page')