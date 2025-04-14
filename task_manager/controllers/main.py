from odoo import http
from odoo.http import request
from typing import Dict, Any


class TaskController(http.Controller):
    
    @http.route('/task_manager/dashboard', type='json', auth='user')
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get dashboard data for the current user"""
        Task = request.env['task.task']
        user_id = request.env.user.id
        
        # Count tasks by status for current user
        domain = [('user_id', '=', user_id), ('active', '=', True)]
        
        result = {
            'total': Task.search_count(domain),
            'new': Task.search_count(domain + [('state', '=', 'draft')]),
            'in_progress': Task.search_count(domain + [('state', '=', 'in_progress')]),
            'done': Task.search_count(domain + [('state', '=', 'done')]),
            'cancelled': Task.search_count(domain + [('state', '=', 'cancelled')]),
            'overdue': Task.search_count(domain + [('is_overdue', '=', True)]),
        }
        
        # Get urgent tasks (priority = urgent)
        urgent_tasks = Task.search_read(
            domain=domain + [('priority', '=', '3')],
            fields=['name', 'deadline', 'state'],
            limit=5
        )
        result['urgent_tasks'] = urgent_tasks
        
        return result 