from odoo import models, fields, api, _
from datetime import datetime, timedelta
from typing import Dict, Any, Optional


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
    deadline = fields.Datetime(string='Deadline')
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