# 發布

核心套件目前共同版本0.1.0：@sensel/ui、@sensel/chat、@sensel/analytics、@sensel/reports、@sensel/mail、@sensel/server，以及sensel-agent-core；搭配runtime contract v1。尚未承諾不同版本任意混搭。

發布前執行check、真隔離DB測試、Python測試、正式build、browser、repo外套件安裝與容器smoke。版號需同步package manifests、lockfile及Python metadata。

GitHub發布vMAJOR.MINOR.PATCH release會先重跑CI，再附上tgz／wheel並發布GHCR映像；詳細權限與流程見 [CI/CD](ci-cd.md)。目前沒有自動部署到客戶主機，也沒有發布npm/PyPI套件。

用image digest記錄部署版本。Git tag不取代客戶升級測試；客戶lockfile保留實際套件版本及完整性資訊。
