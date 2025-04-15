/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, useState, onWillStart, useEffect } from "@odoo/owl";

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
                deadline_date: this.getTodayDateFormatted(),
                deadline_time: "09:00",
                priority: "1",
                user_id: null // Initialize as null, will set after session is available
            },
            editTaskId: null,
            users: [],
            showSnackbar: false,
            snackbarMessage: "",
            showDeleteModal: false,
            deleteTask: {
                id: null,
                name: ""
            },
            isSubmitting: false,
            
            // Pomodoro Timer State
            timerActive: false,
            timerMinutes: 25,
            timerSeconds: 0,
            timerProgress: 0,
            timerMode: {
                id: 'focus',
                label: 'Focus Time',
                duration: 25,
                color: '#4285f4'
            },
            timerModes: {
                focus: { id: 'focus', label: 'Focus Time', duration: 25, color: '#4285f4' },
                shortBreak: { id: 'shortBreak', label: 'Short Break', duration: 5, color: '#34a853' },
                longBreak: { id: 'longBreak', label: 'Long Break', duration: 15, color: '#4285f4' }
            },
            completedPomodoros: 0,
            pomodoroGoal: 4,
            currentPomodoroStreak: 0,
            selectedPomodoroTask: null,
            timerIntervalId: null,
            
            // News Ticker State
            newsTickerPaused: false,
            newsItems: [
                { icon: 'newspaper-o', text: 'New feature released: Task prioritization now includes AI recommendations' },
                { icon: 'bar-chart', text: 'Productivity increased by 27% with the Pomodoro technique' },
                { icon: 'calendar-check-o', text: 'Users completing 4+ pomodoros daily report better work-life balance' },
                { icon: 'lightbulb-o', text: 'Tip: Use task categories to better organize your workflow' },
                { icon: 'line-chart', text: 'Studies show taking regular breaks improves focus by up to 45%' }
            ],
            
            // Weather State
            weather: {
                loading: true,
                error: null,
                data: null,
                location: {
                    lat: null,
                    lon: null,
                    city: ''
                }
            },
            
            // Theme System - New Addition
            themeSystem: {
                currentTheme: 'lakers',
                showThemeSelector: false,
                themes: {
                    'lakers': {
                        name: 'Los Angeles Lakers',
                        primaryColor: '#552583',
                        secondaryColor: '#FDB927',
                        accentColor: '#000000',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#311B92'
                    },
                    'warriors': {
                        name: 'Golden State Warriors',
                        primaryColor: '#1D428A',
                        secondaryColor: '#FFC72C',
                        accentColor: '#006BB6',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#0A2240'
                    },
                    'celtics': {
                        name: 'Boston Celtics',
                        primaryColor: '#007A33',
                        secondaryColor: '#BA9653',
                        accentColor: '#963821',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#005A2B'
                    },
                    'bulls': {
                        name: 'Chicago Bulls',
                        primaryColor: '#CE1141',
                        secondaryColor: '#000000',
                        accentColor: '#B4975A',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#8A1538'
                    },
                    'heat': {
                        name: 'Miami Heat',
                        primaryColor: '#98002E',
                        secondaryColor: '#F9A01B',
                        accentColor: '#000000',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#600026'
                    },
                    'spurs': {
                        name: 'San Antonio Spurs',
                        primaryColor: '#C4CED4',
                        secondaryColor: '#000000',
                        accentColor: '#BAC3C9',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#707271'
                    },
                    'knicks': {
                        name: 'New York Knicks',
                        primaryColor: '#006BB6',
                        secondaryColor: '#F58426',
                        accentColor: '#BEC0C2',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#003A70'
                    },
                    'suns': {
                        name: 'Phoenix Suns',
                        primaryColor: '#1D1160',
                        secondaryColor: '#E56020',
                        accentColor: '#63727A',
                        textColor: '#222',
                        backgroundColor: '#F5F5F5',
                        cardBackgroundColor: '#fff',
                        buttonHoverColor: '#120933'
                    }
                }
            }
        });

        this.orm = useService("orm");
        this.actionService = useService("action");
        this.notification = useService("notification");
        this.userService = useService("user");

        // Add a global escape key handler
        this.escKeyHandler = this.handleEscapeKey.bind(this);
        document.addEventListener('keydown', this.escKeyHandler);

        onWillStart(async () => {
            // Set current user in the task after services are initialized
            this.state.newTask.user_id = this.userService.userId;
            
            // Fetch users and dashboard data in parallel
            await Promise.all([
                this.fetchUsers(),
                this.fetchDashboardData(),
                this.loadUserThemePreference()
            ]);
            
            // Initialize weather data
            this.initWeather();
        });
        
        // Apply the theme immediately when mounted and whenever it changes
        useEffect(() => {
            this.applyTheme(this.state.themeSystem.currentTheme);
        }, () => [this.state.themeSystem.currentTheme]);
    }
    
    // Load user theme preference from browser storage
    async loadUserThemePreference() {
        try {
            // Check localStorage for theme preference
            const savedTheme = localStorage.getItem('taskDashboardTheme');
            if (savedTheme && this.state.themeSystem.themes[savedTheme]) {
                this.state.themeSystem.currentTheme = savedTheme;
            }
        } catch (error) {
            console.error('Error loading theme preference:', error);
            // Fallback to default theme
        }
    }
    
    // Save user theme preference to browser storage
    saveThemePreference(themeName) {
        try {
            localStorage.setItem('taskDashboardTheme', themeName);
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    }
    
    // Apply theme to the dashboard
    applyTheme(themeName) {
        const theme = this.state.themeSystem.themes[themeName];
        if (!theme) return;
        
        // Apply theme using CSS variables at the document root level
        const root = document.documentElement;
        
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--secondary-color', theme.secondaryColor);
        root.style.setProperty('--accent-color', theme.accentColor);
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--background-color', theme.backgroundColor);
        root.style.setProperty('--card-background-color', theme.cardBackgroundColor);
        root.style.setProperty('--button-hover-color', theme.buttonHoverColor);
        
        // Animate theme change
        root.style.transition = 'background-color 0.8s cubic-bezier(0.4,0,0.2,1), color 0.8s cubic-bezier(0.4,0,0.2,1)';
        
        // Update Pomodoro timer colors based on theme
        this.updateTimerColorsForTheme(theme);
    }
    
    // Update timer colors based on current theme
    updateTimerColorsForTheme(theme) {
        // Update the timer mode colors based on the current theme
        this.state.timerModes.focus.color = theme.primaryColor;
        this.state.timerModes.shortBreak.color = theme.secondaryColor;
        this.state.timerModes.longBreak.color = theme.accentColor;
        
        // Update current timer mode color if active
        if (this.state.timerMode) {
            const modeId = this.state.timerMode.id;
            this.state.timerMode.color = this.state.timerModes[modeId].color;
        }
        
        // Update the timer style if it's currently displayed
        this.updateTimerStyle();
    }
    
    // Toggle theme picker visibility
    toggleThemeSelector() {
        this.state.themeSystem.showThemeSelector = !this.state.themeSystem.showThemeSelector;
    }
    
    // Change the current theme
    changeTheme(themeName) {
        if (this.state.themeSystem.themes[themeName]) {
            this.state.themeSystem.currentTheme = themeName;
            this.saveThemePreference(themeName);
            // Do NOT close the theme selector here
        }
    }
    
    // Cleanup when component is destroyed
    __destroy() {
        document.removeEventListener('keydown', this.escKeyHandler);
        
        // Clear any active timer
        if (this.state.timerIntervalId) {
            clearInterval(this.state.timerIntervalId);
        }
        
        // Play notification sound if it exists
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement = null;
        }
    }
    
    // Weather Functions
    async initWeather() {
        try {
            this.state.weather.loading = true;
            
            // Try to get location from browser
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        this.state.weather.location = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        };
                        this.fetchWeatherData();
                    },
                    error => {
                        console.error("Geolocation error:", error);
                        // Fallback to a default location (Paris)
                        this.state.weather.location = { lat: 48.8566, lon: 2.3522 };
                        this.fetchWeatherData();
                    }
                );
            } else {
                // Geolocation not supported, use default location
                this.state.weather.location = { lat: 48.8566, lon: 2.3522 };
                this.fetchWeatherData();
            }
        } catch (error) {
            console.error("Weather initialization error:", error);
            this.state.weather.loading = false;
            this.state.weather.error = "Could not initialize weather service";
        }
    }
    
    async fetchWeatherData() {
        try {
            this.state.weather.loading = true;
            this.state.weather.error = null;
            
            // Get API key from system parameters (should be stored in Odoo)
            const apiKeyResult = await this.orm.call(
                "ir.config_parameter",
                "get_param",
                ["task_manager.openweather_api_key"]
            );
            
            // Check if API key is available
            const apiKey = apiKeyResult || '7d85dc6895579f718c0a92dabc2b9b89'; // Demo API key (limited usage)
            
            if (!apiKey) {
                throw new Error("OpenWeather API key not configured");
            }
            
            // Make API request to OpenWeatherMap
            const { lat, lon } = this.state.weather.location;
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
            );
            
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.state.weather.data = data;
            this.state.weather.loading = false;
            
        } catch (error) {
            console.error("Weather data fetch error:", error);
            this.state.weather.loading = false;
            this.state.weather.error = "Could not load weather data";
        }
    }
    
    refreshWeather() {
        this.fetchWeatherData();
    }
    
    // Handle escape key globally
    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            if (this.state.showTaskModal) {
                this.closeTaskModal();
            } else if (this.state.showDeleteModal) {
                this.cancelDelete();
            }
        }
    }

    getTodayDateFormatted() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    
    // Get current time in HH:MM format
    getCurrentTimeFormatted() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${hh}:${min}`;
    }
    
    // Return datetime in Odoo's expected format
    formatDateAndTimeToOdoo(date, time) {
        if (!date) return false;
        
        try {
            // Format as YYYY-MM-DD HH:MM:SS
            return `${date} ${time || '00:00'}:00`;
        } catch (error) {
            console.error("Error formatting date and time:", error);
            return false;
        }
    }

    getDateOnlyFormatted(dateTimeStr) {
        if (!dateTimeStr) return '';
        
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return '';
            
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            
            return `${yyyy}-${mm}-${dd}`;
        } catch (error) {
            console.error("Error extracting date:", error);
            return '';
        }
    }
    
    // Extract time only from datetime string
    getTimeOnlyFormatted(dateTimeStr) {
        if (!dateTimeStr) return '';
        
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return '';
            
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            
            return `${hh}:${min}`;
        } catch (error) {
            console.error("Error extracting time:", error);
            return '';
        }
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
        } else {
            // Focus the input field when modal opens
            setTimeout(() => {
                const titleInput = document.querySelector('.task-modal-content input[type="text"]');
                if (titleInput) {
                    titleInput.focus();
                }
            }, 50); // Short delay to ensure the DOM is ready
        }
    }
    
    closeTaskModal() {
        // Add animation class first
        const modalElement = document.querySelector('.task-modal-backdrop');
        if (modalElement) {
            modalElement.classList.add('fade-out');
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                this.state.showTaskModal = false;
                this.resetTaskForm();
            }, 300); // Match this with the CSS animation duration
        } else {
            // Fallback if element not found
            this.state.showTaskModal = false;
            this.resetTaskForm();
        }
    }

    resetTaskForm() {
        this.state.newTask = {
            name: "",
            deadline_date: this.getTodayDateFormatted(),
            deadline_time: "09:00",
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

        // Prevent double submission
        if (this.state.isSubmitting) {
            return;
        }
        
        this.state.isSubmitting = true;

        try {
            const taskData = {
                name: this.state.newTask.name.trim(),
                priority: this.state.newTask.priority,
                user_id: this.state.newTask.user_id || this.userService.userId,
            };

            // Set deadline date and time if provided
            if (this.state.newTask.deadline_date) {
                taskData.deadline_date = this.state.newTask.deadline_date;
            }
            
            if (this.state.newTask.deadline_time) {
                taskData.deadline_time = this.state.newTask.deadline_time;
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
        } finally {
            this.state.isSubmitting = false;
        }
    }
    
    // Helper method to convert dates to Odoo format
    formatDateForOdoo(dateStr) {
        try {
            // If it's already in the correct format, return it
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                return dateStr;
            }
            
            // Handle ISO format or other formats
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                console.error("Invalid date format:", dateStr);
                return this.formatDateAndTimeToOdoo(this.getTodayDateFormatted(), this.getCurrentTimeFormatted()); // Fallback to today
            }
            
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            
            return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
        } catch (error) {
            console.error("Error formatting date:", error);
            return this.formatDateAndTimeToOdoo(this.getTodayDateFormatted(), this.getCurrentTimeFormatted()); // Fallback to today
        }
    }

    async editTask(taskId) {
        try {
            const task = await this.orm.read("task.task", [taskId], [
                "name", "deadline", "deadline_date", "deadline_time", "priority", "user_id"
            ]);
            
            if (task && task.length > 0) {
                // Convert user_id to proper format - it might be [id, name] or false
                let userId = this.userService.userId;
                if (task[0].user_id) {
                    userId = Array.isArray(task[0].user_id) ? task[0].user_id[0] : task[0].user_id;
                }
                
                // Get date and time from fields or from deadline
                let deadlineDate = task[0].deadline_date || '';
                let deadlineTime = task[0].deadline_time || "09:00";
                
                // If we have a deadline but no date/time fields (backward compatibility)
                if (task[0].deadline && (!deadlineDate || !deadlineTime)) {
                    deadlineDate = this.getDateOnlyFormatted(task[0].deadline);
                    deadlineTime = this.getTimeOnlyFormatted(task[0].deadline) || "09:00";
                }
                
                this.state.newTask = {
                    name: task[0].name,
                    deadline_date: deadlineDate || this.getTodayDateFormatted(),
                    deadline_time: deadlineTime,
                    priority: String(task[0].priority), // Ensure priority is a string
                    user_id: userId
                };
                this.state.editTaskId = taskId;
                this.state.showTaskModal = true;
                
                this.showSnackbar("Editing task: " + task[0].name);
                
                // Focus the input field after task is loaded
                setTimeout(() => {
                    const titleInput = document.querySelector('.task-modal-content input[type="text"]');
                    if (titleInput) {
                        titleInput.focus();
                    }
                }, 50);
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
        // Add animation to the modal entrance
        setTimeout(() => {
            const modalElement = document.querySelector('.delete-modal-backdrop');
            if (modalElement) {
                modalElement.classList.add('active');
            }
        }, 10);
    }

    cancelDelete() {
        // Add animation class first
        const modalElement = document.querySelector('.delete-modal-backdrop');
        if (modalElement) {
            modalElement.classList.add('fade-out');
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                this.state.showDeleteModal = false;
                this.state.deleteTask = {
                    id: null,
                    name: ""
                };
            }, 300); // Match this with the CSS animation duration
        } else {
            // Fallback if element not found
            this.state.showDeleteModal = false;
            this.state.deleteTask = {
                id: null,
                name: ""
            };
        }
    }

    confirmDelete() {
        const taskId = this.state.deleteTask.id;
        
        // Add animation class first
        const modalElement = document.querySelector('.delete-modal-backdrop');
        if (modalElement) {
            modalElement.classList.add('fade-out');
            
            // Wait for animation to complete before hiding and deleting
            setTimeout(() => {
                if (taskId) {
                    this.deleteTask(taskId);
                }
                this.state.showDeleteModal = false;
            }, 300); // Match this with the CSS animation duration
        } else {
            // Fallback if element not found
            if (taskId) {
                this.deleteTask(taskId);
            }
            this.state.showDeleteModal = false;
        }
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
            await this.orm.call(
                "task.task",
                "action_done",
                [[taskId]]
            );
            this.showSnackbar("Task marked as done");
            this.refreshData();
        } catch (error) {
            console.error("Error marking task as done:", error);
        }
    }

    async startTask(taskId) {
        try {
            await this.orm.call(
                "task.task",
                "action_start",
                [[taskId]]
            );
            this.showSnackbar("Task started");
            this.refreshData();
        } catch (error) {
            console.error("Error starting task:", error);
        }
    }

    showSnackbar(message) {
<<<<<<< HEAD
        // Remove notification for theme change
        if (message && message.startsWith('Theme changed to')) return;
        this.state.snackbarMessage = message;
        this.state.showSnackbar = true;
        setTimeout(() => {
            this.state.showSnackbar = false;
        }, 3000);
=======
        // Completely disable all notifications/snackbar
        return;
>>>>>>> e5fdbe7 (feat(task_manager): nba theme palette and fixed dropdown width)
    }

    onFormKeydown(event) {
        console.log("Key pressed:", event.key); // Add debugging
        
        // Handle Enter key to create/update task
        if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
            event.preventDefault();
            this.createTask();
        }
        // Handle Escape key to close the form
        else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            this.closeTaskModal();
        }
    }

    formatDateTime(dateTimeStr) {
        // If not a valid date string, return as is
        if (!dateTimeStr) return '';
        
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return dateTimeStr;
            
            const options = { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            return date.toLocaleDateString(undefined, options);
        } catch (error) {
            console.error("Error formatting date:", error);
            return dateTimeStr;
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

    // Pomodoro Timer Functions
    startPomodoro() {
        if (this.state.timerActive) return;
        
        this.state.timerActive = true;
        
        // Reset the timer to the current mode's duration
        this.state.timerMinutes = this.state.timerMode.duration;
        this.state.timerSeconds = 0;
        this.state.timerProgress = 0;
        
        // Apply the color to the progress circle
        this.updateTimerStyle();
        
        // Calculate total seconds for the progress calculation
        const totalSeconds = this.state.timerMode.duration * 60;
        let elapsedSeconds = 0;
        
        // Clear any existing interval
        if (this.state.timerIntervalId) {
            clearInterval(this.state.timerIntervalId);
        }
        
        // Start the timer interval
        const intervalId = setInterval(() => {
            // Update seconds and minutes
            if (this.state.timerSeconds === 0) {
                if (this.state.timerMinutes === 0) {
                    // Timer complete
                    this.timerComplete();
                    return;
                }
                this.state.timerMinutes--;
                this.state.timerSeconds = 59;
            } else {
                this.state.timerSeconds--;
            }
            
            // Update progress percentage
            elapsedSeconds++;
            this.state.timerProgress = Math.round((elapsedSeconds / totalSeconds) * 100);
            
            // Update the progress circle style
            this.updateTimerStyle();
            
        }, 1000);
        
        this.state.timerIntervalId = intervalId;
        
        // Show notification
        this.showSnackbar(`${this.state.timerMode.label} started`);
    }
    
    updateTimerStyle() {
        // Find the timer-progress element and update its CSS variables
        setTimeout(() => {
            const progressEl = document.querySelector('.timer-progress');
            if (progressEl) {
                progressEl.style.setProperty('--progress-percent', `${this.state.timerProgress}%`);
                progressEl.style.setProperty('--progress-color', this.state.timerMode.color);
            }
        }, 0);
    }
    
    stopPomodoro() {
        if (!this.state.timerActive) return;
        
        // Clear the interval
        if (this.state.timerIntervalId) {
            clearInterval(this.state.timerIntervalId);
            this.state.timerIntervalId = null;
        }
        
        this.state.timerActive = false;
        
        // Reset the timer to the current mode's duration
        this.state.timerMinutes = this.state.timerMode.duration;
        this.state.timerSeconds = 0;
        this.state.timerProgress = 0;
        
        // Show notification
        this.showSnackbar(`${this.state.timerMode.label} stopped`);
    }
    
    timerComplete() {
        // Clear the interval
        if (this.state.timerIntervalId) {
            clearInterval(this.state.timerIntervalId);
            this.state.timerIntervalId = null;
        }
        
        // Play notification sound if available
        this.playNotificationSound();
        
        // Update completed count and streak if it was a focus session
        if (this.state.timerMode.id === 'focus') {
            this.state.completedPomodoros++;
            this.state.currentPomodoroStreak++;
            
            // If we have a selected task, mark progress
            if (this.state.selectedPomodoroTask) {
                // Get the selected task data
                const taskId = this.state.selectedPomodoroTask.id;
                
                // If task is in draft, start it
                if (this.state.selectedPomodoroTask.state === 'draft') {
                    this.startTask(taskId);
                    
                    // Update the stored task
                    this.state.selectedPomodoroTask.state = 'in_progress';
                }
            }
            
            // Show notification
            this.showSnackbar("Focus session completed! Take a break.");
            
            // Auto switch to short break or long break
            if (this.state.currentPomodoroStreak % 4 === 0) {
                this.setTimerMode('longBreak');
            } else {
                this.setTimerMode('shortBreak');
            }
        } else {
            // Break time completed
            this.showSnackbar("Break time completed! Ready for another focus session?");
            this.setTimerMode('focus');
        }
        
        this.state.timerActive = false;
    }
    
    setTimerMode(modeId) {
        const mode = this.state.timerModes[modeId];
        if (!mode) return;
        
        // Stop any active timer
        if (this.state.timerActive) {
            this.stopPomodoro();
        }
        
        // Set the new mode
        this.state.timerMode = mode;
        this.state.timerMinutes = mode.duration;
        this.state.timerSeconds = 0;
        this.state.timerProgress = 0;
        
        // Update the progress circle style
        this.updateTimerStyle();
    }
    
    formatTime(value) {
        return value < 10 ? `0${value}` : `${value}`;
    }
    
    playNotificationSound() {
        try {
            if (!this.audioElement) {
                this.audioElement = new Audio();
                this.audioElement.src = '/mscl_owl_addons/task_manager/static/src/sounds/notification.mp3';
            }
            this.audioElement.play();
        } catch (error) {
            console.error("Error playing notification sound:", error);
        }
    }
    
    selectPomodoroTask(task) {
        // Set the selected task
        this.state.selectedPomodoroTask = task;
        this.showSnackbar(`Task "${task.name}" selected for focus session`);
    }
    
    toggleTaskSelection(task) {
        // Toggle selection - if the task is already selected, deselect it
        if (this.state.selectedPomodoroTask && this.state.selectedPomodoroTask.id === task.id) {
            // Currently selected, so deselect it
            this.state.selectedPomodoroTask = null;
            this.showSnackbar(`Deselected task "${task.name}"`);
        } else {
            // Not selected, so select it
            this.state.selectedPomodoroTask = task;
            this.showSnackbar(`Selected task "${task.name}" for focus session`);
        }
    }
    
    clearPomodoroTask() {
        this.state.selectedPomodoroTask = null;
        this.showSnackbar("Task unselected");
    }
    
    getOpenTasks() {
        // Get tasks that are not done or cancelled
        if (!this.state.taskData.recent_tasks) return [];
        
        return this.state.taskData.recent_tasks.filter(
            task => !['done', 'cancelled'].includes(task.state)
        ); // Remove the 10-task limit since we have a scrollable view now
    }

    // News Ticker Functions
    toggleNewsTickerPause() {
        this.state.newsTickerPaused = !this.state.newsTickerPaused;
        this.showSnackbar(this.state.newsTickerPaused ? "News ticker paused" : "News ticker resumed");
    }
}

registry.category("actions").add("task_manager.dashboard", TaskDashboard);

export default TaskDashboard;