/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, useState, onWillStart } from "@odoo/owl";

class TaskDashboard extends Component {
    static template = "task_manager.TaskDashboard";
    static props = {};

    setup() {
        this.state = useState({
            taskData: {
                total: 0,
                new: 0,
                in_progress: 0,
                done: 0,
                cancelled: 0,
                overdue: 0,
                urgent_tasks: [],
                recent_tasks: [],
            },
            isLoading: true,
            showQuickAdd: false,
            showTaskModal: false,
            newTask: {
                name: "",
                deadline: this.getTodayFormatted(),
                priority: "1",
                user_id: null // Initialize as null, will set after session is available
            },
            editTaskId: null,
            users: [],
            showSnackbar: false,
            snackbarMessage: "",
            filterStatus: "all",
            showDeleteModal: false,
            deleteTask: {
                id: null,
                name: ""
            }
        });

        this.orm = useService("orm");
        this.actionService = useService("action");
        this.notification = useService("notification");
        this.userService = useService("user");

        onWillStart(async () => {
            // Set current user in the task after services are initialized
            this.state.newTask.user_id = this.userService.userId;
            
            // Fetch users and dashboard data in parallel
            await Promise.all([
                this.fetchUsers(),
                this.fetchDashboardData()
            ]);
        });
    }

    getTodayFormatted() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    async fetchUsers() {
        try {
            const users = await this.orm.call(
                "res.users",
                "search_read",
                [[["active", "=", true]]],
                { fields: ["id", "name"] }
            );
            this.state.users = users || [];
            
            // Set current user as default if not already set and if userService is available
            if (!this.state.newTask.user_id && this.userService) {
                this.state.newTask.user_id = this.userService.userId;
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            this.notification.add("Couldn't load users, but you can still create tasks", {
                type: "warning",
            });
            // Set empty users array but ensure current user if available
            this.state.users = [];
            if (!this.state.newTask.user_id && this.userService) {
                this.state.newTask.user_id = this.userService.userId;
            }
        }
    }

    async fetchDashboardData() {
        this.state.isLoading = true;
        try {
            const result = await this.orm.call(
                "task.task",
                "get_dashboard_data",
                [],
                {}
            );
            this.state.taskData = result;
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            this.state.isLoading = false;
        }
    }

    openTasks(state = null) {
        const action = {
            type: "ir.actions.act_window",
            name: "Tasks",
            res_model: "task.task",
            views: [[false, "list"], [false, "form"]],
            context: {},
            domain: [],
        };
        
        if (state) {
            action.domain.push(["state", "=", state]);
            action.name = this.getStateName(state);
        }
        
        this.actionService.doAction(action);
    }
    
    openOverdueTasks() {
        const action = {
            type: "ir.actions.act_window",
            name: "Overdue Tasks",
            res_model: "task.task",
            views: [[false, "list"], [false, "form"]],
            domain: [["is_overdue", "=", true]],
        };
        this.actionService.doAction(action);
    }
    
    getStateName(state) {
        const stateNames = {
            'draft': 'New Tasks',
            'in_progress': 'In Progress Tasks',
            'done': 'Completed Tasks',
            'cancelled': 'Cancelled Tasks',
        };
        return stateNames[state] || 'Tasks';
    }
    
    refreshData() {
        this.fetchDashboardData();
        this.showSnackbar("Dashboard refreshed");
    }

    // Task modal functionality
    toggleTaskModal() {
        this.state.showTaskModal = !this.state.showTaskModal;
        if (!this.state.showTaskModal) {
            this.resetTaskForm();
        }
    }
    
    closeTaskModal() {
        this.state.showTaskModal = false;
        this.resetTaskForm();
    }

    resetTaskForm() {
        this.state.newTask = {
            name: "",
            deadline: this.getTodayFormatted(),
            priority: "1",
            user_id: this.userService.userId // Use userService instead of env.session
        };
        this.state.editTaskId = null;
    }

    // Keep toggleQuickAdd for backward compatibility
    toggleQuickAdd() {
        this.toggleTaskModal();
    }

    async createTask() {
        if (!this.state.newTask.name || this.state.newTask.name.trim() === "") {
            this.notification.add("Task title is required", {
                type: "warning",
            });
            return;
        }

        try {
            const taskData = {
                name: this.state.newTask.name.trim(),
                priority: this.state.newTask.priority,
                user_id: this.state.newTask.user_id || this.userService.userId,
            };

            // Set deadline if provided, otherwise set to today
            if (this.state.newTask.deadline) {
                taskData.deadline = this.state.newTask.deadline;
            } else {
                taskData.deadline = this.getTodayFormatted();
            }

            if (this.state.editTaskId) {
                // Edit existing task
                await this.orm.write("task.task", [this.state.editTaskId], taskData);
                this.showSnackbar("Task updated successfully");
            } else {
                // Create new task
                await this.orm.create("task.task", [taskData]);
                this.showSnackbar("Task created successfully");
            }

            this.closeTaskModal(); // Use the new method to close the modal
            await this.fetchDashboardData();
        } catch (error) {
            console.error("Error saving task:", error);
            this.notification.add("Failed to save task: " + (error.message || "Unknown error"), {
                type: "danger",
            });
        }
    }

    async editTask(taskId) {
        try {
            const task = await this.orm.read("task.task", [taskId], [
                "name", "deadline", "priority", "user_id"
            ]);
            
            if (task && task.length > 0) {
                // Convert user_id to proper format - it might be [id, name] or false
                let userId = this.userService.userId;
                if (task[0].user_id) {
                    userId = Array.isArray(task[0].user_id) ? task[0].user_id[0] : task[0].user_id;
                }
                
                this.state.newTask = {
                    name: task[0].name,
                    deadline: task[0].deadline || this.getTodayFormatted(),
                    priority: String(task[0].priority), // Ensure priority is a string
                    user_id: userId
                };
                this.state.editTaskId = taskId;
                this.state.showTaskModal = true;
            } else {
                throw new Error("Task not found");
            }
        } catch (error) {
            console.error("Error loading task for edit:", error);
            this.notification.add("Failed to load task: " + (error.message || "Unknown error"), {
                type: "danger",
            });
        }
    }

    confirmDeleteTask(taskId, taskName) {
        this.state.deleteTask = {
            id: taskId,
            name: taskName
        };
        this.state.showDeleteModal = true;
    }

    cancelDelete() {
        this.state.showDeleteModal = false;
        this.state.deleteTask = {
            id: null,
            name: ""
        };
    }

    confirmDelete() {
        const taskId = this.state.deleteTask.id;
        if (taskId) {
            this.deleteTask(taskId);
        }
        this.state.showDeleteModal = false;
    }

    async deleteTask(taskId) {
        try {
            await this.orm.unlink("task.task", [taskId]);
            this.showSnackbar("Task deleted successfully");
            await this.fetchDashboardData();
        } catch (error) {
            console.error("Error deleting task:", error);
            this.notification.add("Failed to delete task", {
                type: "danger",
            });
        }
    }

    async markTaskDone(taskId) {
        try {
            await this.orm.call("task.task", "action_done", [taskId]);
            this.showSnackbar("Task marked as done");
            await this.fetchDashboardData();
        } catch (error) {
            console.error("Error marking task as done:", error);
            this.notification.add("Failed to update task status", {
                type: "danger",
            });
        }
    }

    async startTask(taskId) {
        try {
            await this.orm.call("task.task", "action_start", [taskId]);
            this.showSnackbar("Task started");
            await this.fetchDashboardData();
        } catch (error) {
            console.error("Error starting task:", error);
            this.notification.add("Failed to update task status", {
                type: "danger",
            });
        }
    }

    filterTasks(status) {
        this.state.filterStatus = status;
    }

    getFilteredTasks() {
        if (!this.state.taskData.recent_tasks) return [];
        
        if (this.state.filterStatus === "all") {
            return this.state.taskData.recent_tasks;
        }
        
        return this.state.taskData.recent_tasks.filter(
            task => task.state === this.state.filterStatus
        );
    }

    showSnackbar(message) {
        this.state.snackbarMessage = message;
        this.state.showSnackbar = true;
        
        setTimeout(() => {
            this.state.showSnackbar = false;
        }, 3000);
    }

    onFormKeydown(event) {
        // Handle Enter key to create/update task
        if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
            event.preventDefault();
            this.createTask();
        }
        // Handle Escape key to close the form
        else if (event.key === "Escape") {
            event.preventDefault();
            this.closeTaskModal();
        }
    }

    getPriorityClass(priority) {
        const classes = {
            '0': 'bg-light',
            '1': 'bg-info',
            '2': 'bg-warning',
            '3': 'bg-danger'
        };
        return classes[priority] || 'bg-light';
    }

    getPriorityName(priority) {
        const names = {
            '0': 'Low',
            '1': 'Normal',
            '2': 'High',
            '3': 'Urgent'
        };
        return names[priority] || 'Normal';
    }
}

registry.category("actions").add("task_manager.dashboard", TaskDashboard);

export default TaskDashboard; 