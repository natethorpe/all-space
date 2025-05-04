Allur Space Console: Project Context
Project Overview
The Allur Space Console is the autonomous, AI-driven core of the IDURAR ERP/CRM ecosystem, designed to build, deploy, and maintain complex programs for Woodkey Festival, Hi-Way Drive-In, Chase N Daisies, and Camp Carson. Built with React, Node.js/Express, MongoDB, Socket.IO, and Playwright, it integrates the ALL Token (symbol: ALL, contract: 0x732bd2988098244fe6133dfd304216764f1f088e, 99M supply) for rewards and transactions, and leverages xAI’s Grok 3 (free/paid tiers) for code generation, emailers, analytics, and content. The console’s CRM centrally administers Frugal Coupon Book, Funny List, AllurTasks (Micro Service), AllurSphere (Sphere Social), the Scalable AI Persona Management System, and the Advanced Digital Asset Management System (ADAMS), which appear as independent components but are interconnected, utilizing each other as resources with ALL Token rewards. The primary goal is to complete the console as the foundational platform capable of autonomously building and maintaining all components, delivering badass apps by Q2 2025 (July 2025).

Repository: https://github.com/natethorpe/all-space.git (public, checked May 1, 2025)
Current Sprint: Sprint 2 (ends May 2, 2025)
Objective: Stabilize core functionality, integrate ALL Token, and prioritize completion of the console to autonomously build/maintain sites, personas, ADAMS, and blockchain integrations, with CRM-driven sponsorship/contact management using Grok 3’s DeepSearch and Think mode.

System Architecture
Backend

Technologies: Node.js, Express, MongoDB, Socket.IO, Winston, Web3.js, xAI Grok API, Playwright, Hardhat, Mapbox API, Sharp, QRCode, Apache Kafka, TimescaleDB, Neo4j, ccxt, The Graph
Key Components:
API Layer: Routes in routes/taskRoutes.js, sponsorRoutes.js, contactRoutes.js, programRoutes.js, wristbandRoutes.js, couponRoutes.js, inventoryRoutes.js, boxofficeRoutes.js, socialRoutes.js, taskProgramRoutes.js, paymentRoutes.js, contentRoutes.js, personaRoutes.js, tradingRoutes.js for tasks, sponsors, contacts, programs, wristbands, coupons, inventory, box office, social media, micro-tasks, payments, content, personas, trading.
Task Processing: utils/taskManager.js orchestrates tasks; utils/fileGeneratorV18.js generates code/files with Grok 3; utils/taskTesterV18.js runs Playwright tests.
Program Management: utils/programManager.js builds apps, personas, ADAMS; utils/appScaffolder.js creates templates; utils/appMaintainer.js handles updates; utils/crossProgramAPI.js enables inter-component resource sharing.
Database: MongoDB (config/db.js) for Task, Sponsor, Contact; TimescaleDB for market data; Neo4j for persona graphs.
Real-Time: utils/socket.js, socketRegistry.js manage Socket.IO events; Kafka for data streams.
Blockchain: web3.js integrates ALL Token contract (0x732bd2988098244fe6133dfd304216764f1f088e); The Graph for DeFi analytics; Polygon bridge for low-cost transactions.
AI: Grok 3 API (free for content, paid for DeepSearch/Think mode) powers fileGeneratorV18.js, utils/emailer.js, utils/logAnalyzer.js, controllers/contentController.js, controllers/socialController.js, controllers/taskController.js, controllers/personaController.js, controllers/tradingController.js.
Payments: paymentController.js integrates Square (2.6%+$0.10 in-person, 2.9%+$0.30 online).
Geolocation: Mapbox API in taskController.js for AllurTasks.
Image Processing: sharp, qrcode in couponController.js for Frugal.
Trading: tradingController.js uses ccxt, XGBoost for ALL Token investments.



Frontend

Technologies: React, Ant Design, Redux, Vite, Socket.IO Client, Web3.js, Mapbox GL JS, Chart.js, Prism.js, D3.js
Key Components:
Interface: src/components/GrokUI.jsx (console), TaskInput.jsx, TaskList.jsx, LiveFeed.jsx, SponsorDashboard.jsx, ContactManager.jsx, ProgramBuilder.jsx, WalletDashboard.jsx, CouponSearch.jsx (Frugal), InventoryDashboard.jsx, BoxOfficeReport.jsx, ClockInOut.jsx, AllurSphere.jsx (Sphere Social), AllurTasks.jsx (Micro Service), FunnyList.jsx (Funny List), PersonaDashboard.jsx, TradingDashboard.jsx.
Hooks: src/hooks/useTaskSocket.js, useTaskActions.js, useTaskDiff.jsx, useSponsorActions.js, useProgramActions.js, useWalletActions.js, usePersonaActions.js.
Routing: src/AppRouter.jsx for routes (/grok, /dashboard, /sponsors, /contacts, /programs, /wallet, /coupons, /inventory, /boxoffice, /clock, /sphere, /tasks, /funny, /personas, /trading).



