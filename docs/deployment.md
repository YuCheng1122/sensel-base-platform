# 部署與回復

最小正式組合為PostgreSQL、Web、Agent；Compose另有一次性migration與可選bootstrap，沒有ES／Redis。映像分Web runtime、Agent runtime與migration，避免把開發工具全部帶進Web執行映像。

[CI/CD指南](ci-cd.md)記錄映像名稱與設定；`deploy/.env.example`是必要參數範例。正式使用HTTPS reverse proxy，PUBLIC_APP_URL設定外部origin，SECURE_COOKIES=true。Compose只把Web綁在127.0.0.1；反向代理與憑證由部署環境負責。

每次升級：備份DB與加密根金鑰→記錄目前image digests→驗證migration→更新映像→health／登入／模型設定回讀／Chat smoke。SETTINGS_ENCRYPTION_KEY保護模型／郵件金鑰及郵件內容指紋；停機本身不會完成重新加密，不可直接替換。本版沒有自動key rotation流程。

回復不是盲目啟動舊映像：先確認schema相容；不相容時依已驗證備份還原。此repo沒有提供客戶RPO/RTO保證或完成正式故障演練。

Web health驗證DB，Agent ready驗證runtime啟動；不代表正式模型或客戶工具外部服務一定可用。檢查模型需在UI明確操作。不要在health中觸發付費推論。

單一Web／Agent instance是本版已驗證界線。共用多租戶、橫向擴展、持久長任務及客戶資料遷移需另排驗收。
