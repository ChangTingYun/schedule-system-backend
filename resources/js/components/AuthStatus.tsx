// resources/js/Components/AuthStatus.tsx

import React, { useState, useEffect } from 'react';
import { initializeFirebase } from '../../firebase.js';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut, 
    User as FirebaseUser 
} from 'firebase/auth';

const AuthStatus: React.FC = () => {
    // 狀態：儲存當前使用者
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    // 狀態：登入表單
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // 狀態：UI回饋
    const [isLoading, setIsLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);

    // 取得 Firebase App 實例
    const { app } = initializeFirebase();
    const auth = getAuth(app);

    // 1. 監聽 Auth 狀態變化 (確保狀態與全應用同步)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setIsLoading(false);
        });

        // 清理函式
        return () => unsubscribe();
    }, [auth]);


    // 2. 處理登入
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setIsLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // 登入成功後，狀態會被 onAuthStateChanged 監聽器更新
            setEmail('');
            setPassword('');
        } catch (error) {
            console.error("Login failed:", error);
            setLoginError('登入失敗，請檢查 Email 和密碼是否正確。');
        } finally {
            setIsLoading(false);
        }
    };


    // 3. 處理登出
    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="p-4 text-sm text-gray-500">正在檢查登入狀態...</div>;
    }

    return (
        <div className="bg-white p-6 shadow-lg rounded-lg border border-gray-200">
            <h4 className="text-xl font-bold mb-4 text-indigo-700">🔒 權限管理</h4>

            {currentUser ? (
                // ****** 已登入狀態 ******
                <div>
                    <p className="text-sm font-semibold text-green-600 mb-2">已成功登入</p>
                    <p className="mb-4 text-gray-700">
                        **Email:** <span className="font-medium">{currentUser.email || 'N/A'}</span>
                    </p>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150"
                        disabled={isLoading}
                    >
                        登出
                    </button>
                </div>
            ) : (
                // ****** 未登入狀態 (登入表單) ******
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="manager@example.com"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-1">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    
                    {loginError && (
                        <p className="text-red-500 text-xs italic mb-4">{loginError}</p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150"
                        disabled={isLoading}
                    >
                        {isLoading ? '登入中...' : '登入 (主管權限)'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default AuthStatus;