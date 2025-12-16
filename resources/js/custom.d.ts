declare module '../../firebase.js' {
    export function initializeFirebase(): { app: any | null, db: any | null };
}

// 2. 聲明文件系統的絕對路徑 (雖然通常不必要，但可以作為備份)
// 確保您的 TypeScript 編譯器能識別這個文件
declare module '/Users/chihone/schedule-system-backend/resources/firebase.js' {
    export function initializeFirebase(): { app: any | null, db: any | null };
}

// 保持或刪除舊的 @ 別名和 resources/firebase.js 聲明，只要新的聲明能匹配即可