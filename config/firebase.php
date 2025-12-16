<?php

// 警告：將敏感資訊直接放入配置檔中並不理想，
// 但這是繞過環境變數解析器錯誤的最終手段。

return [
    'projects' => [
        'app' => [
            'credentials' => [
                // 將您清理過的 JSON 字串貼入這裡
                'file' => base_path(env('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')),
            ],
        ],
    ],
];