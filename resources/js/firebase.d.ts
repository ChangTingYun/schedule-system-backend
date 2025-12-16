// resources/js/firebase.d.ts

import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";

// 聲明 firebase.js 導出了 app 變數，類型為 FirebaseApp (或 null)
export declare const app: FirebaseApp | null;

// 聲明 firebase.js 導出了 db 變數，類型為 Firestore (這是我們需要的)
export declare const db: Firestore | null;