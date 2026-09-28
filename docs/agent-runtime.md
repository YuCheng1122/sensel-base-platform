# 產品 Agent 執行與擴充

Coding Agent 的作業規範在根AGENTS.md；此處介紹產品實際執行的Python Agent。

公開介面為 `Settings`、`Limits`、`Tool`、`ToolContext`、`ToolResult`、`ToolRegistry`、`create_app`。客戶在自己的 `agent/main.py` 註冊工具及prompt。核心沒有SOC、Nginx、PCAP或直接DB存取。

Web驗證使用者、模型狀態及對話ownership後，簽署最長五分鐘的profile，綁定user、execution、模型設定及允許工具。Agent透過HTTP呼叫後端工具，後端再次核對帳號啟用狀態及業務授權。工具不應直接取得資料庫帳密。

模型支援OpenAI-compatible、Anthropic、Gemini基本文字與函式呼叫串流，經假HTTP測試。這次改用精簡transport，沒有照搬LangGraph/LiteLLM，因此不是舊API或所有SDK功能的等價替代。完整範圍見 [Python README](../python/README.md)。

每次執行有時間／步數／工具呼叫上限，取消會中止pending I/O。工具狀態與最終狀態可區分error、partial、cancelled及unknown；工具trace有秘密、raw payload與內部推理遮蔽。後端先保存assistant結果再發送完成，保存失敗不回報成功。

Write tool介面要求confirmation token，但客戶handler仍必須驗證token綁定的操作；本版只有唯讀示範工具，沒有提供通用寫入審批UI。工具超時且可能已寫入時須回unknown，不能盲目重試。

執行registry在記憶體，尚不支援多worker取消協調或durable pause/resume。部署先用單instance；PCAP長分析需另建持久工作管理。
