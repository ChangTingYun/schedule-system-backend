// resources/js/Components/ShiftList.tsx (呼叫 initializeFirebase)

import React, { useState, useEffect } from 'react';
// 確保 Firestore 類型被導入，用於類型斷言
import { collection, getDocs, DocumentData, Firestore } from 'firebase/firestore'; 
// 關鍵：從 firebase.js (或 .ts) 導入函式，明確指定副檔名
import { initializeFirebase } from '../../firebase.js';



// 班次類型定義
interface Shift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
}

const ShiftList: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // 在元件內部呼叫初始化函式取得 db 實例
    const { db } = initializeFirebase(); 

    // resources/js/Components/ScheduleCalendar.tsx (在頂部導入下


// 輔助函式：將日期格式化為 YYYY-MM-DD 字串（用於快速鍵匹配）
const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

    // ****** 關鍵修正 1：在元件頂部檢查 db 是否為 null ******
    if (db === null) {
        return (
            <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h3 className="text-xl font-semibold mb-2">❌ Firebase 連線失敗！</h3>
                <p>Firebase 初始化失敗。請檢查您的 **firebase.js** 中的配置金鑰是否正確，並查看 Console 輸出。</p>
            </div>
        );
    }
    
    useEffect(() => {
        const fetchShifts = async () => {
            try {
                // ****** 關鍵修正 2：使用類型斷言 (db as Firestore) 解決 'Firestore | null' 錯誤 ******
                // 由於我們在 if (db === null) 中檢查過，這裡 db 一定是有效的 Firestore 實例。
                const shiftsCol = collection(db as Firestore, 'shifts'); 
                
                const shiftSnapshot = await getDocs(shiftsCol);
                
                const shiftList: Shift[] = shiftSnapshot.docs.map((doc) => {
                    const data = doc.data() as DocumentData; 
                    return { 
                        id: doc.id, 
                        name: data.name as string || 'N/A',
                        start_time: data.start_time as string || 'N/A',
                        end_time: data.end_time as string || 'N/A',
                    };
                });
                
                setShifts(shiftList);
                setLoading(false);

            } catch (err) {
                console.error("Error fetching shifts: ", err);
                setError(`連線 Firestore 失敗。錯誤細節: ${err instanceof Error ? err.message : String(err)}`);
                setLoading(false);
            }
        };

        fetchShifts();
    // 依賴 db 會導致元件在 db 改變時重跑，但因為 db 實例在運行時不會改變，所以可以省略 db
    }, []); 

    if (loading) return <p className="p-4">載入班次資料中...</p>;
    if (error) return (
        <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">❌ 資料讀取錯誤</h3>
            <p>{error}</p>
        </div>
    );
    
    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <h3 className="text-xl font-semibold mb-4">✅ 班次類型列表 (來自 Firestore)</h3>
            <ul className="list-disc list-inside">
                {shifts.length > 0 ? (
                    shifts.map((shift) => (
                        <li key={shift.id} className="text-gray-700">
                            {shift.name} ({shift.start_time} - {shift.end_time})
                        </li>
                    ))
                ) : (
                    <li className="text-gray-500">Firestore 的 'shifts' 集合中目前沒有資料。</li>
                )}
            </ul>
        </div>
    );
};

export default ShiftList;