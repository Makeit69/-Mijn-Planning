// State
let tasks = [];
let currentFilter = 'all';
let notificationSettings = {
    enabled: false,
    dailyReminder: true,
    dailyReminderTime: '09:00',
    taskReminders: true,
    reminderMinutes: 15,
    importantTaskExtra: true
};

// DOM Elements
const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const prioritySelect = document.getElementById('prioritySelect');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const durationSelect = document.getElementById('durationSelect');
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList = document.getElementById('tasksList');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const remainingTasksEl = document.getElementById('remainingTasks');
const notificationBtn = document.getElementById('notificationBtn');
const notificationModal = document.getElementById('notificationModal');
const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
const closeModalBtn = document.getElementById('closeModal');
const dailyTimeInput = document.getElementById('dailyTimeInput');
const reminderMinutesInput = document.getElementById('reminderMinutesInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Set today's date
function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = year + '-' + month + '-' + day;
}

// Load notification settings
function loadNotificationSettings() {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
        notificationSettings = JSON.parse(saved);
        dailyTimeInput.value = notificationSettings.dailyReminderTime;
        reminderMinutesInput.value = notificationSettings.reminderMinutes;
        updateNotificationButton();
    }
}

// Save notification settings
function saveNotificationSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
}

// Request notification permission
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('Je browser ondersteunt geen notificaties');
        return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        notificationSettings.enabled = true;
        saveNotificationSettings();
        updateNotificationButton();
        scheduleAllNotifications();
        showNotification('Notificaties aan!', 'Je krijgt nu herinneringen voor je taken');
        return true;
    } else {
        alert('Notificaties zijn geblokkeerd. Sta ze toe in je browser instellingen.');
        return false;
    }
}

// Show notification
function showNotification(title, body, tag) {
    if (notificationSettings.enabled && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'icon.png',
            badge: 'icon.png',
            tag: tag || 'mijn-planning',
            requireInteraction: false
        });
    }
}

// Update notification button
function updateNotificationButton() {
    if (notificationSettings.enabled) {
        notificationBtn.innerHTML = String.fromCodePoint(0x1F514) + ' Notificaties aan';
        notificationBtn.classList.add('active');
    } else {
        notificationBtn.innerHTML = String.fromCodePoint(0x1F515) + ' Notificaties uit';
        notificationBtn.classList.remove('active');
    }
}

// Schedule daily reminder
function scheduleDailyReminder() {
    if (!notificationSettings.enabled || !notificationSettings.dailyReminder) return;
    
    const now = new Date();
    const [hours, minutes] = notificationSettings.dailyReminderTime.split(':');
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntil = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
        checkDailyTasks();
        scheduleDailyReminder(); // Reschedule for next day
    }, timeUntil);
}

// Check daily tasks
function checkDailyTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTasks = tasks.filter(task => {
        if (task.completed || !task.date) return false;
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
    });
    
    if (todayTasks.length > 0) {
        const importantCount = todayTasks.filter(t => t.priority === 'hoog').length;
        let message = 'Je hebt ' + todayTasks.length + ' ' + (todayTasks.length === 1 ? 'taak' : 'taken') + ' voor vandaag';
        if (importantCount > 0) {
            message += ' (' + importantCount + ' belangrijk)';
        }
        showNotification('Goedemorgen!', message, 'daily-reminder');
    } else {
        showNotification('Goedemorgen!', 'Je agenda is leeg vandaag!', 'daily-reminder');
    }
}

