import axios from 'axios';

// הגדרת URL בסיס בהתאם לסביבת העבודה
const getBaseURL = () => {
    // בדיקה אם אנחנו בסביבת פרודקשן
    if (import.meta.env.PROD) {
        // URL של הבקאנד בפרודקשן
        return 'https://whatsapp-bot-server-hprc.onrender.com';
    } else {
        // URL של הבקאנד בפיתוח
        return 'http://localhost:5000';
    }
};

const API_BASE_URL = `${getBaseURL()}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

        // Add token to requests
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('API Error:', error.response?.data || error.message);

        // If unauthorized, clear token and redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        }

        return Promise.reject(error);
    }
);

// Auth API calls
export const authApi = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    register: (username, password) => api.post('/auth/register', { username, password }),
    updateProfile: (data) => api.put('/auth/profile', data),
    getUsers: () => api.get('/auth/users'),
    deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// WhatsApp API calls
export const whatsappApi = {
    // Get status
    getStatus: () => api.get('/whatsapp/status'),

    // Connect/Disconnect
    connect: () => api.post('/whatsapp/connect'),
    disconnect: () => api.post('/whatsapp/disconnect'),

    // Groups
    getGroups: () => api.get('/whatsapp/groups'),
    refreshGroups: () => api.post('/whatsapp/groups/refresh'),

    // Selected Groups
    getSelectedGroups: () => api.get('/whatsapp/selected-groups'),
    addSelectedGroup: (groupId, groupName) => api.post('/whatsapp/selected-groups/add', { groupId, groupName }),
    removeSelectedGroup: (groupId) => api.delete(`/whatsapp/selected-groups/${groupId}`),
    toggleSelectedGroup: (groupId) => api.patch(`/whatsapp/selected-groups/${groupId}/toggle`),

    // Send messages
    sendMessage: (phone, message) => api.post('/whatsapp/send', { phone, message }),
    sendToGroup: (groupId, message, imagePath = null) => api.post('/whatsapp/send-group', { groupId, message, imagePath }),
};

// Messages API calls
export const messagesApi = {
    // Daily message
    getDailyMessage: () => api.get('/messages/daily'),
    updateDailyMessage: (data) => api.put('/messages/daily', data),
    toggleDailyMessage: () => api.patch('/messages/daily/toggle'),

    // History
    getHistory: (page = 1, limit = 50) => api.get(`/messages/history?page=${page}&limit=${limit}`),
    clearHistory: () => api.delete('/messages/history'),

    // Stats
    getStats: () => api.get('/messages/stats'),

    // Templates
    getTemplates: () => api.get('/messages/templates'),
};

// Schedule API calls
export const scheduleApi = {
    // Get settings
    getSettings: () => api.get('/schedule'),
    updateSettings: (data) => api.put('/schedule', data),

    // Daily schedule
    updateDailySchedule: (time, enabled) => api.put('/schedule/daily', { time, enabled }),
    triggerDaily: () => api.post('/schedule/trigger'),

    // Tasks
    getTasks: () => api.get('/schedule/tasks'),
    getNextRuns: () => api.get('/schedule/next-runs'),

    // Timezones
    getTimezones: () => api.get('/schedule/timezones'),
};

// Contacts API calls (if needed for future)
export const contactsApi = {
    getAll: () => api.get('/contacts'),
    add: (data) => api.post('/contacts', data),
    update: (id, data) => api.put(`/contacts/${id}`, data),
    delete: (id) => api.delete(`/contacts/${id}`),
    toggle: (id) => api.patch(`/contacts/${id}/toggle`),
    bulk: (action, contactIds) => api.post('/contacts/bulk', { action, contactIds }),
};

// Upload API calls
export const uploadApi = {
    uploadImage: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        return api.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    getImages: () => api.get('/upload/images'),
    deleteImage: (filename) => api.delete(`/upload/image/${filename}`),
};

// פונקציה לקבלת URL בסיס לתמונות
export const getImageBaseURL = () => {
    return getBaseURL();
};

// פונקציה לקבלת URL מלא לתמונה של משתמש
export const getUserImageURL = (imagePath) => {
    const baseURL = getBaseURL();
    return `${baseURL}/${imagePath}`;
};

export default api;