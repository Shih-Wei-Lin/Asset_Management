# Asset Management PWA

Asset Management PWA is a clean, offline-first app for tracking personal holdings with real-time crypto and stock prices. All data stays in your browser.

[![Deploy to GitHub Pages](https://github.com/Shih-Wei-Lin/Asset_Management/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shih-Wei-Lin/Asset_Management/actions/workflows/deploy.yml)

**Live Demo**: [https://shih-wei-lin.github.io/Asset_Management/](https://shih-wei-lin.github.io/Asset_Management/)
**Chinese README**: [README.md](README.md)

---

## Features

### Asset Management
- **Crypto tracking**: Search and track any coin on CoinGecko.
- **Stock tracking**: Taiwan stocks (4-digit tickers like `2330`) and US stocks (e.g. `AAPL`).
- **Smart detection**: Auto-detect TW/US tickers and append `.TW` for Taiwan stocks.

### Real-Time Prices
- **CoinGecko API**: Real-time crypto prices.
- **Yahoo Finance API**: Real-time TW/US stock prices.
- **Auto FX conversion**: USD/TWD exchange rate.

### Data Visualization
- **Trend chart**: 1 week / 1 month / 1 year history.
- **Pie chart**: Asset allocation at a glance.
- **Currency toggle**: One-click USD / TWD switch.

### Other
- **PWA support**: Installable and works offline.
- **Local storage**: Data stored in browser LocalStorage for privacy.
- **Chinese UI**: Interface is currently Chinese-first.

---

## Quick Start

### Install dependencies
```bash
npm install
```

### Local development
```bash
npm run dev
```
Open http://localhost:5173

### Build
```bash
npm run build
```

### Preview build
```bash
npm run preview
```

---

## Project Structure

```
src/
|-- components/            # React components
|   |-- Dashboard.tsx      # Main page (totals, charts, asset list)
|   |-- AddAssetForm.tsx   # Add asset form (search)
|   |-- AssetList.tsx      # Asset list component
|   |-- PortfolioChart.tsx # Trend chart (recharts)
|   `-- AllocationChart.tsx # Allocation pie chart (recharts)
|
|-- services/              # API services
|   |-- coingecko.ts       # CoinGecko API (search, price, history)
|   `-- yahooFinance.ts    # Yahoo Finance API (stock prices, FX)
|
|-- store/                 # State management
|   `-- assetStore.ts      # Zustand store (assets, prices, settings)
|
|-- utils/                 # Utilities
|   `-- format.ts          # Number/currency formatting
|
|-- App.tsx                # App entry
|-- main.tsx               # React render entry
`-- index.css              # Global styles (Tailwind CSS)
```

---

## Tech Stack

| Category | Tech |
|------|------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS v4 |
| **State** | Zustand (persist middleware) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **PWA** | vite-plugin-pwa |
| **Deployment** | GitHub Pages + GitHub Actions |

---

## Architecture and Security

```
User Device (Browser/PWA)
|-- React UI / Zustand state
|   `-- LocalStorage (local only)
`-- Services (Frontend API Client)
    |-- CoinGecko API
    `-- Yahoo Finance API (via corsproxy.io)
```

- Asset data stays in browser LocalStorage and is not encrypted; avoid storing sensitive data.
- No backend or account system; assets are not uploaded to a server.
- Frontend calls third-party APIs directly; rate limits and traffic logging may apply.
- Stock data uses the `corsproxy.io` proxy; consider a self-hosted proxy or backend if needed.
- Use HTTPS for deployment to reduce man-in-the-middle risks.

---

## Data Sources

| Data Type | API | Usage |
|----------|-----|------|
| Crypto prices | [CoinGecko](https://www.coingecko.com/api) | Search, spot prices, price history |
| Stock prices | [Yahoo Finance](https://finance.yahoo.com) | TW/US stock prices, history |
| FX rate | Yahoo Finance `USDTWD=X` | USD/TWD exchange rate |

> Stock data is accessed via the `corsproxy.io` CORS proxy and may be rate-limited.

---

## Setup and Deployment

### GitHub Pages auto-deploy

This project is configured with GitHub Actions. Each push to `main` will:
1. Install dependencies (`npm ci`)
2. Build the project (`npm run build`)
3. Deploy to GitHub Pages

**Workflow file**: `.github/workflows/deploy.yml`

### Manual GitHub Pages setup

1. Go to Repository Settings -> Pages
2. Set Source to `GitHub Actions`
3. Save and wait for deployment

---

## Usage Guide

### Add crypto
1. Tap the Add button (bottom-right)
2. Choose "Crypto"
3. Enter a coin name (e.g. `Bitcoin`)
4. Select the coin from the dropdown
5. Enter the quantity
6. (Optional) Enter the buy price
7. Tap Add

### Add stock
1. Tap the Add button (bottom-right)
2. Choose "Stock"
3. Enter a ticker:
   - **Taiwan stocks**: 4-digit code (e.g. `2330`); the app appends `.TW`
   - **US stocks**: symbols like `AAPL`, `TSLA`
4. Enter the quantity
5. Tap Add

### Switch currency display
- Click the `USD` / `TWD` toggle in the top-right
- All values and charts update automatically

### Remove asset
- Hover the asset card and click the delete icon on the right

---

## License

MIT License

---

## Author

Made with love by [Shih-Wei-Lin](https://github.com/Shih-Wei-Lin)
