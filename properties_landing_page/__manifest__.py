{
    "name": "Properties Landing Page",
    "summary": "Modern landing page showing all installed modules after login.",
    "description": "A custom landing page that displays all installed modules in a visually appealing way after user login.",
    "author": "Your Company",
    "website": "https://yourcompany.com",
    "category": "Web",
    "version": "17.0.1.0.0",
    "depends": ["base", "web"],
    "data": [
        "security/ir.model.access.csv",
        "security/properties_landing_page_security.xml",
        "data/landing_page_data.xml",
        "views/landing_page_views.xml",
        "views/landing_page_menu.xml",
        "views/landing_page_home_action.xml"
    ],
    "assets": {
        "web.assets_backend": [
            "properties_landing_page/static/src/js/landing_dashboard.js",
            "properties_landing_page/static/src/xml/landing_dashboard.xml",
            "properties_landing_page/static/src/css/landing_dashboard.css"
        ]
    },
    "installable": True,
    "application": True,
    "auto_install": False
}
