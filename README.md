# 🏦 我的資產管理 (Asset Management PWA)

一個簡潔、美觀的個人資產追蹤應用程式，支援加密貨幣與股票的即時價格查詢。

A clean, offline-first PWA for tracking personal assets with real-time crypto and stock prices. All data stays in your browser.

[![Deploy to GitHub Pages](https://github.com/Shih-Wei-Lin/Asset_Management/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shih-Wei-Lin/Asset_Management/actions/workflows/deploy.yml)

**🌐 線上版本**: [https://shih-wei-lin.github.io/Asset_Management/](https://shih-wei-lin.github.io/Asset_Management/)
**Live Demo**: [https://shih-wei-lin.github.io/Asset_Management/](https://shih-wei-lin.github.io/Asset_Management/)
**English README**: [README.en.md](README.en.md)

---

## ✨ 功能特色

### 資產管理
- **加密貨幣追蹤**：支援搜尋並追蹤任何 CoinGecko 上的幣種
- **股票追蹤**：支援台股 (輸入 4 位數代號如 `2330`) 與美股 (如 `AAPL`)
- **智慧識別**：自動識別台股/美股，並自動加上 `.TW` 後綴

### 即時價格
- **CoinGecko API**：取得加密貨幣即時價格
- **Yahoo Finance API**：取得台股/美股即時價格
- **自動匯率轉換**：自動取得 USD/TWD 匯率

### 資料視覺化
- **趨勢圖**：支援 1 週 / 1 月 / 1 年的歷史價格走勢
- **圓餅圖**：資產配置比例一目瞭然
- **幣別切換**：一鍵切換 USD / TWD 顯示

### 其他
- **PWA 支援**：可安裝至手機桌面，離線使用
- **本地儲存**：資料儲存在瀏覽器的 LocalStorage，隱私安全
- **中文介面**：全中文化的友善介面

---

## 🚀 快速開始

### 安裝依賴
```bash
npm install
```

### 本地開發
```bash
npm run dev
```
開啟 http://localhost:5173 查看

### 建置專案
```bash
npm run build
```

### 預覽建置結果
```bash
npm run preview
```

---

## 📁 專案結構

```
src/
├── components/           # React 元件
│   ├── Dashboard.tsx     # 主頁面 (總資產、圖表、資產列表)
│   ├── AddAssetForm.tsx  # 新增資產表單 (含搜尋功能)
│   ├── AssetList.tsx     # 資產列表元件
│   ├── PortfolioChart.tsx # 趨勢圖 (recharts)
│   └── AllocationChart.tsx # 圓餅圖 (recharts)
│
├── services/             # API 服務
│   ├── coingecko.ts      # CoinGecko API (搜尋、價格、歷史)
│   └── yahooFinance.ts   # Yahoo Finance API (股票價格、匯率)
│
├── store/                # 狀態管理
│   └── assetStore.ts     # Zustand store (資產、價格、設定)
│
├── utils/                # 工具函式
│   └── format.ts         # 數字/貨幣格式化
│
├── App.tsx               # 應用程式入口
├── main.tsx              # React 渲染入口
└── index.css             # 全域樣式 (Tailwind CSS)
```

---

## 🔧 技術架構

| 類別 | 技術 |
|------|------|
| **框架** | React 18 + TypeScript |
| **建置工具** | Vite |
| **樣式** | Tailwind CSS v4 |
| **狀態管理** | Zustand (含 persist 中間件) |
| **圖表** | Recharts |
| **圖示** | Lucide React |
| **PWA** | vite-plugin-pwa |
| **部署** | GitHub Pages + GitHub Actions |

---

## 程式架構與資安

```
使用者裝置 (瀏覽器/PWA)
  ├─ React UI / Zustand 狀態
  │   └─ LocalStorage (僅本機)
  └─ Services (前端 API Client)
      ├─ CoinGecko API
      └─ Yahoo Finance API (經 corsproxy.io)
```

- 資產資料只保存在瀏覽器 LocalStorage，未加密，請避免存放敏感資訊。
- 本專案無後端與帳號系統，資產資料不會上傳到伺服器。
- API 呼叫為前端直連第三方服務，可能有速率限制或被記錄流量。
- 股票資料透過 `corsproxy.io` 代理，若有資安疑慮可自建 proxy 或改用自建後端。
- 部署時請使用 HTTPS，以降低中間人攻擊風險。

---

## 📊 資料來源

| 資料類型 | API | 用途 |
|----------|-----|------|
| 加密貨幣價格 | [CoinGecko](https://www.coingecko.com/api) | 搜尋、即時價格、歷史價格 |
| 股票價格 | [Yahoo Finance](https://finance.yahoo.com) | 台股/美股即時價格、歷史價格 |
| 匯率 | Yahoo Finance `USDTWD=X` | USD/TWD 即時匯率 |

> ⚠️ 股票 API 透過 CORS Proxy (`corsproxy.io`) 存取，可能有速率限制

---

## 🛠️ 設定與部署

### GitHub Pages 自動部署

本專案已設定 GitHub Actions，每次 push 到 `main` 分支會自動：
1. 安裝依賴 (`npm ci`)
2. 建置專案 (`npm run build`)
3. 部署至 GitHub Pages

**Workflow 檔案**: `.github/workflows/deploy.yml`

### 手動設定 GitHub Pages

1. 前往 Repository Settings → Pages
2. Source 選擇 `GitHub Actions`
3. 儲存後等待部署完成

---

## 📝 使用教學

### 新增加密貨幣
1. 點擊右下角 ➕ 按鈕
2. 選擇「加密貨幣」
3. 在搜尋欄輸入幣種名稱 (如 `Bitcoin`)
4. 從下拉選單選擇幣種
5. 輸入持有數量
6. (選填) 輸入買入價格
7. 點擊新增

### 新增股票
1. 點擊右下角 ➕ 按鈕
2. 選擇「股票」
3. 輸入股票代號：
   - **台股**：4 位數字 (如 `2330`)，系統會自動加上 `.TW`
   - **美股**：英文代號 (如 `AAPL`, `TSLA`)
4. 輸入持有數量
5. 點擊新增

### 切換幣別顯示
- 點擊右上角的 `USD` / `TWD` 按鈕即可切換
- 所有資產價值、圖表都會自動換算

### 刪除資產
- 在資產卡片上滑鼠懸停，點擊右側的 🗑️ 圖示

---

## 📄 License

MIT License

---

## 🤝 開發者

Made with ❤️ by [Shih-Wei-Lin](https://github.com/Shih-Wei-Lin)
