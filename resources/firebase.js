import { initializeApp } from "firebase/app"; 
import { getFirestore } from "firebase/firestore"; 
// 導入需要的類型，用於 TypeScript 聲明

const firebaseConfig = {
  apiKey: "AIzaSyBYXG0iBXyqI6_WfTmm500wA7aM53C2R0A",
  authDomain: "schedule-system-1a000.firebaseapp.com",
  projectId: "schedule-system-1a000",
  storageBucket: "schedule-system-1a000.firebasestorage.app",
  messagingSenderId: "319250239406",
  appId: "1:319250239406:web:6330453fe33480b36b823f",
  measurementId: "G-NMN46N38ME"
};

let appInstance = null; 
let dbInstance = null;

// 導出一個初始化函式
export function initializeFirebase() {
    if (appInstance) {
        return { app: appInstance, db: dbInstance };
    }
    
    try {
        appInstance = initializeApp(firebaseConfig); 
        dbInstance = getFirestore(appInstance);
        console.log("Firebase initialized successfully via function."); 
    } catch (error) {
        console.error("Firebase Initialization Failed:", error);
        appInstance = null;
        dbInstance = null;
    }
    
    return { app: appInstance, db: dbInstance };
}