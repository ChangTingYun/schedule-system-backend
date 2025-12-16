// resources/js/Components/ScheduleCalendar.tsx - 最終整合版

import React, { useState, useEffect, useMemo } from 'react';
import { 
    collection, 
    getDocs, 
    DocumentData, 
    Firestore, 
    doc, 
    addDoc, 
    updateDoc, 
    getDoc, 
    deleteDoc 
} from 'firebase/firestore'; 
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'; 
import { initializeFirebase } from '../../firebase.js';

// ****** 輔助函式定義 ******

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getWeekDays = (start: Date): Date[] => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }
    return days;
};

const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// 輔助函式：時間轉換為分鐘數
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// ****** 模擬班別數據 ******
interface ShiftType {
    id: string;
    name: string;
    default_start: string;
    default_end: string;
    color: string; 
}

const MOCK_SHIFT_TYPES: ShiftType[] = [
    { id: 'shift_day', name: '常規班 (08:00-16:00)', default_start: '08:00', default_end: '16:00', color: '#B3E5FC' }, 
    { id: 'shift_mid', name: '中班 (14:00-22:00)', default_start: '14:00', default_end: '22:00', color: '#FFF9C4' }, 
    { id: 'shift_night', name: '夜班 (22:00-06:00)', default_start: '22:00', default_end: '06:00', color: '#CFD8DC' }, 
];

// ****** 類型定義 ******
interface User { id: string; username: string; }
interface ScheduleEntry { id: string; start_time: string; end_time: string; userName: string; user_id: string; shift_type_id: string; }
interface DisplaySchedule { id: string; start_time: string; end_time: string; userName: string; user_id: string; shift_type_id: string; isMerged: boolean; originalIds: string[]; }
type ScheduleGrid = Map<string, Map<string, DisplaySchedule[]>>; 
interface EditingItem extends ScheduleEntry { schedule_date: Date; }