Integrated Programs

Sponsorship Management: CRM core (sponsorRoutes.js, SponsorDashboard.jsx) manages sponsors ($10/coupon, $250–$8000 listings) with Grok’s emailers (emailer.js) and analytics (logAnalyzer.js, Think mode).
Contact Management: CRM-driven (contactRoutes.js, ContactManager.jsx) with Grok’s DeepSearch for engagement.
ALL Token: Powers rewards/payments (wristbandController.js, walletController.js, WalletDashboard.jsx) using ALL (0x732bd2988098244fe6133dfd304216764f1f088e); ADAMS optimizes investments (tradingController.js).
Frugal Coupon Book: Independent app (CouponSearch.jsx, BusinessDashboard.jsx) for coupon search/creation, QR redemption with ALL rewards; CRM manages sponsor coupons, syncs with Inventory.
AllurSphere (Sphere Social): Social platform (AllurSphere.jsx) with Web3 posts, Grok content, festival maps; CRM manages influencer sponsorships, shares Frugal coupons, ALL rewards for posts.
AllurTasks (Micro Service): Micro-task marketplace (AllurTasks.jsx) with Mapbox, Grok’s DeepSearch, ALL rewards; CRM assigns sponsor tasks, uses Funny List content.
Funny List: Content platform (FunnyList.jsx) with Grok-generated memes, ads, ALL rewards; CRM manages ad sponsors, sources AllurTasks content.
Inventory Section: Multi-location inventory (InventoryDashboard.jsx) with Grok forecasting; CRM syncs with Frugal.
Movie Theater BORS: Box office reporting (BoxOfficeReport.jsx) with Grok insights, ALL ticket purchases; CRM manages ticket sponsors.
Employee Clock In/Out: Staff hours (ClockInOut.jsx) with wristband integration, ALL rewards; CRM assigns sponsor tasks.
AI Persona System: Virtual sponsors/influencers (personaController.js, PersonaDashboard.jsx) with Grok-generated personas for AllurSphere, AllurTasks.
ADAMS: Trading platform (tradingController.js, TradingDashboard.jsx) optimizes ALL, sponsor revenue, Funny List ads.

Inter-Component Resource Sharing

Frugal: Shares ALL-rewarded coupons with AllurSphere for festival promotions, uses AllurTasks for coupon creation tasks.
AllurSphere: Posts Frugal coupons, Funny List content, AllurTasks jobs, uses CRM sponsor analytics, ALL rewards for interactions.
AllurTasks: Fulfills Funny List content tasks, Frugal coupon tasks, AllurSphere event staffing, managed by CRM, ALL rewards for completions.
Funny List: Sources content via AllurTasks, promotes Frugal coupons, AllurSphere events, monetized by CRM sponsors, ALL rewards for scrolls.
AI Persona System: Generates virtual users for AllurSphere posts, AllurTasks tasks, CRM sponsorships, using ALL rewards.
ADAMS: Optimizes ALL investments, Funny List ads, and sponsor revenue, shares analytics with CRM.

Foundational Elements

App Scaffolding: appScaffolder.js generates templates (React, Node.js, Solidity) for sites, personas, ADAMS, and blockchain with ALL Token integration, using Grok’s reasoning.
App Maintenance: appMaintainer.js applies updates, Grok-optimized UX, monitors ALL transactions.
Cross-Program API: crossProgramAPI.js enables data sharing (e.g., Frugal coupons in AllurSphere, ALL rewards across components).
Data Pipeline: Kafka/TimescaleDB for real-time analytics (sponsor data, ALL trades); Neo4j for personas; MongoDB for CRM.
CRM Integration: sponsorRoutes.js, contactRoutes.js manage all components’ sponsorships, analytics, maintenance, and ALL reward distribution.

Data Flow

CRM (SponsorDashboard.jsx) assigns tasks via TaskInput.jsx to /api/grok/edit, processed by taskManager.js.
programManager.js builds/maintains components using appScaffolder.js, fileGeneratorV18.js (Grok 3), taskTesterV18.js.
Components share resources via crossProgramAPI.js, managed by CRM, using ALL for rewards.
Sponsors/contacts updated via SponsorDashboard.jsx/ContactManager.jsx with Grok emailers/logs.
Wristband transactions sync with ALL/Square; ADAMS optimizes via tradingController.js.
Socket.IO updates LiveFeed.jsx, TaskList.jsx, component UIs.

Key Files
All files in https://github.com/natethorpe/all-space.git.
Backend

