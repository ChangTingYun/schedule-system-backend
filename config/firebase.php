<?php

return [
    'projects' => [
        'app' => [
            'credentials' => [
                // 檢查 FIREBASE_CREDENTIALS 環境變數是否存在，如果存在，則將其作為憑證內容。
                // 這裡我們直接傳入 JSON 字串，Firebase SDK 會處理它。
                'credentials' => env('FIREBASE_CREDENTIALS', null),
            ],
        ],
    ],
];