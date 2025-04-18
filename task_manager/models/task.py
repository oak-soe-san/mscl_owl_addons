from odoo import models, fields, api, _
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import pytz
import logging

_logger = logging.getLogger(__name__)


class Task(models.Model):
    _name = 'task.task'
    _description = 'Task'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'priority desc, deadline, id desc'

    name = fields.Char(string='Task Title', required=True, tracking=True)
    description = fields.Html(string='Description')
    active = fields.Boolean(default=True)
    
    # Task Status
    state = fields.Selection([
        ('draft', 'New'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled')
    ], string='Status', default='draft', tracking=True, required=True)
    
    # Task Categorization & Priority
    priority = fields.Selection([
        ('0', 'Low'),
        ('1', 'Medium'),
        ('2', 'High'),
        ('3', 'Urgent')
    ], string='Priority', default='1', tracking=True)
    tag_ids = fields.Many2many('task.tag', string='Tags')
    
    # Dates & Timing
    create_date = fields.Datetime(string='Created on', readonly=True)
    deadline_date = fields.Date(string='Deadline Date')
    deadline_time = fields.Char(string='Deadline Time', default='09:00')
    deadline = fields.Datetime(string='Deadline', compute='_compute_deadline', store=True)
    completed_date = fields.Datetime(string='Completed on', readonly=True)
    duration = fields.Float(string='Duration (Hours)', default=0.0)
    
    # People
    user_id = fields.Many2one('res.users', string='Assigned to', default=lambda self: self.env.user.id, tracking=True)
    created_by_id = fields.Many2one('res.users', string='Created by', default=lambda self: self.env.user.id, readonly=True)
    
    # Computed fields
    days_to_deadline = fields.Integer(string='Days to Deadline', compute='_compute_days_to_deadline', store=True)
    is_overdue = fields.Boolean(string='Is Overdue', compute='_compute_is_overdue', store=True)
    
    @api.depends('deadline')
    def _compute_days_to_deadline(self):
        """Calculate days remaining until the deadline"""
        today = fields.Datetime.now()
        for task in self:
            if task.deadline:
                diff = task.deadline - today
                task.days_to_deadline = diff.days
            else:
                task.days_to_deadline = 0
    
    @api.depends('deadline', 'state')
    def _compute_is_overdue(self):
        """Check if task is overdue"""
        now = fields.Datetime.now()
        for task in self:
            if task.deadline and task.state not in ['done', 'cancelled']:
                task.is_overdue = task.deadline < now
            else:
                task.is_overdue = False
    
    @api.depends('deadline_date', 'deadline_time')
    def _compute_deadline(self):
        """Compute full deadline datetime from date and time fields"""
        for task in self:
            if not task.deadline_date:
                task.deadline = False
                continue
                
            try:
                # Parse the time string (expecting format like "09:00")
                time_parts = task.deadline_time.split(':') if task.deadline_time else ['00', '00']
                hours = int(time_parts[0])
                minutes = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                # Create datetime object from date and time components
                deadline_date = fields.Date.from_string(task.deadline_date)
                deadline_datetime = datetime(
                    year=deadline_date.year,
                    month=deadline_date.month,
                    day=deadline_date.day,
                    hour=hours,
                    minute=minutes,
                )
                
                # Convert to UTC for storage
                user_tz = self.env.user.tz or 'UTC'
                local = pytz.timezone(user_tz)
                local_dt = local.localize(deadline_datetime, is_dst=None)
                task.deadline = local_dt.astimezone(pytz.UTC).replace(tzinfo=None)
            except Exception as e:
                _logger.error(f"Error computing deadline: {e}")
                # Fallback to just the date at midnight
                task.deadline = fields.Datetime.to_datetime(task.deadline_date)
    
    def action_start(self):
        """Mark task as in progress"""
        self.write({'state': 'in_progress'})
    
    def action_done(self):
        """Mark task as done"""
        self.write({
            'state': 'done',
            'completed_date': fields.Datetime.now()
        })
    
    def action_cancel(self):
        """Mark task as cancelled"""
        self.write({'state': 'cancelled'})
    
    def action_reset(self):
        """Reset task to draft state"""
        self.write({'state': 'draft'})
    
    @api.model
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get dashboard data for the current user"""
        user_id = self.env.user.id
        
        # Count tasks by status for current user
        domain = [('user_id', '=', user_id), ('active', '=', True)]
        
        result = {
            'total': self.search_count(domain),
            'new': self.search_count(domain + [('state', '=', 'draft')]),
            'in_progress': self.search_count(domain + [('state', '=', 'in_progress')]),
            'done': self.search_count(domain + [('state', '=', 'done')]),
            'cancelled': self.search_count(domain + [('state', '=', 'cancelled')]),
            'overdue': self.search_count(domain + [('is_overdue', '=', True)]),
        }
        
        # Get urgent tasks (priority = urgent)
        urgent_tasks = self.search_read(
            domain=domain + [('priority', '=', '3')],
            fields=['name', 'deadline', 'state'],
            limit=5,
            order='deadline asc, id desc'
        )
        result['urgent_tasks'] = urgent_tasks
        
        # Get recent tasks for the task list
        recent_tasks = self.search_read(
            domain=domain,
            fields=['id', 'name', 'state', 'deadline', 'priority', 'user_id', 'is_overdue'],
            limit=20,
            order='create_date desc'
        )
        result['recent_tasks'] = recent_tasks
        
        return result


class TaskTag(models.Model):
    _name = 'task.tag'
    _description = 'Task Tag'
    
    name = fields.Char(string='Name', required=True)
    color = fields.Integer(string='Color Index', default=10)
    task_ids = fields.Many2many('task.task', string='Tasks')


class TaskTimerState(models.Model):
    _name = 'task.timer.state'
    _description = 'Task Timer State'

    userId = fields.Many2one('res.users', string='User', required=True, ondelete='cascade', index=True)
    timerActive = fields.Boolean(string='Timer Active', default=False)
    timerPaused = fields.Boolean(string='Timer Paused', default=False)
    timerMinutes = fields.Integer(string='Timer Minutes', default=25)
    timerSeconds = fields.Integer(string='Timer Seconds', default=0)
    timerMode = fields.Char(string='Timer Mode', default='focus')
    timerProgress = fields.Integer(string='Timer Progress', default=0)
    currentPomodoroStreak = fields.Integer(string='Current Pomodoro Streak', default=0)
    completedPomodoros = fields.Integer(string='Completed Pomodoros', default=0)
    lastUpdate = fields.Datetime(string='Last Update', default=fields.Datetime.now)

    _sql_constraints = [
        ('user_unique', 'unique(userId)', 'Each user can only have one timer state.')
    ]

    @api.model
    def getUserTimerState(self, userId):
        return self.search([('userId', '=', userId)], limit=1)

    @api.model
    def saveUserTimerState(self, userId, timerData):
        timerState = self.getUserTimerState(userId)
        values = {
            'timerActive': timerData.get('timerActive', False),
            'timerPaused': timerData.get('timerPaused', False),
            'timerMinutes': timerData.get('timerMinutes', 25),
            'timerSeconds': timerData.get('timerSeconds', 0),
            'timerMode': timerData.get('timerMode', 'focus'),
            'timerProgress': timerData.get('timerProgress', 0),
            'currentPomodoroStreak': timerData.get('currentPomodoroStreak', 0),
            'completedPomodoros': timerData.get('completedPomodoros', 0),
            'lastUpdate': fields.Datetime.now(),
        }
        if timerState:
            timerState.write(values)
        else:
            values['userId'] = userId
            timerState = self.create(values)
        return timerState

    @api.model
    def resetUserTimerState(self, userId):
        timerState = self.getUserTimerState(userId)
        if timerState:
            timerState.unlink()
        return True