// Schedule task notifications
function scheduleTaskNotifications() {
    if (!notificationSettings.enabled || !notificationSettings.taskReminders) return;
    
    const now = new Date();
    
    tasks.forEach(task => {
        if (task.completed || !task.date || !task.time) return;
        
        const [year, month, day] = task.date.split('-');
        const [hours, minutes] = task.time.split(':');
        const taskTime = new Date(year, month - 1, day, hours, minutes);
        
        // Schedule reminder before task
        const reminderTime = new Date(taskTime.getTime() - (notificationSettings.reminderMinutes * 60 * 1000));
        
        if (reminderTime > now) {
            const timeUntil = reminderTime.getTime() - now.getTime();
            setTimeout(() => {
                if (!task.completed) {
                    const timeStr = task.time;
                    showNotification(
                        'Herinnering: ' + task.text,
                        'Over ' + notificationSettings.reminderMinutes + ' minuten (' + timeStr + ')',
                        'task-' + task.id
                    );
                }
            }, timeUntil);
        }
        
        // Extra reminder for important tasks (1 hour before)
        if (task.priority === 'hoog' && notificationSettings.importantTaskExtra) {
            const hourBeforeTime = new Date(taskTime.getTime() - (60 * 60 * 1000));
            if (hourBeforeTime > now) {
                const timeUntil = hourBeforeTime.getTime() - now.getTime();
                setTimeout(() => {
                    if (!task.completed) {
                        showNotification(
                            String.fromCodePoint(0x26A0) + ' Belangrijke taak!',
                            task.text + ' - Over 1 uur (' + task.time + ')',
                            'important-' + task.id
                        );
                    }
                }, timeUntil);
            }
        }
    });
}

// Schedule all notifications
function scheduleAllNotifications() {
    scheduleDailyReminder();
    scheduleTaskNotifications();
}

// Load tasks from localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    scheduleTaskNotifications(); // Reschedule when tasks change
}

