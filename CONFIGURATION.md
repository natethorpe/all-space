Allur Space Console: Configuration and Usage
Overview
This file details setup, environment variables, and usage instructions for the Allur Space Console, based on https://github.com/natethorpe/all-space.git (checked May 1, 2025), using Grok 3 (free/paid) to prioritize console completion for building/maintaining Frugal, Funny List, AllurTasks, AllurSphere, AI Persona System, and ADAMS via CRM with ALL Token (0x732bd2988098244fe6133dfd304216764f1f088e).
Environment Setup

Clone Repository:git clone https://github.com/natethorpe/all-space.git
cd all-space


Install Dependencies:
Backend: cd backend && npm install
Frontend: cd frontend && npm install


Databases:
MongoDB: mongodb://localhost:27017.
TimescaleDB: postgresql://localhost:5432/adams.
Neo4j: bolt://localhost:7687.


API Keys:
Obtain xAI Grok, Square, Mapbox, Google Trends, eBay, Twitter, TikTok, Infura, CoinGecko.
Store in backend/.env, frontend/.env.



Environment Variables
Backend (.env)
MONGO_URI=mongodb://localhost:27017/idurar_db
TIMESCALE_URI=postgresql://localhost:5432/adams
NEO4J_URI=bolt://localhost:7687
PORT=8888
XAI_GROK_API_KEY=your-grok-key
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_CLIENT_ID=your-square-client-id
SQUARE_CLIENT_SECRET=your-square-secret
ALL_TOKEN_CONTRACT_ADDRESS=0x732bd2988098244fe6133dfd304216764f1f088e
ETHEREUM_NODE_URL=https://mainnet.infura.io/v3/your-infura-key
POLYGON_NODE_URL=https://polygon-rpc.com
MAPBOX_TOKEN=pk.your-mapbox-token
GOOGLE_TRENDS_KEY=your-trends-key
EBAY_API_KEY=your-ebay-key
TWITTER_TOKEN=your-twitter-token
TIKTOK_TOKEN=your-tiktok-token
COINGECKO_API_KEY=your-coingecko-key

Frontend (.env)
VITE_API_URL=http://localhost:8888
VITE_SQUARE_APP_ID=your-square-app-id
VITE_MAPBOX_TOKEN=pk.your-mapbox-token

Usage Instructions

Start Servers:
Backend: cd backend && npm start (port 8888)
Frontend: cd frontend && npm run dev (port 3000)


Access Console:
Navigate to http://localhost:3000/grok.
Login: admin@idurarapp.com / admin123.


Submit Tasks:
Use TaskInput.jsx (e.g., “Build AllurSphere with festival map”).
Monitor in TaskList.jsx, LiveFeed.jsx.
Use paid Grok tier for DeepSearch, Think mode.


Manage Programs via CRM:
Sponsors: /sponsors (SponsorDashboard.jsx).
Contacts: /contacts (ContactManager.jsx).
Apps: /programs (ProgramBuilder.jsx).
Wallet: /wallet (WalletDashboard.jsx).
Frugal: /coupons (CouponSearch.jsx).
AllurSphere: /sphere (AllurSphere.jsx).
AllurTasks: /tasks (AllurTasks.jsx).
Funny List: /funny (FunnyList.jsx).
Inventory: /inventory (InventoryDashboard.jsx).
Box Office: /boxoffice (BoxOfficeReport.jsx).
Clock In/Out: /clock (ClockInOut.jsx).
Personas: /personas (PersonaDashboard.jsx).
Trading: /trading (TradingDashboard.jsx).


Test Features:
Build Frugal app, AI persona, ADAMS with console at /programs.
Send Grok-generated sponsor email via /sponsors.
Redeem Frugal coupon with mock RFID (RFID12345, 2 ALL).
Post AllurTasks task with Hi-Way Drive-In coordinates.
Scroll Funny List, claim 1 ALL reward.
Test AllurSphere post with Frugal coupon, 2 ALL reward.
Verify ADAMS ALL trades at /trading.
Create virtual sponsor at /personas.



Program-Specific Configurations

CRM (Sponsorship/Contact): XAI_GROK_API_KEY for emailer.js, logAnalyzer.js.
ALL Token/ADAMS: ALL_TOKEN_CONTRACT_ADDRESS, ETHEREUM_NODE_URL, POLYGON_NODE_URL, SQUARE_ACCESS_TOKEN, COINGECKO_API_KEY.
Frugal: SQUARE_ACCESS_TOKEN, sharp, qrcode.
AllurSphere: MAPBOX_TOKEN, XAI_GROK_API_KEY.
AllurTasks: MAPBOX_TOKEN, XAI_GROK_API_KEY.
Funny List: GOOGLE_TRENDS_KEY, EBAY_API_KEY, XAI_GROK_API_KEY.
Inventory/BORS: SQUARE_ACCESS_TOKEN, XAI_GROK_API_KEY.
AI Persona System: NEO4J_URI, XAI_GROK_API_KEY, kafkajs.

Notes

Secure API keys in .env.
Verify database connections.
Use paid Grok tier for critical tasks.

