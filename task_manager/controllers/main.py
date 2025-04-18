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

    @http.route('/task_manager/timer/get_state', type='json', auth='user')
    def get_timer_state(self):
        userId = request.env.user.id
        timerState = request.env['task.timer.state'].sudo().getUserTimerState(userId)
        if not timerState:
            return {}
        return {
            'timerActive': timerState.timerActive,
            'timerPaused': timerState.timerPaused,
            'timerMinutes': timerState.timerMinutes,
            'timerSeconds': timerState.timerSeconds,
            'timerMode': timerState.timerMode,
            'timerProgress': timerState.timerProgress,
            'currentPomodoroStreak': timerState.currentPomodoroStreak,
            'completedPomodoros': timerState.completedPomodoros,
            'lastUpdate': timerState.lastUpdate,
        }

    @http.route('/task_manager/timer/save_state', type='json', auth='user')
    def save_timer_state(self, timerData):
        userId = request.env.user.id
        request.env['task.timer.state'].sudo().saveUserTimerState(userId, timerData)
        return {'result': 'ok'}

    @http.route('/task_manager/timer/reset_state', type='json', auth='user')
    def reset_timer_state(self):
        userId = request.env.user.id
        request.env['task.timer.state'].sudo().resetUserTimerState(userId)
        return {'result': 'ok'}