// Add task
function addTask() {
    const text = taskInput.value.trim();
    
    if (text === '') {
        taskInput.focus();
        return;
    }
    
    const task = {
        id: Date.now(),
        text: text,
        category: categorySelect.value,
        priority: prioritySelect.value,
        date: dateInput.value,
        time: timeInput.value,
        duration: durationSelect.value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(task);
    saveTasks();
    renderTasks();
    
    // Reset form
    taskInput.value = '';
    setTodayDate();
    timeInput.value = '';
    durationSelect.value = '';
    prioritySelect.value = 'normaal';
    categorySelect.value = 'persoonlijk';
    taskInput.focus();
}

// Delete task
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

// Toggle task completion
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

// Get category info
function getCategoryInfo(category) {
    const categories = {
        'persoonlijk': { emoji: String.fromCodePoint(0x1F3E0), name: 'Persoonlijk' },
        'werk': { emoji: String.fromCodePoint(0x1F4BC), name: 'Werk' },
        'boodschappen': { emoji: String.fromCodePoint(0x1F6D2), name: 'Boodschappen' },
        'huishouden': { emoji: String.fromCodePoint(0x1F9F9), name: 'Huishouden' },
        'gezondheid': { emoji: String.fromCodePoint(0x1F4AA), name: 'Gezondheid' },
        'overig': { emoji: String.fromCodePoint(0x1F4CC), name: 'Overig' }
    };
    return categories[category] || categories['overig'];
}

// Format time
function formatTime(timeString) {
    if (!timeString) return '';
    const clockEmoji = String.fromCodePoint(0x1F551);
    return clockEmoji + ' ' + timeString;
}

// Format duration
function formatDuration(minutes) {
    if (!minutes) return '';
    const hourglassEmoji = String.fromCodePoint(0x23F3);
    
    minutes = parseInt(minutes);
    if (minutes < 60) {
        return hourglassEmoji + ' ' + minutes + ' min';
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) {
            return hourglassEmoji + ' ' + hours + (hours === 1 ? ' uur' : ' uur');
        } else {
            return hourglassEmoji + ' ' + hours + 'u ' + mins + 'm';
        }
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const calendarEmoji = String.fromCodePoint(0x1F4C5);
    
    if (date.getTime() === today.getTime()) {
        return calendarEmoji + ' Vandaag';
    } else if (date.getTime() === tomorrow.getTime()) {
        return calendarEmoji + ' Morgen';
    } else {
        const options = { day: 'numeric', month: 'short' };
        return calendarEmoji + ' ' + date.toLocaleDateString('nl-NL', options);
    }
}

// Check if task is today
function isToday(dateString) {
    if (!dateString) return false;
    const taskDate = new Date(dateString);
    const today = new Date();
    taskDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime();
}

// Check if task is this week
function isThisWeek(dateString) {
    if (!dateString) return false;
    const taskDate = new Date(dateString);
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    taskDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    weekFromNow.setHours(0, 0, 0, 0);
    
    return taskDate.getTime() >= today.getTime() && taskDate.getTime() <= weekFromNow.getTime();
}

// Filter tasks
function filterTasks() {
    switch(currentFilter) {
        case 'today':
            return tasks.filter(task => !task.completed && isToday(task.date));
        case 'week':
            return tasks.filter(task => !task.completed && isThisWeek(task.date));
        case 'important':
            return tasks.filter(task => !task.completed && task.priority === 'hoog');
        case 'all':
        default:
            return tasks;
    }
}

// Render tasks
function renderTasks() {
    const filteredTasks = filterTasks();
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    
    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    remainingTasksEl.textContent = remaining;
    
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        tasksList.innerHTML = '';
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    tasksList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');
}

// Create task HTML
function createTaskHTML(task) {
    const categoryInfo = getCategoryInfo(task.category);
    const dateHTML = task.date ? '<span class="task-date">' + formatDate(task.date) + '</span>' : '';
    const timeHTML = task.time ? '<span class="task-time">' + formatTime(task.time) + '</span>' : '';
    const durationHTML = task.duration ? '<span class="task-duration">' + formatDuration(task.duration) + '</span>' : '';
    const completedClass = task.completed ? 'completed' : '';
    const checked = task.completed ? 'checked' : '';
    const priorityName = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    const trashEmoji = String.fromCodePoint(0x1F5D1);
    
    return '<div class="task-item ' + completedClass + '" data-id="' + task.id + '">' +
        '<input type="checkbox" class="task-checkbox" ' + checked + ' onchange="toggleTask(' + task.id + ')">' +
        '<div class="task-content">' +
            '<div class="task-text">' + escapeHtml(task.text) + '</div>' +
            '<div class="task-meta">' +
                '<span class="task-category">' + categoryInfo.emoji + ' ' + categoryInfo.name + '</span>' +
                '<span class="task-priority ' + task.priority + '">' + priorityName + '</span>' +
                dateHTML +
                timeHTML +
                durationHTML +
            '</div>' +
        '</div>' +
        '<button class="delete-btn" onclick="deleteTask(' + task.id + ')">' + trashEmoji + '</button>' +
    '</div>';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
addTaskBtn.addEventListener('click', addTask);

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

notificationBtn.addEventListener('click', () => {
    notificationModal.classList.add('show');
});

closeModalBtn.addEventListener('click', () => {
    notificationModal.classList.remove('show');
});

enableNotificationsBtn.addEventListener('click', async () => {
    await requestNotificationPermission();
});

saveSettingsBtn.addEventListener('click', () => {
    notificationSettings.dailyReminderTime = dailyTimeInput.value;
    notificationSettings.reminderMinutes = parseInt(reminderMinutesInput.value);
    saveNotificationSettings();
    scheduleAllNotifications();
    notificationModal.classList.remove('show');
    showNotification('Instellingen opgeslagen!', 'Je notificaties zijn bijgewerkt');
});

// Close modal on outside click
notificationModal.addEventListener('click', (e) => {
    if (e.target === notificationModal) {
        notificationModal.classList.remove('show');
    }
});

// Initialize
setTodayDate();
loadTasks();
loadNotificationSettings();
taskInput.focus();

// Schedule notifications if enabled
if (notificationSettings.enabled) {
    scheduleAllNotifications();
}