# 客戶分析專案

由SenseL Base Platform初始化。`web/`是Next.js組合層及Prisma儲存；`agent/`是Python工具／prompt組合層。平台共用功能從npm套件及Python wheel安裝，不從原平台路徑import。

在web/執行npm install、npm run db:generate。複製web/.env.example，設定獨立PostgreSQL及秘密；載入必要環境後執行db:migrate、db:bootstrap、dev。另在Python venv安裝對應sensel-agent-core wheel，執行`uvicorn main:app --app-dir agent --port 8001`。

PUBLIC_APP_URL應等於瀏覽器origin，AGENT_URL與BACKEND_URL互指服務，AGENT_SHARED_SECRET兩端一致。正式關閉fake，啟用Secure cookie／HTTPS。Nginx或PCAP schema、查詢、頁面與工具自行加在本repo；Elasticsearch不是必要服務。

客戶需補充自己的業務需求、工具清單、資料保存及部署方式。不要保留真實資料在Git。

平台的Dockerfile使用平台workspace作build context，不會直接複製到這個repo；客戶需建立自己的容器與部署設定。
