import { useState } from 'react';
import { MessageSquare, Smartphone, BarChart3, Clock, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login';
import WhatsAppConnection from './components/WhatsAppConnection';
import MessageSettings from './components/MessageSettings';
import WebediaFooterLogo from "./components/WebediaFooterLogo";

function AppContent() {
    const { user, logout, isLoading, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState('connection');

    const tabs = [
        { id: 'connection', name: 'חיבור WhatsApp', icon: Smartphone },
        { id: 'message', name: 'הודעה יומית', icon: MessageSquare },
        { id: 'schedule', name: 'תזמון', icon: Clock },
        { id: 'stats', name: 'סטטיסטיקות', icon: BarChart3 },
    ];

    const handleLogout = async () => {
        if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
            await logout();
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'connection':
                return <WhatsAppConnection />;
            case 'message':
                return <MessageSettings />;
            case 'schedule':
                return (
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2">הגדרות תזמון</h3>
                        <p className="text-gray-600">בקרוב...</p>
                    </div>
                );
            case 'stats':
                return (
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2">סטטיסטיקות</h3>
                        <p className="text-gray-600">בקרוב...</p>
                    </div>
                );
            default:
                return <WhatsAppConnection />;
        }
    };

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">טוען מערכת...</p>
                </div>
            </div>
        );
    }

    // Show login page if not authenticated
    if (!isAuthenticated) {
        return <Login />;
    }

    // Show main dashboard if authenticated
    return (
        <div className="min-h-screen bg-gray-100" dir="rtl">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">WhatsApp Bot</h1>
                                <p className="text-sm text-gray-500">מערכת שליחת הודעות אוטומטית</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                            {/* User Info */}
                            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-50 px-3 py-1 rounded-lg">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">שלום, {user?.username}</span>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="התנתק"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm">התנתק</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8 rtl:space-x-reverse overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            WhatsApp Bot © 2025 - שליחת הודעות אוטומטית
                        </p>
                        <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-500">
                            <span>Frontend: React + Vite</span>
                            <span>•</span>
                            <span>Backend: Node.js + Express</span>
                        </div>
                    </div>

                    {/* Webedia Logo */}
                    <WebediaFooterLogo />
                </div>
            </footer>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;