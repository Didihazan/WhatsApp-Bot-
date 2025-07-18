import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Save, ToggleLeft, ToggleRight, Send, Upload, Image, X, Trash2 } from 'lucide-react';
import { useMessages, useSchedule, useWhatsApp } from '../hooks/useApi';
import { uploadApi } from '../utils/api';

const MessageSettings = () => {
    const { dailyMessage, updateDailyMessage, toggleDailyMessage } = useMessages();
    const { updateSchedule, triggerNow } = useSchedule();
    const { groups, status, sendToGroup } = useWhatsApp();

    const [message, setMessage] = useState('');
    const [time, setTime] = useState('11:00');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [availableImages, setAvailableImages] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!dailyMessage.loading) {
            setMessage(dailyMessage.text);
            setTime(dailyMessage.time);
            setSelectedImage(dailyMessage.imagePath);

            console.log('📋 Loaded daily message:', {
                text: dailyMessage.text,
                time: dailyMessage.time,
                imagePath: dailyMessage.imagePath
            });
        }
    }, [dailyMessage]);

    useEffect(() => {
        fetchAvailableImages();
    }, []);

    const fetchAvailableImages = async () => {
        try {
            const response = await uploadApi.getImages();
            setAvailableImages(response.data.data);
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('גודל הקובץ חייב להיות קטן מ-5MB');
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('סוג קובץ לא נתמך. השתמש ב-JPG, PNG, GIF או WebP');
            return;
        }

        setIsUploading(true);
        try {
            const response = await uploadApi.uploadImage(file);
            if (response.data.success) {
                await fetchAvailableImages();

                // **זה התיקון!** - בחר אוטומטית את התמונה שהועלתה
                const uploadedImagePath = response.data.data.path;
                setSelectedImage(uploadedImagePath);
                console.log('✅ Auto-selected uploaded image:', uploadedImagePath);

                alert('תמונה הועלתה ונבחרה אוטומטית! 📸');
            }
        } catch (error) {
            alert(`שגיאה בהעלאת תמונה: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteImage = async (filename) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק תמונה זו?')) return;

        try {
            await uploadApi.deleteImage(filename);
            await fetchAvailableImages();

            // If deleted image was selected, unselect it
            if (selectedImage && selectedImage.includes(filename)) {
                setSelectedImage(null);
            }

            alert('תמונה נמחקה בהצלחה');
        } catch (error) {
            alert(`שגיאה במחיקת תמונה: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleSave = async () => {
        if (!message.trim()) {
            alert('אנא הכנס תוכן הודעה');
            return;
        }

        console.log('💾 Saving with data:', {
            text: message.trim(),
            time: time,
            enabled: dailyMessage.enabled,
            imagePath: selectedImage
        });

        setIsSaving(true);
        try {
            // Update message
            const messageResult = await updateDailyMessage({
                text: message.trim(),
                time: time,
                enabled: dailyMessage.enabled,
                imagePath: selectedImage
            });

            console.log('📤 Save result:', messageResult);

            if (!messageResult.success) {
                alert(`שגיאה בשמירת ההודעה: ${messageResult.message}`);
                return;
            }

            // Update schedule
            const scheduleResult = await updateSchedule(time, dailyMessage.enabled);

            if (scheduleResult.success) {
                alert('ההגדרות נשמרו בהצלחה! 🎉');
            } else {
                alert(`ההודעה נשמרה, אך יש בעיה בתזמון: ${scheduleResult.message}`);
            }
        } catch (error) {
            console.error('❌ Save error:', error);
            alert(`שגיאה בשמירה: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendNow = async () => {
        if (!selectedGroup) {
            alert('אנא בחר קבוצה');
            return;
        }

        if (!message.trim()) {
            alert('אנא הכנס תוכן הודעה');
            return;
        }

        console.log('🚀 Sending message:');
        console.log('  Group:', selectedGroup);
        console.log('  Message:', message.trim());
        console.log('  Image:', selectedImage);

        setIsSending(true);
        try {
            const result = await sendToGroup(selectedGroup, message.trim(), selectedImage);
            if (result.success) {
                alert('ההודעה נשלחה בהצלחה! 🎉');
            } else {
                alert(`שגיאה בשליחה: ${result.message}`);
            }
        } catch (error) {
            alert(`שגיאה בשליחה: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleToggle = async () => {
        const result = await toggleDailyMessage();
        if (!result.success) {
            alert(`שגיאה בשינוי הסטטוס: ${result.message}`);
        }
    };

    const handleTestDaily = async () => {
        const result = await triggerNow();
        if (result.success) {
            alert('הודעה יומית נשלחה לכל הקבוצות שנבחרו! 🎉');
        } else {
            alert(`שגיאה בשליחת הודעה יומית: ${result.message}`);
        }
    };

    if (dailyMessage.loading) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-center">טוען הגדרות...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Message Content */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold">הודעה יומית</h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            תוכן ההודעה
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="הכנס את ההודעה שתישלח מדי יום..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={4}
                            maxLength={4096}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            {message.length}/4096 תווים
                        </div>
                    </div>

                    {/* Image Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            תמונה (אופציונלי)
                        </label>

                        {/* Upload Button */}
                        <div className="mb-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="image-upload"
                            />
                            <label
                                htmlFor="image-upload"
                                className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors ${
                                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                <Upload className="w-4 h-4" />
                                <span>{isUploading ? 'מעלה...' : 'העלה תמונה חדשה'}</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                JPG, PNG, GIF או WebP • מקסימום 5MB
                            </p>
                        </div>

                        {/* Available Images */}
                        {availableImages.length > 0 && (
                            <div>
                                <p className="text-sm text-gray-700 mb-2">בחר תמונה קיימת:</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-40 overflow-y-auto">
                                    {/* No Image Option */}
                                    <div
                                        onClick={() => setSelectedImage(null)}
                                        className={`relative border-2 rounded-lg p-2 cursor-pointer transition-colors ${
                                            !selectedImage
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="aspect-square flex items-center justify-center bg-gray-100 rounded">
                                            <X className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-xs text-center mt-1">ללא תמונה</p>
                                    </div>

                                    {/* Image Options */}
                                    {availableImages.map((image) => (
                                        <div
                                            key={image.filename}
                                            className={`relative border-2 rounded-lg p-2 cursor-pointer transition-colors ${
                                                selectedImage === image.path
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div
                                                onClick={() => setSelectedImage(image.path)}
                                                className="aspect-square"
                                            >
                                                <img
                                                    src={`http://localhost:5000/${image.path}`}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover rounded"
                                                />
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteImage(image.filename);
                                                }}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                title="מחק תמונה"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Selected Image Preview */}
                        {selectedImage && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <Image className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-700">תמונה נבחרה</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                שעת שליחה
                            </label>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <Clock className="w-5 h-5 text-gray-400" />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                סטטוס הודעה יומית
                            </label>
                            <button
                                onClick={handleToggle}
                                className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg transition-colors ${
                                    dailyMessage.enabled
                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                            >
                                {dailyMessage.enabled ? (
                                    <>
                                        <ToggleRight className="w-5 h-5" />
                                        <span>פעיל</span>
                                    </>
                                ) : (
                                    <>
                                        <ToggleLeft className="w-5 h-5" />
                                        <span>כבוי</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex space-x-3 rtl:space-x-reverse">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? 'שומר...' : 'שמור הגדרות'}</span>
                        </button>

                        <button
                            onClick={handleTestDaily}
                            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            <span>שלח עכשיו לכל הקבוצות</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Manual Send */}
            {status.connected && groups.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-bold mb-4">שליחה ידנית לקבוצה</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                בחר קבוצה
                            </label>
                            <select
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">בחר קבוצה...</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name} ({group.participantCount} משתתפים)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleSendNow}
                            disabled={isSending || !selectedGroup}
                            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            <span>{isSending ? 'שולח...' : 'שלח לקבוצה שנבחרה'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageSettings;