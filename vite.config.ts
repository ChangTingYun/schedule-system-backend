import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';
import * as path from 'path'; // 必須導入 path 模組

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],

    // ************************ 關鍵修正 ************************ // 1. 新增 resolve.alias 解決路徑解析問題 (例如 '@/firebase.js')
    // 2. 修復 esbuild 結構錯誤
    
    resolve: {
        alias: {
            // 設定 @ 別名指向 resources/js
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },

    esbuild: {
        // 在生產環境中移除 console.log 語句（標準設置）
        drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
    
    // 結尾的 } 必須在這裡
}); // <--- 這是正確的結尾

// 舊的錯誤代碼：esbuild: { }); 已經被移除