app.js: Initializes Express, routes, Socket.IO.
config/db.js: MongoDB connection, schemas.
routes/taskRoutes.js, sponsorRoutes.js, contactRoutes.js, programRoutes.js, wristbandRoutes.js, couponRoutes.js, inventoryRoutes.js, boxofficeRoutes.js, socialRoutes.js, taskProgramRoutes.js, paymentRoutes.js, contentRoutes.js, personaRoutes.js, tradingRoutes.js: API endpoints.
utils/taskManager.js, programManager.js, appScaffolder.js, appMaintainer.js, crossProgramAPI.js, fileGeneratorV18.js, taskTesterV18.js, socketRegistry.js, logUtils.js, emailer.js, logAnalyzer.js: Utilities.
controllers/wristbandController.js, walletController.js, couponController.js, inventoryController.js, boxofficeController.js, socialController.js, taskController.js, paymentController.js, contentController.js, personaController.js, tradingController.js: Program logic.

Frontend

src/components/GrokUI.jsx, TaskInput.jsx, TaskList.jsx, LiveFeed.jsx, SponsorDashboard.jsx, ContactManager.jsx, ProgramBuilder.jsx, WalletDashboard.jsx, CouponSearch.jsx, InventoryDashboard.jsx, BoxOfficeReport.jsx, ClockInOut.jsx, AllurSphere.jsx, AllurTasks.jsx, FunnyList.jsx, PersonaDashboard.jsx, TradingDashboard.jsx: UI components.
src/hooks/useTaskSocket.js, useTaskActions.js, useTaskDiff.jsx, useSponsorActions.js, useProgramActions.js, useWalletActions.js, usePersonaActions.js: Hooks.
src/AppRouter.jsx: Routing.

Current State (Sprint 2, May 1, 2025)

Repository Updates (commits, e.g., i7j8k9l):
Fixed logInfo in taskManager.js (commit a1b2c3d, April 30, 2025).
Resolved /api/sponsors/summary 404 in sponsorRoutes.js (commit e4f5g6h).
Stabilized WebSocket in useTaskSocket.js, app.js (commit i7j8k9l).
Fixed Space import in TaskInput.jsx (commit m0n1o2p).
Added programManager.js, ProgramBuilder.jsx, AllurTasks.jsx, FunnyList.jsx (commit q3r4s5t).


Pending Issues (GitHub issues #42–#48):
ReferenceError: record is not defined in fileGeneratorV18.js:343 (fix: record to item, issue #42).
Duplicate taskUpdate events in taskRoutes.js, TaskInput.jsx (issue #45).
TypeError: connectDB is not a function in app.js:79 (needs db.js export, issue #43).
Grok API integration incomplete in emailer.js, logAnalyzer.js (issue #46).
ALL Token contract unverified in wristbandController.js (issue #47).
Mapbox untested in AllurTasks.jsx (issue #48).


Critical Tasks:
Merge fileGeneratorV18.js fix, test app generation.
Fix connectDB in app.js.
Integrate Grok API in emailer.js, logAnalyzer.js.
Verify ALL Token contract (0x732bd2988098244fe6133dfd304216764f1f088e) in wristbandController.js.
Test Mapbox in AllurTasks.jsx.
Add appScaffolder.js, appMaintainer.js, crossProgramAPI.js.



Development Environment

Path: C:\Users\nthorpe\Desktop\erm\idurar-erp-crm
Backend: npm start (port 8888)
Frontend: npm run dev (port 3000)
MongoDB: MONGO_URI=mongodb://localhost:27017/idurar_db
TimescaleDB: TIMESCALE_URI=postgresql://localhost:5432/adams
Neo4j: NEO4J_URI=bolt://localhost:7687
ALL Token Contract: 0x732bd2988098244fe6133dfd304216764f1f088e
Admin Login: admin@idurarapp.com / admin123

Testing Instructions

Clear Vite cache: rd /s /q frontend\node_modules\.vite.
Start servers: npm start (backend), npm run dev (frontend).
Submit task at http://localhost:3000/grok (e.g., “Build AllurSphere with festival map”).
Test console at /programs (e.g., scaffold Frugal app, AI persona, ADAMS).
Test CRM at /sponsors, /contacts (e.g., send Grok email, assign Frugal sponsor).
Verify sites: /coupons (Frugal), /sphere (AllurSphere), /tasks (AllurTasks), /funny (Funny List).
Test resource sharing (e.g., Frugal coupon in AllurSphere post with ALL reward).
Verify ALL reward at /wallet with mock RFID (RFID12345, 2 ALL/coupon).
Test ADAMS at /trading with mock ALL trades.
Test personas at /personas with Grok-generated sponsor profile.
Check idurar_db.logs, grok.log, localStorage.clientErrors.

Notes

Repository (https://github.com/natethorpe/all-space.git) is source of truth.
Back up files (xcopy to backup-%date%).
Share logs, xAI API key.

