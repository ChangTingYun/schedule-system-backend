// resources/js/Components/UserList.tsx

import React, { useState, useEffect } from 'react';
// 確保 Firestore 類型被導入，用於類型斷言
import { collection, getDocs, DocumentData, Firestore } from 'firebase/firestore'; 
// 關鍵：從 firebase.js (或 .ts) 導入函式，明確指定副檔名
// 注意：firebase.js 位於 resources/firebase.js，所以路徑不變
import { initializeFirebase } from '../../firebase.js';


// ****** 變更 1：使用者類型定義 ******
interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean; // 根據您的 Users 集合設計
}

const UserList: React.FC = () => {
    // ****** 變更 2：狀態名稱變更為 users ******
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // 在元件內部呼叫初始化函式取得 db 實例
    const { db } = initializeFirebase(); 

    // ****** 檢查 db 是否為 null (邏輯與 ShiftList 相同) ******
    if (db === null) {
        return (
            <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-4">
                <h3 className="text-xl font-semibold mb-2">❌ Firebase 連線失敗！</h3>
                <p>Firebase 初始化失敗。請檢查您的 **firebase.js** 中的配置金鑰是否正確，並查看 Console 輸出。</p>
            </div>
        );
    }
    
    useEffect(() => {
        const fetchUsers = async () => { // 函式名稱變更
            try {
                // ****** 變更 3：Firestore 集合名稱變更為 'users' ******
                const usersCol = collection(db as Firestore, 'users'); 
                
                const userSnapshot = await getDocs(usersCol);
                
                const userList: User[] = userSnapshot.docs.map((doc) => {
                    const data = doc.data() as DocumentData; 
                    return { 
                        id: doc.id, 
                        // ****** 變更 4：映射 Users 集合中的欄位 ******
                        username: data.username as string || 'N/A',
                        email: data.email as string || 'N/A',
                        role: data.role as string || 'N/A',
                        is_active: data.is_active as boolean || false,
                    };
                });
                
                setUsers(userList); // 更新 users 狀態
                setLoading(false);

            } catch (err) {
                console.error("Error fetching users: ", err);
                setError(`連線 Firestore 失敗。錯誤細節: ${err instanceof Error ? err.message : String(err)}`);
                setLoading(false);
            }
        };

        fetchUsers(); // 呼叫新的函式
    }, []); 

    if (loading) return <p className="p-4 mt-4">載入使用者資料中...</p>;
    if (error) return (
        <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-4">
            <h3 className="text-xl font-semibold mb-2">❌ 使用者資料讀取錯誤</h3>
            <p>{error}</p>
        </div>
    );
    
    // ****** 變更 5：渲染結構和內容 ******
    return (
        <div className="p-6 bg-white shadow-lg rounded-lg mt-4">
            <h3 className="text-xl font-semibold mb-4">👥 使用者列表 (來自 Firestore)</h3>
            <ul className="list-disc list-inside">
                {users.length > 0 ? (
                    users.map((user) => (
                        <li key={user.id} className="text-gray-700">
                            <strong>{user.username}</strong> ({user.email}) - 權限: {user.role} 
                            {user.is_active ? (
                                <span className="ml-2 text-green-500">(啟用)</span>
                            ) : (
                                <span className="ml-2 text-red-500">(停用)</span>
                            )}
                        </li>
                    ))
                ) : (
                    <li className="text-gray-500">Firestore 的 'users' 集合中目前沒有資料。</li>
                )}
            </ul>
        </div>
    );
};

export default UserList;