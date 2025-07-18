import { useState, useEffect, useCallback } from 'react';
import { whatsappApi, messagesApi, scheduleApi } from '../utils/api';

export const useWhatsApp = () => {
    const [status, setStatus] = useState({
        connected: false,
        qrCode: null,
        groupsCount: 0,
        loading: true
    });
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await whatsappApi.getStatus();
            setStatus(prev => ({ ...prev, ...response.data.data, loading: false }));
        } catch (error) {
            console.error('Error fetching WhatsApp status:', error);
            setStatus(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const fetchGroups = useCallback(async () => {
        try {
            const response = await whatsappApi.getGroups();
            setGroups(response.data.data);
        } catch (error) {
            console.error('Error fetching groups:', error);
            setGroups([]);
        }
    }, []);

    const fetchSelectedGroups = useCallback(async () => {
        try {
            const response = await whatsappApi.getSelectedGroups();
            setSelectedGroups(response.data.data);
        } catch (error) {
            console.error('Error fetching selected groups:', error);
            setSelectedGroups([]);
        }
    }, []);

    const addSelectedGroup = useCallback(async (groupId, groupName) => {
        try {
            const response = await whatsappApi.addSelectedGroup(groupId, groupName);
            if (response.data.success) {
                setSelectedGroups(response.data.data);
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    const removeSelectedGroup = useCallback(async (groupId) => {
        try {
            const response = await whatsappApi.removeSelectedGroup(groupId);
            if (response.data.success) {
                setSelectedGroups(response.data.data);
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    const toggleSelectedGroup = useCallback(async (groupId) => {
        try {
            const response = await whatsappApi.toggleSelectedGroup(groupId);
            if (response.data.success) {
                setSelectedGroups(response.data.data);
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    const refreshGroups = useCallback(async () => {
        try {
            const response = await whatsappApi.refreshGroups();
            setGroups(response.data.data);
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Error refreshing groups:', error);
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    const connect = useCallback(async () => {
        setStatus(prev => ({ ...prev, loading: true }));
        try {
            const response = await whatsappApi.connect();
            if (response.data.success) {
                await fetchStatus();
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            setStatus(prev => ({ ...prev, loading: false }));
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, [fetchStatus]);

    const disconnect = useCallback(async () => {
        try {
            const response = await whatsappApi.disconnect();
            await fetchStatus();
            setGroups([]);
            setSelectedGroups([]);
            return { success: true, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, [fetchStatus]);

    const sendToGroup = useCallback(async (groupId, message, imagePath = null) => {
        try {
            const response = await whatsappApi.sendToGroup(groupId, message, imagePath);
            return { success: true, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Check status every 5 seconds
        return () => clearInterval(interval);
    }, [fetchStatus]);

    useEffect(() => {
        if (status.connected) {
            if (groups.length === 0) {
                fetchGroups();
            }
            fetchSelectedGroups();
        }
    }, [status.connected, groups.length, fetchGroups, fetchSelectedGroups]);

    return {
        status,
        groups,
        selectedGroups,
        connect,
        disconnect,
        sendToGroup,
        refreshGroups,
        refreshStatus: fetchStatus,
        addSelectedGroup,
        removeSelectedGroup,
        toggleSelectedGroup,
        refreshSelectedGroups: fetchSelectedGroups
    };
};

export const useMessages = () => {
    const [dailyMessage, setDailyMessage] = useState({
        text: '',
        time: '11:00',
        enabled: true,
        imagePath: null,
        loading: true
    });
    const [stats, setStats] = useState({});
    const [history, setHistory] = useState([]);

    const fetchDailyMessage = useCallback(async () => {
        try {
            const response = await messagesApi.getDailyMessage();
            setDailyMessage(prev => ({
                ...prev,
                ...response.data.data,
                loading: false
            }));
        } catch (error) {
            console.error('Error fetching daily message:', error);
            setDailyMessage(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const updateDailyMessage = useCallback(async (data) => {
        try {
            const response = await messagesApi.updateDailyMessage(data);
            if (response.data.success) {
                setDailyMessage(prev => ({ ...prev, ...response.data.data }));
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    const toggleDailyMessage = useCallback(async () => {
        try {
            const response = await messagesApi.toggleDailyMessage();
            if (response.data.success) {
                setDailyMessage(prev => ({ ...prev, enabled: !prev.enabled }));
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const response = await messagesApi.getStats();
            setStats(response.data.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, []);

    const fetchHistory = useCallback(async (page = 1) => {
        try {
            const response = await messagesApi.getHistory(page, 20);
            setHistory(response.data.data.messages);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    }, []);

    useEffect(() => {
        fetchDailyMessage();
        fetchStats();
        fetchHistory();
    }, [fetchDailyMessage, fetchStats, fetchHistory]);

    return {
        dailyMessage,
        stats,
        history,
        updateDailyMessage,
        toggleDailyMessage,
        refreshStats: fetchStats,
        refreshHistory: fetchHistory
    };
};

export const useSchedule = () => {
    const [settings, setSettings] = useState({
        enabled: true,
        timezone: 'Asia/Jerusalem',
        loading: true
    });
    const [nextRun, setNextRun] = useState(null);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await scheduleApi.getSettings();
            setSettings(prev => ({
                ...prev,
                ...response.data.data.schedule,
                loading: false
            }));
        } catch (error) {
            console.error('Error fetching schedule settings:', error);
            setSettings(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const fetchNextRun = useCallback(async () => {
        try {
            const response = await scheduleApi.getNextRuns();
            setNextRun(response.data.data);
        } catch (error) {
            console.error('Error fetching next run:', error);
        }
    }, []);

    const updateSchedule = useCallback(async (time, enabled) => {
        try {
            const response = await scheduleApi.updateDailySchedule(time, enabled);
            if (response.data.success) {
                await fetchNextRun();
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, [fetchNextRun]);

    const triggerNow = useCallback(async () => {
        try {
            const response = await scheduleApi.triggerDaily();
            return { success: true, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchNextRun();
        const interval = setInterval(fetchNextRun, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [fetchSettings, fetchNextRun]);

    return {
        settings,
        nextRun,
        updateSchedule,
        triggerNow,
        refreshSettings: fetchSettings
    };
};