<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log; // *** 測試環境變數需要引入 Log ***
use Inertia\Inertia;
use Laravel\Fortify\Features;

// ----------------------------------------------------------------------
// --- 1. 環境變數測試路由 (臨時用途，測試完畢後請務必刪除或註解掉！) ---
// ----------------------------------------------------------------------
Route::get('/env-check', function () {
    // 1. 檢查核心變數是否載入正確
    $env = env('APP_ENV');
    $debug = env('APP_DEBUG');
    
    // 2. 檢查 Firebase 變數是否載入，並只顯示非機密資訊
    $firebase_id = env('FIREBASE_PROJECT_ID');
    
    // 3. 檢查機密憑證 (只記錄到日誌，避免在網頁顯示)
    $credentials = env('FIREBASE_CREDENTIALS');
    
    // 將資訊寫入 storage/logs/laravel.log 檔案
    Log::info('--- 環境變數檢查報告 ---');
    Log::info('APP_ENV: ' . $env);
    Log::info('FIREBASE_PROJECT_ID: ' . $firebase_id);
    Log::info('FIREBASE_CREDENTIALS 載入狀態 (長度): ' . strlen($credentials));
    Log::info('------------------------');

    // 輸出到網頁給您確認（注意：網頁上顯示非機密資訊）
    return "
        <h1>✅ 環境變數測試報告</h1>
        <p>此路由為臨時測試用途，完成確認後請刪除或註解。</p>
        <hr>
        <h2>公開變數檢查</h2>
        <p><strong>APP_ENV:</strong> {$env}</p>
        <p><strong>APP_DEBUG:</strong> " . ($debug ? 'TRUE (已啟用)' : 'FALSE (未啟用)') . "</p>
        <p><strong>FIREBASE_PROJECT_ID:</strong> {$firebase_id}</p>
        <hr>
        <h2>機密變數檢查 (日誌)</h2>
        <p><strong>FIREBASE_CREDENTIALS:</strong> 內容已寫入 <code>storage/logs/laravel.log</code>。請檢查 log 檔案。</p>
        <p><strong>憑證字串長度:</strong> " . strlen($credentials) . " (確認此長度符合您 JSON 憑證的實際長度)</p>
    ";
})->name('env.check');

// ----------------------------------------------------------------------
// --- 2. 您原有的路由內容 (保持不變) ---
// ----------------------------------------------------------------------
Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