// ****** 核心元件開始 ******
const ScheduleCalendar: React.FC = () => {
    
    // 1. ****** Hooks 狀態管理 ******
    
    // 導航狀態
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
    
    const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [scheduleGrid, setScheduleGrid] = useState<ScheduleGrid>(new Map());
    
    const [selectedViewingUserId, setSelectedViewingUserId] = useState<string>(''); 

    // CRUD 相關狀態
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [schedulesForDay, setSchedulesForDay] = useState<ScheduleEntry[]>([]); 
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null); 
    
    const [startTimeInput, setStartTimeInput] = useState('09:00');
    const [endTimeInput, setEndTimeInput] = useState('17:00');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedShiftTypeId, setSelectedShiftTypeId] = useState(''); 

    const [shiftTypes] = useState<ShiftType[]>(MOCK_SHIFT_TYPES); 
    
    // 權限與 Firebase 狀態
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<'employee' | 'manager' | 'unknown' | null>(null); 

    // 常數定義
    const HOUR_HEIGHT = 40; 
    const MINUTES_IN_DAY = 24 * 60; 
    const containerHeight = 24 * HOUR_HEIGHT;

    // UseMemo 根據 currentWeekStart 計算本週日期
    const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

    // 生成垂直時間軸標籤
    const timeLabels = useMemo(() => {
        const labels = [];
        for (let h = 0; h < 24; h++) {
            labels.push(`${h.toString().padStart(2, '0')}:00`);
        }
        return labels;
    }, []);


    // ****** 2. Firebase 初始化與 Auth 監聽 ******
    const { db, app } = initializeFirebase(); 
    const auth = getAuth(app); 

    useEffect(() => {
        const firestore = db as Firestore;
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            
            if (user) {
                try {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    const userSnapshot = await getDoc(userDocRef);
                    
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.data() as DocumentData;
                        const role = userData.role as 'employee' | 'manager' | 'unknown';
                        setCurrentUserRole(role);
                    } else {
                        setCurrentUserRole('unknown');
                    }

                } catch (error) {
                    setCurrentUserRole('unknown');
                }
            } else {
                setCurrentUserRole(null);
            }
        });

        return () => unsubscribe();
    }, [auth, app, db]); 

    if (db === null) {
         return (
             <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-4">
                 ❌ Firebase 連線失敗！
             </div>
         );
    }
    
    // ****** 3. 日期導航處理函式 ******

    const goToPreviousWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
        setLoading(true); 
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
        setLoading(true); 
    };

    const goToCurrentWeek = () => {
        setCurrentWeekStart(getStartOfWeek(new Date()));
        setLoading(true); 
    };


    // ****** 4. CRUD 函式 ******

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
        setEditingItem(null);
        setSelectedUserId('');
        setStartTimeInput('09:00');
        setEndTimeInput('17:00');
        setSelectedShiftTypeId('');
        setSchedulesForDay([]);
        // 重設 loading 狀態，避免卡住
        setLoading(false);
    };

    const handleCellClick = (date: Date, entries: DisplaySchedule[] | undefined, targetUserId: string) => {
        if (currentUserRole !== 'manager') {
            alert('您沒有權限新增或修改排班！');
            return; 
        }

        setSelectedDate(date);
        
        const dateKey = formatDateKey(date);
        const currentOriginalEntries: ScheduleEntry[] = (scheduleGrid.get(targetUserId)?.get(dateKey) || [])
            .flatMap(displayEntry => {
                if (!displayEntry.isMerged) {
                    return [{ ...displayEntry, shift_type_id: displayEntry.shift_type_id } as ScheduleEntry];
                }
                return [];
            })
            .filter(entry => entry.user_id === targetUserId); 

        setSchedulesForDay(currentOriginalEntries);

        setEditingItem(null); 
        setSelectedUserId(targetUserId); 
        setSelectedShiftTypeId(MOCK_SHIFT_TYPES[0]?.id || ''); 
        setStartTimeInput(MOCK_SHIFT_TYPES[0]?.default_start || '09:00');
        setEndTimeInput(MOCK_SHIFT_TYPES[0]?.default_end || '17:00');

        setIsModalOpen(true);
    };

    const handleEditEntry = (entry: DisplaySchedule, scheduleDate: Date) => {
        if (currentUserRole !== 'manager') {
            alert('您沒有權限修改或刪除排班！');
            return; 
        }

        if (entry.isMerged) {
            alert('無法直接編輯或刪除合併後的排班，請在資料庫中操作或刪除原始排班記錄。');
            return;
        }
        
        closeModal(); 
        
        const originalEntry: ScheduleEntry = {
            id: entry.id,
            start_time: entry.start_time,
            end_time: entry.end_time,
            userName: entry.userName,
            user_id: entry.user_id,
            shift_type_id: entry.shift_type_id,
        };

        setEditingItem({
            ...originalEntry,
            schedule_date: scheduleDate 
        });
        setSelectedDate(scheduleDate);
        setSelectedUserId(originalEntry.user_id);
        setStartTimeInput(originalEntry.start_time);
        setEndTimeInput(originalEntry.end_time);
        setSelectedShiftTypeId(originalEntry.shift_type_id);
        
        const dateKey = formatDateKey(scheduleDate);
        const userDisplaySchedules = scheduleGrid.get(originalEntry.user_id)?.get(dateKey) || [];
        const flatOriginalEntries: ScheduleEntry[] = userDisplaySchedules
            .filter(e => !e.isMerged) 
            .map(e => ({ ...e, shift_type_id: e.shift_type_id, schedule_date: scheduleDate } as ScheduleEntry));
            
        setSchedulesForDay(flatOriginalEntries);
        
        setTimeout(() => {
            setIsModalOpen(true);
        }, 50); 
    }

    const handleSubmitSchedule = async () => {
        if (!selectedDate || !selectedUserId || !startTimeInput || !endTimeInput || !selectedShiftTypeId) {
            alert('請完整填寫日期、員工和班別。');
            return;
        }
        
        const newStart = startTimeInput;
        const newEnd = endTimeInput;
        const isUpdatingId = editingItem?.id;

        // 時間有效性與時長限制檢查 (保持不變)
        let shiftDuration = timeToMinutes(newEnd) - timeToMinutes(newStart);
        if (shiftDuration <= 0) {
            shiftDuration += 24 * 60; 
        }
        
        const maxShiftDurationMinutes = 12 * 60; 
        if (shiftDuration > maxShiftDurationMinutes) {
            alert(`錯誤：單次排班時長 (${(shiftDuration / 60).toFixed(1)} 小時) 超過法定上限 (${maxShiftDurationMinutes / 60} 小時)。`);
            return;
        }
        
        // 時間重疊衝突檢查 (保持不變)
        const dateKey = formatDateKey(selectedDate);
        const existingDisplaySchedules = scheduleGrid.get(selectedUserId)?.get(dateKey) || [];

        const conflict = existingDisplaySchedules.some(existingEntry => {
            if (!existingEntry.isMerged && isUpdatingId && existingEntry.id === isUpdatingId) {
                return false;
            }
            const existingStart = existingEntry.start_time;
            const existingEnd = existingEntry.end_time;
            return newStart < existingEnd && existingStart < newEnd;
        });

        if (conflict) {
            alert('排班衝突！該員工在同一天已存在時間重疊的排班。請調整時間。');
            return; 
        }
        
        // 最小休息間隔檢查 (保持不變)
        const minRestMinutes = 8 * 60; 
        const tomorrow = new Date(selectedDate);
        tomorrow.setDate(selectedDate.getDate() + 1);
        const tomorrowDateKey = formatDateKey(tomorrow);

        const nextDaySchedules = scheduleGrid.get(selectedUserId)?.get(tomorrowDateKey) || [];

        if (nextDaySchedules.length > 0) {
            const earliestNextStart = nextDaySchedules.reduce((earliest, current) => 
                current.start_time < earliest ? current.start_time : earliest, nextDaySchedules[0].start_time);
            
            const timeUntilMidnight = (24 * 60) - timeToMinutes(newEnd);
            const restTimeMinutes = timeToMinutes(earliestNextStart) + (timeUntilMidnight % (24 * 60));
            
            if (restTimeMinutes < minRestMinutes) {
                const confirm = window.confirm(`警告：與下一天排班的休息間隔不足 ${minRestMinutes / 60} 小時 (${(restTimeMinutes / 60).toFixed(1)} 小時)。\n\n您確定要強制提交嗎？`);
                if (!confirm) {
                    return;
                }
            }
        }


        setLoading(true);
        const firestore = db as Firestore;
        
        const scheduleData = {
            user_id: selectedUserId,
            schedule_date: selectedDate,
            start_time: startTimeInput,
            end_time: endTimeInput,
            shift_type_id: selectedShiftTypeId,
        };
        
        try {
            if (editingItem && editingItem.id) {
                const docRef = doc(firestore, 'schedules', editingItem.id);
                await updateDoc(docRef, scheduleData);
                alert('排班更新成功！');
            } else {
                const schedulesCol = collection(firestore, 'schedules');
                await addDoc(schedulesCol, scheduleData);
                alert('排班新增成功！');
            }
            
            closeModal();
            // *** 關鍵優化：不使用 window.location.reload() ***
            // 而是觸發數據重新載入 (因為 setLoading(true) 會在 closeModal() 後重設，我們在這裡手動觸發一次)
            setLoading(true); 
            // 這裡不需要 goToCurrentWeek，只要 set loading 讓 useEffect 重新獲取數據即可
            

        } catch (e) {
            console.error("寫入排班時發生錯誤: ", e);
            alert("排班寫入失敗。請查看控制台。");
        } finally {
            // 如果成功，setLoading(true) 會在 useEffect 中被 setLoading(false) 覆蓋。
            // 如果失敗，我們也要手動關閉 loading 狀態。
            if (loading) setLoading(false);
        }
    };

    const handleDeleteSchedule = async () => {
        if (!editingItem || !editingItem.id) {
            alert('錯誤：沒有選定要刪除的排班記錄 ID！請重新點擊。');
            return;
        }

        if (!window.confirm(`確定要刪除 ${editingItem.userName} 在 ${selectedDate?.toLocaleDateString()} ${editingItem.start_time}-${editingItem.end_time} 的排班嗎？`)) {
            return; 
        }
        
        setLoading(true);
        const firestore = db as Firestore;
        
        try {
            const docRef = doc(firestore, 'schedules', editingItem.id);
            await deleteDoc(docRef);
            
            alert('排班刪除成功！');
            
            closeModal();
            // *** 關鍵優化：不使用 window.location.reload() ***
            // 而是觸發數據重新載入
            setLoading(true); 

        } catch (e) {
            console.error("刪除排班時發生錯誤: ", e);
            alert(`排班刪除失敗。錯誤訊息: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            if (loading) setLoading(false);
        }
    };

    // ****** 輔助函式：連續排班合併與垂直時間線渲染 (保持不變) ******
    const mergeContinuousSchedules = (entries: ScheduleEntry[]): DisplaySchedule[] => {
        if (entries.length === 0) return [];
        
        entries.sort((a, b) => a.start_time.localeCompare(b.start_time));

        const merged: DisplaySchedule[] = [];
        let currentMerge: DisplaySchedule | null = null;

        for (const entry of entries) {
            if (!currentMerge) {
                currentMerge = {
                    id: entry.id,
                    start_time: entry.start_time,
                    end_time: entry.end_time,
                    userName: entry.userName,
                    user_id: entry.user_id,
                    shift_type_id: entry.shift_type_id, 
                    isMerged: false, 
                    originalIds: [entry.id]
                };
            } else if (currentMerge.end_time === entry.start_time) {
                currentMerge.end_time = entry.end_time; 
                currentMerge.isMerged = true; 
                currentMerge.originalIds.push(entry.id);
            } else {
                merged.push(currentMerge);
                currentMerge = {
                    id: entry.id,
                    start_time: entry.start_time,
                    end_time: entry.end_time,
                    userName: entry.userName,
                    user_id: entry.user_id,
                    shift_type_id: entry.shift_type_id,
                    isMerged: false,
                    originalIds: [entry.id]
                };
            }
        }
        
        if (currentMerge) {
            merged.push(currentMerge);
        }

        return merged;
    };
    
    const renderVerticalTimeline = (schedules: DisplaySchedule[], day: Date, userId: string) => {
        
        const getShiftColor = (shiftId: string) => {
            return shiftTypes.find(t => t.id === shiftId)?.color || '#ccc';
        }

        const containerHeightPx = 24 * HOUR_HEIGHT;

        return (
            <div 
                className={`relative w-full h-full`} 
                style={{ height: `${containerHeightPx}px` }}
            >
                {schedules.map((entry, index) => {
                    const startMinutes = timeToMinutes(entry.start_time);
                    let endMinutes = timeToMinutes(entry.end_time);
                    
                    if (endMinutes < startMinutes) {
                        endMinutes += 24 * 60;
                    }
                    
                    const durationMinutes = endMinutes - startMinutes;
                    
                    const topPosition = (startMinutes / MINUTES_IN_DAY) * containerHeightPx;
                    const blockHeight = (durationMinutes / MINUTES_IN_DAY) * containerHeightPx;

                    const name = shiftTypes.find(t => t.id === entry.shift_type_id)?.name.split('(')[0].trim() || '排班';

                    const finalTop = Math.max(0, topPosition);
                    const finalHeight = Math.min(blockHeight - (finalTop - topPosition), containerHeightPx - finalTop);

                    if (finalHeight <= 0) return null; 

                    return (
                        <div
                            key={`${entry.id}-${index}`} 
                            className="absolute rounded text-xs font-semibold overflow-hidden whitespace-nowrap opacity-90 hover:opacity-100 transition duration-150 shadow-md p-1"
                            style={{
                                backgroundColor: getShiftColor(entry.shift_type_id),
                                top: `${finalTop}px`,
                                height: `${finalHeight}px`,
                                width: '90%', 
                                left: '5%',
                                color: '#333', 
                                border: entry.isMerged ? '1px dashed #7b1fa2' : 'none',
                                zIndex: 10 + index, 
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (currentUserRole === 'manager') {
                                    handleEditEntry(entry, day); 
                                }
                            }}
                            title={`${entry.start_time} - ${entry.end_time} (${name}) ${entry.isMerged ? '(合併顯示)' : ''}`}
                        >
                            <span className="truncate text-gray-800">
                                {entry.start_time} - {entry.end_time}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };


    // ****** 5. 數據讀取邏輯 (依賴 currentWeekStart, selectedViewingUserId, loading) ******
    useEffect(() => {
        // 只有在 Firebase 登入後，且需要載入時才執行
        if (!currentUser && !loading) return; 

        const fetchAllData = async () => {
            try {
                const firestore = db as Firestore;
                
                // 1. 讀取 Users 集合 (只在第一次或 usersMap 為空時讀取)
                if (usersMap.size === 0) {
                    const usersSnapshot = await getDocs(collection(firestore, 'users'));
                    const usersMapping = new Map<string, User>();
                    usersSnapshot.docs.forEach(doc => {
                        const data = doc.data() as DocumentData;
                        usersMapping.set(doc.id, { id: doc.id, username: data.username as string || 'N/A' });
                    });
                    setUsersMap(usersMapping);

                    if (usersMapping.size > 0 && !selectedViewingUserId) {
                        setSelectedViewingUserId(Array.from(usersMapping.keys())[0]);
                    }
                }
                
                // 確保有用戶數據後再繼續
                if (usersMap.size === 0) {
                     setLoading(false);
                     return;
                }
                
                // 2. 讀取 Schedules 數據
                const schedulesCol = collection(firestore, 'schedules');
                const scheduleSnapshot = await getDocs(schedulesCol);
                
                // 3. 準備日曆網格數據結構
                const rawScheduleMap = new Map<string, Map<string, ScheduleEntry[]>>();

                scheduleSnapshot.docs.forEach((doc) => {
                    const data = doc.data() as DocumentData;
                    const user = usersMap.get(data.user_id as string);
                    
                    if (!user) return; 

                    const entry: ScheduleEntry = {
                        id: doc.id,
                        user_id: data.user_id as string,
                        userName: user.username,
                        start_time: data.start_time as string || 'N/A',
                        end_time: data.end_time as string || 'N/A',
                        shift_type_id: data.shift_type_id as string || MOCK_SHIFT_TYPES[0].id, 
                    };

                    const scheduleDate = data.schedule_date && data.schedule_date.toDate ? data.schedule_date.toDate() : new Date();
                    const dateKey = formatDateKey(scheduleDate);

                    if (!rawScheduleMap.has(user.id)) {
                        rawScheduleMap.set(user.id, new Map());
                    }
                    if (!rawScheduleMap.get(user.id)?.has(dateKey)) {
                         rawScheduleMap.get(user.id)?.set(dateKey, []);
                    }
                    
                    rawScheduleMap.get(user.id)?.get(dateKey)?.push(entry);
                });
                
                const finalScheduleGrid: ScheduleGrid = new Map();
                rawScheduleMap.forEach((dateMap, userId) => {
                    const userGridMap = new Map<string, DisplaySchedule[]>();
                    dateMap.forEach((entries, dateKey) => {
                        const mergedEntries = mergeContinuousSchedules(entries);
                        userGridMap.set(dateKey, mergedEntries);
                    });
                    finalScheduleGrid.set(userId, userGridMap);
                });

                setScheduleGrid(finalScheduleGrid);
                setLoading(false);

            } catch (err) {
                console.error("Error fetching schedule data: ", err);
                setError(`排程資料讀取失敗。錯誤細節: ${err instanceof Error ? err.message : String(err)}`);
                setLoading(false);
            }
        };
        
        // 只有在 currentUser 存在 且 loading 為 true 時才執行 fetch
        if (currentUser) {
            fetchAllData();
        } else {
             // 如果未登入，也確保 loading 狀態關閉
             setLoading(false);
        }
        
    }, [db, currentWeekStart, selectedViewingUserId, usersMap.size, currentUser, loading]); 


    // ****** 6. 渲染邏輯 ******

    // ****** 登入前隱藏排班表邏輯 ******
    if (!currentUser) {
        // 當 Firebase currentUser 不存在時，直接返回一個提示
        return (
            <div className="p-6 bg-white shadow-lg rounded-lg mt-8">
                <div className="p-8 bg-gray-100 border border-gray-300 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-red-600">
                        🔴 請先登入以查看員工排班時間軸
                    </h3>
                    <p className="mt-2 text-gray-600">排班資訊屬於敏感數據，需要身份驗證。</p>
                </div>
            </div>
        );
    }
    // *******************************************


    if (loading) return <p className="p-4 mt-4">載入排程資料中...</p>;
    if (error) return (
        <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-4">
            <h3 className="text-xl font-semibold mb-2">❌ 排程資料讀取錯誤</h3>
            <p>{error}</p>
        </div>
    );
    
    const userList = Array.from(usersMap.values());
    const viewingUser = usersMap.get(selectedViewingUserId);
    
    const displayStart = weekDays[0].toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    const displayEnd = weekDays[6].toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });


    if (!viewingUser && userList.length > 0) return <p className="p-4 mt-4">請選擇員工查看排班表。</p>;
    if (userList.length === 0) return <p className="p-4 mt-4">無可用員工數據。請檢查 Firestore `users` 集合。</p>;

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg mt-8">
            <h3 className="text-2xl font-bold mb-6 text-indigo-700">🗓️ 員工排班時間軸 (垂直視圖)</h3>
            
            {/* ****** 日期導航與員工切換控制項 ****** */}
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4">
                
                {/* 1. 日期導航按鈕 */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={goToPreviousWeek}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-3 rounded shadow-md transition duration-150"
                    >
                        {'< 上一週'}
                    </button>
                    
                    <span className="text-lg font-semibold text-gray-800 w-40 text-center">
                        {displayStart} - {displayEnd}
                    </span>
                    
                    <button
                        onClick={goToNextWeek}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-3 rounded shadow-md transition duration-150"
                    >
                        {'下一週 >'}
                    </button>
                    
                    <button
                        onClick={goToCurrentWeek}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded transition duration-150 ml-4"
                    >
                        本週
                    </button>
                </div>
                
                {/* 2. 員工切換選單 */}
                <div className="flex items-center space-x-2">
                    <label className="text-lg font-semibold text-gray-700">查看員工：</label>
                    <select
                        value={selectedViewingUserId}
                        onChange={(e) => {
                            setSelectedViewingUserId(e.target.value);
                            setLoading(true); // 員工切換也觸發載入狀態，確保數據同步
                        }}
                        className="p-2 border border-indigo-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {userList.map(user => (
                            <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                    </select>
                </div>

            </div>
            
            {/* ****** 權限狀態提示 (保持不變) ****** */}
            <div className={`p-3 rounded-md text-sm mb-4 ${currentUserRole === 'manager' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {currentUser ? (
                    <>
                        🟢 **已登入**: {currentUser.email || 'N/A'} | **角色**: {currentUserRole || '未知'}
                        {currentUserRole !== 'manager' && (
                            <span className="font-bold ml-2"> (無排班管理權限)</span>
                        )}
                    </>
                ) : (
                    <>
                        🔴 **未登入**: 無法進行排班管理操作。
                    </>
                )}
            </div>
            {/* ******************************* */}
            
            <div className="overflow-x-auto">
                {/* 外部 Grid：定義了左側時間列 (80px) 和 7 天排班列的寬度 */}
                <div className="grid border border-gray-300 bg-gray-50" style={{ gridTemplateColumns: '80px repeat(7, minmax(100px, 1fr))' }}>
                    
                    {/* ****** 頂部日期標題 ****** */}
                    <div className="p-2 bg-gray-100 font-semibold border-r border-gray-300">時間 / 日期</div> 
                    {weekDays.map(day => (
                        <div key={formatDateKey(day)} className="p-2 bg-indigo-50 text-indigo-800 font-semibold text-center border-l border-gray-300">
                            {day.toLocaleDateString('zh-TW', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                        </div>
                    ))}
                </div>

                {/* ****** 排班主體區域：設置可垂直滾動的容器 ****** */}
                <div className="grid col-span-8 overflow-y-auto border-x border-b border-gray-300" style={{ maxHeight: '75vh', gridTemplateColumns: '80px repeat(7, minmax(100px, 1fr))' }}>
                    
                    {/* 左側：垂直時間刻度 */}
                    <div className="sticky left-0 bg-white border-r border-gray-300 z-20">
                        {timeLabels.map((label, index) => (
                            <div 
                                key={label} 
                                className={`h-[${HOUR_HEIGHT}px] text-right pr-2 text-xs text-gray-500 border-b border-gray-200 flex items-center justify-end`}
                                style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                    
                    {/* 右側：7 天排班區域 */}
                    {viewingUser && weekDays.map(day => {
                        const dateKey = formatDateKey(day);
                        const schedules = scheduleGrid.get(viewingUser.id)?.get(dateKey) || [];
                        
                        return (
                            <div 
                                key={`${viewingUser.id}-${dateKey}`} 
                                className={`relative border-l border-gray-300 cursor-pointer hover:bg-yellow-50`}
                                // 設置固定的總高度 (24小時)
                                style={{ height: `${containerHeight}px` }}
                                onClick={() => handleCellClick(day, schedules, viewingUser.id)} 
                            >
                                {/* 畫出每小時的分隔線 */}
                                {[...Array(24)].map((_, hourIndex) => (
                                    <div 
                                        key={hourIndex}
                                        className="absolute w-full border-t border-dashed border-gray-200"
                                        style={{ top: `${hourIndex * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                                    />
                                ))}

                                {/* 渲染排班塊 */}
                                {renderVerticalTimeline(schedules, day, viewingUser.id)}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <p className="mt-4 text-sm text-gray-500">
                註：**[Manager]** 點擊單元格的空白處可新增排班。點擊**顏色塊**可修改或刪除單一排班記錄。
            </p>

            {/* ****** 排班編輯/新增/刪除彈出視窗 (Modal) ****** */}
            {isModalOpen && selectedDate && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h4 className="text-xl font-bold mb-4">
                            {editingItem ? '修改排班' : '新增排班'} - {selectedDate.toLocaleDateString()}
                        </h4>
                        
                        {/* 員工選擇 (只顯示名稱，不可編輯) */}
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">員工：</label>
                            <div className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-700 font-bold">
                                {usersMap.get(selectedUserId)?.username || 'N/A'}
                            </div>
                        </div>
                        
                        {/* 班別選擇器 (保留顯示，供 Manager 設置班別) */}
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">班別類型：</label>
                            <select
                                value={selectedShiftTypeId}
                                onChange={(e) => {
                                    const typeId = e.target.value;
                                    setSelectedShiftTypeId(typeId);
                                    const type = shiftTypes.find(t => t.id === typeId);
                                    if (type) {
                                        setStartTimeInput(type.default_start);
                                        setEndTimeInput(type.default_end);
                                    }
                                }}
                                className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                required
                            >
                                <option value="">-- 選擇班別 --</option>
                                {shiftTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 時間輸入 */}
                        <div className="mb-6 flex space-x-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">開始時間：</label>
                                <input
                                    type="time" 
                                    value={startTimeInput}
                                    onChange={(e) => setStartTimeInput(e.target.value)}
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">結束時間：</label>
                                <input
                                    type="time" 
                                    value={endTimeInput}
                                    onChange={(e) => setEndTimeInput(e.target.value)}
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700"
                                    required
                                />
                            </div>
                        </div>
                        
                        {/* ****** 按鈕區 ****** */}
                        <div className="flex justify-between items-center mt-6"> 
                            
                            {/* 左側：刪除按鈕 */}
                            <div>
                                {editingItem && (
                                    <button
                                        onClick={handleDeleteSchedule}
                                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150"
                                        disabled={loading}
                                    >
                                        {loading ? '刪除中...' : '刪除此排班'}
                                    </button>
                                )}
                            </div>

                            {/* 右側：取消和儲存按鈕 */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={closeModal}
                                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                                    disabled={loading}
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSubmitSchedule}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                                    disabled={loading}
                                >
                                    {loading ? '儲存中...' : (editingItem ? '儲存修改' : '新增排班')}
                                </button>
                            </div>
                        </div>
                        {/* ********************************* */}

                        {/* 新增模式下，顯示當天所有單獨排班供選擇 (UX優化) */}
                        {!editingItem && schedulesForDay.length > 0 && (
                             <div className="mt-4 pt-4 border-t border-gray-200">
                                 <p className="text-sm font-semibold mb-2">當天可編輯的單獨排班項目 ({schedulesForDay.length})：</p>
                                 <div className="space-y-1">
                                     {schedulesForDay.map((entry) => (
                                         <button 
                                             key={entry.id} 
                                             className="w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200 transition duration-150"
                                             onClick={() => handleEditEntry(entry as DisplaySchedule, selectedDate!)}
                                         >
                                             {entry.userName}：<span className="font-bold">{entry.start_time} - {entry.end_time}</span> (點擊修改)
                                         </button>
                                     ))}
                                 </div>
                             </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleCalendar;