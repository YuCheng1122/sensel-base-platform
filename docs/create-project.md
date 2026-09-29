# 建立獨立客戶專案

平台套件目前可從本地打包或GitHub release資產安裝；尚未發布到npm/PyPI。初始化範本不等於自動獲取未來的範本更新。

```sh
npm run pack:core
uv build --project python
npm run create:project -- /tmp/customer-analysis --packages "$PWD/artifacts/packages"
cd /tmp/customer-analysis/web
npm install
npm run db:generate
npm run typecheck
npm run build
```

產生器拒絕覆蓋非空目錄，排除node_modules/.next/.env與Python快取。平台專用Dockerfile不會複製到客戶專案，因其build context是平台workspace；客戶需按自己的套件與目錄建立映像配方。`vendor/`保存明確版本的tgz，web/package.json用相對file相依；換成private registry時改成鎖定版本並重建lockfile。六個套件（ui、chat、analytics、reports、mail、server）需採相容版本。

在客戶專案建立Python venv，安裝平台建好的wheel，再以 `uvicorn main:app --app-dir agent --port 8001` 啟動。生產依賴請鎖定，不用跨repo PYTHONPATH，也不引用平台原始碼目錄。

## Nginx／PCAP 擴充位置

Nginx：新增客戶 Prisma model＋migration、log parser、授權查詢service、UI頁面及Agent工具即可，ES不是前提。PCAP：檔案保存、封包解析、結果schema、查詢及長任務生命週期由客戶自行實作；本版沒有內建PCAP分析。

帳號／模型／Chat保留平台套件，客戶自訂導覽、工具與資料scope。在 `web/src/server/core.ts` 的允許工具名單與 `agent/main.py` 的ToolRegistry同時註冊；工具後端透過 `authorizeTool` 查驗執行profile和目前帳號狀態。

客戶repo擁有自己的schema、migration、README、AGENTS、部署及發布流程。不得把其業務程式複製回平台核心。完整產品功能與資料量驗收由該客戶專案另做。

郵件設定預設停用。需要通知時，在客戶server呼叫`sendConfiguredMail`並由客戶決定收件者授權、固定通知內容及穩定操作UUID；不要建立普通使用者任意寄信端點。先套用郵件migration並配置加密金鑰。合成測試另設`MAIL_ALLOW_FAKE=true`與`APP_ENV=test`；正式使用Resend且關閉fake。報告不會因建立快照而自動寄送，排程／訂閱由客戶另行設計。詳見 [郵件服務](mail-service.md)。
