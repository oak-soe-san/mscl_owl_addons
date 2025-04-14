{
    'name': 'Task Manager',
    'version': '1.0',
    'summary': 'Simple Task Management System',
    'description': """
        This module provides a simple task management system.
        Features include:
        - Task creation and assignment
        - Task tracking with statuses
        - Task prioritization
        - Task deadline management
    """,
    'category': 'Productivity',
    'author': 'OWL Solutions',
    'website': 'https://www.example.com',
    'license': 'LGPL-3',
    'depends': ['base', 'mail', 'web'],
    'data': [
        'security/task_manager_security.xml',
        'security/ir.model.access.csv',
        'views/task_views.xml',
        'views/task_menu.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'task_manager/static/src/js/task_dashboard.js',
            'task_manager/static/src/xml/task_dashboard.xml',
        ],
    },
    'demo': [],
    'installable': True,
    'application': True,
    'auto_install': False,
} 