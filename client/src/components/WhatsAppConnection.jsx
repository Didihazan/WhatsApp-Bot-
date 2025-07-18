import { useState } from 'react';
import { Smartphone, Wifi, WifiOff, RefreshCw, Users, Plus, Check, X, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import { useWhatsApp } from '../hooks/useApi';

const WhatsAppConnection = () => {
    const {
        status,
        groups,
        selectedGroups,
        connect,
        disconnect,
        refreshGroups,
        refreshStatus,
        addSelectedGroup,
        removeSelectedGroup,
        toggleSelectedGroup
    } = useWhatsApp();
    const [isConnecting, setIsConnecting] = useState(false);
    const [qrCodeCopied, setQrCodeCopied] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const result = await connect();
            if (!result.success) {
                alert(`שגיאה בחיבור: ${result.message}`);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        const result = await disconnect();
        if (!result.success) {
            alert(`שגיאה בהתנתקות: ${result.message}`);
        }
    };

    const handleAddGroup = async (group) => {
        const result = await addSelectedGroup(group.id, group.name);
        if (result.success) {
            alert(`✅ ${group.name} נוספה לרשימת הקבוצות המתוזמנות!`);
        } else {
            alert(`❌ ${result.message}`);
        }
    };

    const handleRemoveGroup = async (groupId) => {
        const result = await removeSelectedGroup(groupId);
        if (result.success) {
            alert(`✅ ${result.message}`);
        } else {
            alert(`❌ ${result.message}`);
        }
    };

    const handleToggleGroup = async (groupId) => {
        const result = await toggleSelectedGroup(groupId);
        if (result.success) {
            alert(`✅ ${result.message}`);
        } else {
            alert(`❌ ${result.message}`);
        }
    };

    const copyQRCode = async () => {
        if (status.qrCode) {
            try {
                await navigator.clipboard.writeText(status.qrCode);
                setQrCodeCopied(true);
                setTimeout(() => setQrCodeCopied(false), 2000);
            } catch (error) {
                console.error('Failed to copy QR code:', error);
            }
        }
    };

    const isGroupSelected = (groupId) => {
        return selectedGroups.some(sg => sg.id === groupId);
    };

    const getSelectedGroup = (groupId) => {
        return selectedGroups.find(sg => sg.id === groupId);
    };

    if (status.loading) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>טוען סטטוס WhatsApp...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <Smartphone className="w-6 h-6 text-green-600" />
                        <h2 className="text-xl font-bold">חיבור WhatsApp</h2>
                    </div>
                    <button
                        onClick={refreshStatus}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="רענן סטטוס"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-full ${
                        status.connected
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}>
                        {status.connected ? (
                            <>
                                <Wifi className="w-4 h-4" />
                                <span className="font-medium">מחובר</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4" />
                                <span className="font-medium">לא מחובר</span>
                            </>
                        )}
                    </div>

                    {status.connected && (
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{status.groupsCount} קבוצות</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex space-x-3 rtl:space-x-reverse">
                    {!status.connected ? (
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isConnecting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>מתחבר...</span>
                                </>
                            ) : (
                                <>
                                    <Wifi className="w-4 h-4" />
                                    <span>התחבר לWhatsApp</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleDisconnect}
                            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <WifiOff className="w-4 h-4" />
                            <span>התנתק</span>
                        </button>
                    )}
                </div>
            </div>

            {/* QR Code Display - משופר! */}
            {status.qrCode && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="text-center">
                        <h3 className="text-lg font-bold mb-4 text-green-700">
                            📱 סרוק QR Code עם WhatsApp
                        </h3>

                        {/* הוראות */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse mb-2">
                                <Smartphone className="w-5 h-5 text-blue-600" />
                                <span className="font-medium text-blue-800">איך לסרוק:</span>
                            </div>
                            <ol className="text-sm text-blue-700 space-y-1 text-right">
                                <li>1. פתח את WhatsApp בטלפון שלך</li>
                                <li>2. לך להגדרות ← מכשירים מקושרים</li>
                                <li>3. לחץ על "קשר מכשיר"</li>
                                <li>4. סרוק את הקוד למטה</li>
                            </ol>
                        </div>

                        {/* QR Code עצמו */}
                        <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-4 inline-block">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(status.qrCode)}`}
                                alt="QR Code לחיבור WhatsApp"
                                className="mx-auto rounded-lg"
                                style={{ imageRendering: 'pixelated' }}
                            />
                        </div>

                        {/* כפתור העתקה */}
                        <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
                            <button
                                onClick={copyQRCode}
                                className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg transition-colors ${
                                    qrCodeCopied
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title="העתק טקסט QR"
                            >
                                <Copy className="w-4 h-4" />
                                <span>{qrCodeCopied ? 'הועתק!' : 'העתק קוד'}</span>
                            </button>
                        </div>

                        {/* התראות */}
                        <div className="mt-4 space-y-2">
                            <p className="text-sm text-orange-600 font-medium">
                                ⏰ הקוד יפוג תוך דקה
                            </p>
                            <p className="text-xs text-gray-500">
                                אם הקוד לא עובד, לחץ על "התחבר לWhatsApp" שוב
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Groups List */}
            {status.connected && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">הקבוצות שלך ({groups.length})</h3>
                        <button
                            onClick={refreshGroups}
                            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>רענן קבוצות</span>
                        </button>
                    </div>

                    {groups.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">לא נמצאו קבוצות</p>
                            <button
                                onClick={refreshGroups}
                                className="flex items-center space-x-2 rtl:space-x-reverse mx-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>טען קבוצות</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {groups.map((group) => {
                                const selected = isGroupSelected(group.id);
                                const selectedGroup = getSelectedGroup(group.id);

                                return (
                                    <div
                                        key={group.id}
                                        className={`flex items-center justify-between p-3 rounded-lg transition-colors border-2 ${
                                            selected
                                                ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                                : 'bg-gray-50 border-transparent hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                selected ? 'bg-green-100' : 'bg-blue-100'
                                            }`}>
                                                {selected ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Users className="w-4 h-4 text-blue-600" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium">{group.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    {group.participantCount} משתתפים
                                                    {selected && (
                                                        <span className={`mr-2 px-2 py-1 text-xs rounded ${
                                                            selectedGroup?.enabled
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {selectedGroup?.enabled ? 'פעיל' : 'כבוי'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                            {selected ? (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleGroup(group.id)}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            selectedGroup?.enabled
                                                                ? 'bg-green-100 hover:bg-green-200 text-green-600'
                                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                                        }`}
                                                        title={selectedGroup?.enabled ? 'השבת קבוצה' : 'הפעל קבוצה'}
                                                    >
                                                        {selectedGroup?.enabled ? (
                                                            <ToggleRight className="w-4 h-4" />
                                                        ) : (
                                                            <ToggleLeft className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveGroup(group.id)}
                                                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                                                        title="הסר מרשימת הקבוצות המתוזמנות"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddGroup(group)}
                                                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                                                    title="הוסף לרשימת הקבוצות המתוזמנות"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Selected Groups Summary */}
            {selectedGroups.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-green-800 mb-4">
                        קבוצות מתוזמנות ({selectedGroups.filter(g => g.enabled).length}/{selectedGroups.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {selectedGroups.map((group) => (
                            <div
                                key={group.id}
                                className={`px-3 py-2 rounded-lg text-sm ${
                                    group.enabled
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                {group.name} {!group.enabled && '(כבוי)'}
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-green-600 mt-3">
                        💡 קבוצות אלה יקבלו את ההודעה היומית האוטומטית
                    </p>
                </div>
            )}
        </div>
    );
};

export default WhatsAppConnection;