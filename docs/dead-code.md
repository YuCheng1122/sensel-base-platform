# 死碼與冗餘檢查

靜態掃描只提供候選，不能證明絕對沒有死碼。檢查imports以外，也查Next路由、FastAPI decorators、tool registry、npm scripts、Compose command、migration、公開exports及文件入口。

本次採白名單搬移，未將舊SOC／UI／scripts整包複製後再清。移除依賴時同步lockfile，重新測試正式build與獨立套件安裝。未搬的Digiwin功能不因此從原repo刪除。

`npm run boundaries`掃描packages與python/src的核心相依及production module 400行上限；範本與工具腳本仍須人工審閱，不能將此檢查當成全repo完整相依分析。`npm run lint`檢查未使用變數／imports。Knip設定用 `npm run dead-code` 補充相依圖，公開套件入口須正確登錄，不能拿範本單一使用情境刪掉公開介面。

保留項需記錄用途或相容條件；不加入萬用ignore掩蓋未知項目。不保留備份檔、註解掉的舊實作、new/final副本。看起來相似但授權或資料語意不同時，不強行抽成大量條件參數函式。
