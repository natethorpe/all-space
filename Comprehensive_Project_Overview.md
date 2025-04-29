# Comprehensive Project Overview: Woodkey Festival and Hi-Way Drive-In CRM with AI Enhancements

**Document Path:**  
`C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\doc\Comprehensive_Project_Overview.md`

**Last Updated:** April 5, 2025

**Authors:** nthorpe, Grok 3 (xAI)

**Purpose:**  
Tracks the development of a custom CRM for Woodkey Festival and Hi-Way Drive-In, integrating AI enhancements, sponsorship management, and future Allur Crypto features. This document serves as a standalone resource for project history, current state, and future plans, ensuring continuity across chats.

**Timeline:**  
- Initiated: March 30, 2025
- Sponsorship CRM Target Completion: April 30, 2025

---

## Objective
We are building an AI-enhanced Customer Relationship Management (CRM) system based on the Idurar ERP/CRM framework, customized for two events:

- **Woodkey Festival:** A music festival requiring sponsor outreach, artist management, and a vibrant UI theme (e.g., bold reds #FF0000, yellows #FFFF00).
- **Hi-Way Drive-In:** A nostalgic drive-in event needing sponsor tracking, business contact management, and a retro UI theme (e.g., oranges #FF4500, browns #8B4513).

### Core Goals
- **Streamline Operations:** Manage sponsors, artists, contacts, and logistics efficiently.
- **Leverage AI:** Automate analytics, communication, scheduling, notifications, and predictive features.
- **Enhance User Experience:** Provide intuitive, event-themed interfaces with mobile integration.
- **Scale:** Grow from 120 sponsors to 301+, eventually supporting thousands and multiple events.
- **Integrate Square POS:** Leverage existing Square usage at Hi-Way Drive-In for ticketing, merchandise, and payments, syncing with the CRM.

---

## Project Structure and Technical Foundations

### Root Directory
- **Structure:**
  - `backend/`: Server-side logic, MongoDB integration, API routes.
  - `frontend/`: React-based UI with Redux for state management.
  - `docs/`: Documentation (e.g., this overview, log files).

### Interconnections
- **Backend-to-Frontend:**
  - **API Communication:** RESTful endpoints (e.g., `http://localhost:8888/api/sponsors`) consumed via Axios (`frontend/src/request/request.js`).
  - **Data Flow:** Backend queries MongoDB, processes data, returns JSON responses.
- **State Management:**
  - **Redux:** Manages frontend state with actions (`src/redux/sponsors/actions.js`), reducers (`src/redux/sponsors/reducer.js`), and a store (`src/redux/store.js`).
  - **LocalStorage:** Persists authentication data (e.g., `{ token, user }`).
- **Component Flow:**
  - `RootApp.jsx` -> `Iduraros.jsx` -> `ErpApp.jsx` -> `AppRouter.jsx` -> `ErpLayout.jsx` -> `Dashboard.jsx` -> (`SponsorHub.jsx`, `EmployeeDash.jsx`, `Calendar.jsx`, `AdminSettings.jsx`, modals).

### Authentication Flow
- User submits credentials in `src/pages/Login.jsx`.
- Form triggers a Redux thunk in `src/redux/auth/actions.js`.
- Thunk calls `src/services/auth.service.js`, sending a POST to `/auth/login`.
- Backend validates, returns `{ success: true, result: { token, user } }`.
- Redux updates state, sets localStorage, and navigates to the dashboard (fixed April 1, 2025).

### Development Environment Setup
- **Backend:**
  1. Command: `cd backend && npm start`
  2. Port: `http://localhost:8888/api`
  3. Dependencies: Express, Mongoose, Nodemailer, JWT.
- **Frontend:**
  1. Command: `cd frontend && npm run dev`
  2. Port: `http://localhost:3000`
  3. Dependencies: React, Redux, Axios, Vite, Ant Design, FullCalendar.
- **Testing Instructions:**
  1. Start backend: `cd backend && npm start`.
  2. Start frontend: `cd frontend && npm run dev`.
  3. Clear Vite cache (Windows): `rd /s /q node_modules\.vite` (if on Unix/Linux, use `rm -rf node_modules/.vite`).

---

## Guidelines for Editing Files
These guidelines ensure consistency and clarity in development:

- **Detailed In-File Notes:**
  - **What:** The change (e.g., "Added pagination logic").
  - **Why:** The reason (e.g., "Supports 120+ sponsors").
  - **Who:** "Nate's instruction from 04/02/2025".
  - **How:** Implementation details (e.g., "Updated DataTable props").
  - **Next Steps:** Verification tasks (e.g., "Test page navigation").
  - **Example:**
    ```javascript
    // Nate's instruction from 04/02/2025: Added pagination to DataTable
    // Why: Allows navigation through 120 sponsors (12 pages)
    // How: Set pagination prop with currentPage and totalItems
    // Next: Test navigation to page 2, verify sponsor list updates
    <DataTable
      columns={columns}
      dataSource={filteredSponsors}
      pagination={{ current: currentPage, pageSize: itemsPerPage, total: sponsors.length, position: ['topRight'] }}
      onChange={(pagination) => setCurrentPage(pagination.current)}
    />
    ```
- **Request Files if Needed:** E.g., "Can you share the latest `backend/src/routes/appRoutes/sponsorRoutes.js`? It may affect the update fix."
- **Be Extremely Detailed:** Include every variable, function call, and side effect.
- **Anticipate Debugging:** Add logs (e.g., `console.log('Sponsors loaded:', sponsors)`) and suggest tests (e.g., "Verify 10 sponsors per page").
- **Preserve Continuity:** Reference past changes and flag unresolved issues.

---

## Current State: Where We Are (April 5, 2025)

### Database
- **Setup:**
  - **Database:** MongoDB, `idurar_db`.
  - **Collection:** `sponsors`.
  - **Connection:** `backend/src/database/db.js`:
    ```javascript
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost:27017/idurar_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    ```
- **Data:** 120 sponsors (updated April 2, 2025) via MongoDB scripts:
  - Real names (e.g., "PepsiCo", "Nike") replaced temporary placeholders ("Sponsor 1").
  - Tiers standardized to "Tier 1" to "Tier 5".
- **Sample Document:**
  ```json
  {
    "_id": "64f8b2c9d4e5f6a8b9c2d1e3",
    "name": "PepsiCo",
    "likeliness": 90,
    "est_cost": 75000,
    "tier_level": "Tier 1",
    "fit_score": 84,
    "email": "contact@pepsico.com",
    "schedule": [
      { "title": "Meeting", "date": "2025-04-03", "_id": "64f8b2c9d4e5f6a8b9c2d1e4" }
    ],
    "email_tasks": [],
    "event": "Woodkey Festival",
    "allurWallet": null,
    "allur_balance": null,
    "wristbandIds": [],
    "socialProfiles": [],
    "historicalData": [],
    "aiInsights": { "externalData": null },
    "coupons": []
  }
  # Comprehensive Project Overview: Woodkey Festival and Hi-Way Drive-In CRM with AI Enhancements

**Document Path:**  
`C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\doc\Comprehensive_Project_Overview.md`

**Last Updated:** April 6, 2025

**Authors:** nthorpe, Grok 3 (xAI)

**Purpose:**  
Tracks the development of a custom CRM for Woodkey Festival and Hi-Way Drive-In, integrating AI enhancements, sponsorship management, and future Allur Crypto features. This document serves as a standalone resource for project history, current state, and future plans, ensuring continuity across chats.

**Timeline:**  
- Initiated: March 30, 2025
- Sponsorship CRM Target Completion: April 30, 2025

---

## Objective
We are building an AI-enhanced Customer Relationship Management (CRM) system based on the Idurar ERP/CRM framework, customized for two events:

- **Woodkey Festival:** A music festival requiring sponsor outreach, artist management, and a vibrant UI theme (e.g., bold reds #FF0000, yellows #FFFF00).
- **Hi-Way Drive-In:** A nostalgic drive-in event needing sponsor tracking, business contact management, and a retro UI theme (e.g., oranges #FF4500, browns #8B4513).

### Core Goals
- **Streamline Operations:** Manage sponsors, artists, contacts, and logistics efficiently.
- **Leverage AI:** Automate analytics, communication, scheduling, notifications, and predictive features.
- **Enhance User Experience:** Provide intuitive, event-themed interfaces with mobile integration.
- **Scale:** Grow from 120 sponsors to 301+, eventually supporting thousands and multiple events.
- **Integrate Square POS:** Leverage existing Square usage at Hi-Way Drive-In for ticketing, merchandise, and payments, syncing with the CRM.

---

## Project Structure and Technical Foundations

### Root Directory
- **Structure:**
  - `backend/`: Server-side logic, MongoDB integration, API routes.
  - `frontend/`: React-based UI with Redux for state management.
  - `docs/`: Documentation (e.g., this overview, log files).

### Interconnections
- **Backend-to-Frontend:**
  - **API Communication:** RESTful endpoints (e.g., `http://localhost:8888/api/sponsors`) consumed via Axios (`frontend/src/request/request.js`).
  - **Data Flow:** Backend queries MongoDB, processes data, returns JSON responses.
- **State Management:**
  - **Redux:** Manages frontend state with actions (`src/redux/sponsors/actions.js`), reducers (`src/redux/sponsors/reducer.js`), and a store (`src/redux/store.js`).
  - **LocalStorage:** Persists authentication data (e.g., `{ token, user }`).
- **Component Flow:**
  - `RootApp.jsx` -> `Iduraros.jsx` -> `ErpApp.jsx` -> `AppRouter.jsx` -> `ErpLayout.jsx` -> `Dashboard.jsx` -> (`SponsorHub.jsx`, `EmployeeDash.jsx`, `Calendar.jsx`, `AdminSettings.jsx`, modals).

### Authentication Flow
- User submits credentials in `src/pages/Login.jsx`.
- Form triggers a Redux thunk in `src/redux/auth/actions.js`.
- Thunk calls `src/services/auth.service.js`, sending a POST to `/auth/login`.
- Backend validates, returns `{ success: true, result: { token, user } }`.
- Redux updates state, sets localStorage, and navigates to the dashboard (fixed April 1, 2025).

### Development Environment Setup
- **Backend:**
  1. Command: `cd backend && npm start`
  2. Port: `http://localhost:8888/api`
  3. Dependencies: Express, Mongoose, Nodemailer, JWT.
- **Frontend:**
  1. Command: `cd frontend && npm run dev`
  2. Port: `http://localhost:3000`
  3. Dependencies: React, Redux, Axios, Vite, Ant Design, FullCalendar.
- **Testing Instructions:**
  1. Start backend: `cd backend && npm start`.
  2. Start frontend: `cd frontend && npm run dev`.
  3. Clear Vite cache (Windows): `rd /s /q node_modules\.vite` (if on Unix/Linux, use `rm -rf node_modules/.vite`).

---

## Guidelines for Editing Files
These guidelines ensure consistency and clarity in development:

- **Detailed In-File Notes:**
  - **What:** The change (e.g., "Added pagination logic").
  - **Why:** The reason (e.g., "Supports 120+ sponsors").
  - **Who:** "Nate's instruction from 04/02/2025".
  - **How:** Implementation details (e.g., "Updated DataTable props").
  - **Next Steps:** Verification tasks (e.g., "Test page navigation").
  - **Example:**
    ```javascript
    // Nate's instruction from 04/02/2025: Added pagination to DataTable
    // Why: Allows navigation through 120 sponsors (12 pages)
    // How: Set pagination prop with currentPage and totalItems
    // Next: Test navigation to page 2, verify sponsor list updates
    <DataTable
      columns={columns}
      dataSource={filteredSponsors}
      pagination={{ current: currentPage, pageSize: itemsPerPage, total: sponsors.length, position: ['topRight'] }}
      onChange={(pagination) => setCurrentPage(pagination.current)}
    />
    ```
- **Request Files if Needed:** E.g., "Can you share the latest `backend/src/routes/appRoutes/sponsorRoutes.js`? It may affect the update fix."
- **Be Extremely Detailed:** Include every variable, function call, and side effect.
- **Anticipate Debugging:** Add logs (e.g., `console.log('Sponsors loaded:', sponsors)`) and suggest tests (e.g., "Verify 10 sponsors per page").
- **Preserve Continuity:** Reference past changes and flag unresolved issues.

---

## Current State: Where We Are (April 6, 2025)

### Database
- **Setup:**
  - **Database:** MongoDB, `idurar_db`.
  - **Collection:** `sponsors`.
  - **Connection:** `backend/src/database/db.js`:
    ```javascript
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost:27017/idurar_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    ```
- **Data:** 120 sponsors (updated April 2, 2025) via MongoDB scripts:
  - Real names (e.g., "PepsiCo", "Nike") replaced temporary placeholders ("Sponsor 1").
  - Tiers standardized to "Tier 1" to "Tier 5".
- **Sample Document:**
  ```json
  {
    "_id": "64f8b2c9d4e5f6a8b9c2d1e3",
    "name": "PepsiCo",
    "likeliness": 90,
    "est_cost": 75000,
    "tier_level": "Tier 1",
    "fit_score": 84,
    "email": "contact@pepsico.com",
    "schedule": [
      { "title": "Meeting", "date": "2025-04-03", "_id": "64f8b2c9d4e5f6a8b9c2d1e4" }
    ],
    "email_tasks": [],
    "event": "Woodkey Festival",
    "allurWallet": null,
    "allur_balance": null,
    "wristbandIds": [],
    "socialProfiles": [],
    "historicalData": [],
    "aiInsights": { "externalData": null },
    "coupons": []
  }
  # Comprehensive Project Overview: Woodkey Festival and Hi-Way Drive-In CRM with AI Enhancements

**Document Path:**  
`C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\doc\Comprehensive_Project_Overview.md`

**Last Updated:** April 6, 2025

**Authors:** nthorpe, Grok 3 (xAI)

**Purpose:**  
Tracks the development of a custom CRM for Woodkey Festival and Hi-Way Drive-In, integrating AI enhancements, sponsorship management, and future Allur Crypto features. This document serves as a standalone resource for project history, current state, and future plans, ensuring continuity across chats.

**Timeline:**  
- Initiated: March 30, 2025
- Sponsorship CRM Target Completion: April 30, 2025

---

## Objective
We are building an AI-enhanced Customer Relationship Management (CRM) system based on the Idurar ERP/CRM framework, customized for two events:

- **Woodkey Festival:** A music festival requiring sponsor outreach, artist management, and a vibrant UI theme (e.g., bold reds #FF0000, yellows #FFFF00).
- **Hi-Way Drive-In:** A nostalgic drive-in event needing sponsor tracking, business contact management, and a retro UI theme (e.g., oranges #FF4500, browns #8B4513).

### Core Goals
- **Streamline Operations:** Manage sponsors, artists, contacts, and logistics efficiently.
- **Leverage AI:** Automate analytics, communication, scheduling, notifications, and predictive features.
- **Enhance User Experience:** Provide intuitive, event-themed interfaces with mobile integration.
- **Scale:** Grow from 120 sponsors to 301+, eventually supporting thousands and multiple events.
- **Integrate Square POS:** Leverage existing Square usage at Hi-Way Drive-In for ticketing, merchandise, and payments, syncing with the CRM.

---

## Project Structure and Technical Foundations

### Root Directory
- **Structure:**
  - `backend/`: Server-side logic, MongoDB integration, API routes.
  - `frontend/`: React-based UI with Redux for state management.
  - `docs/`: Documentation (e.g., this overview, log files).

### Interconnections
- **Backend-to-Frontend:**
  - **API Communication:** RESTful endpoints (e.g., `http://localhost:8888/api/sponsors`) consumed via Axios (`frontend/src/request/request.js`).
  - **Data Flow:** Backend queries MongoDB, processes data, returns JSON responses.
- **State Management:**
  - **Redux:** Manages frontend state with actions (`src/redux/sponsors/actions.js`), reducers (`src/redux/sponsors/reducer.js`), and a store (`src/redux/store.js`).
  - **LocalStorage:** Persists authentication data (e.g., `{ token, user }`).
- **Component Flow:**
  - `RootApp.jsx` -> `Iduraros.jsx` -> `ErpApp.jsx` -> `AppRouter.jsx` -> `ErpLayout.jsx` -> `Dashboard.jsx` -> (`SponsorHub.jsx`, `EmployeeDash.jsx`, `Calendar.jsx`, `AdminSettings.jsx`, modals).

### Authentication Flow
- User submits credentials in `src/pages/Login.jsx`.
- Form triggers a Redux thunk in `src/redux/auth/actions.js`.
- Thunk calls `src/services/auth.service.js`, sending a POST to `/auth/login`.
- Backend validates, returns `{ success: true, result: { token, user } }`.
- Redux updates state, sets localStorage, and navigates to the dashboard (fixed April 1, 2025).

### Development Environment Setup
- **Backend:**
  1. Command: `cd backend && npm start`
  2. Port: `http://localhost:8888/api`
  3. Dependencies: Express, Mongoose, Nodemailer, JWT.
- **Frontend:**
  1. Command: `cd frontend && npm run dev`
  2. Port: `http://localhost:3000`
  3. Dependencies: React, Redux, Axios, Vite, Ant Design, FullCalendar.
- **Testing Instructions:**
  1. Start backend: `cd backend && npm start`.
  2. Start frontend: `cd frontend && npm run dev`.
  3. Clear Vite cache (Windows): `rd /s /q node_modules\.vite` (if on Unix/Linux, use `rm -rf node_modules/.vite`).

---

## Guidelines for Editing Files
These guidelines ensure consistency and clarity in development:

- **Detailed In-File Notes:**
  - **What:** The change (e.g., "Added pagination logic").
  - **Why:** The reason (e.g., "Supports 120+ sponsors").
  - **Who:** "Nate's instruction from 04/02/2025".
  - **How:** Implementation details (e.g., "Updated DataTable props").
  - **Next Steps:** Verification tasks (e.g., "Test page navigation").
  - **Example:**
    ```javascript
    // Nate's instruction from 04/02/2025: Added pagination to DataTable
    // Why: Allows navigation through 120 sponsors (12 pages)
    // How: Set pagination prop with currentPage and totalItems
    // Next: Test navigation to page 2, verify sponsor list updates
    <DataTable
      columns={columns}
      dataSource={filteredSponsors}
      pagination={{ current: currentPage, pageSize: itemsPerPage, total: sponsors.length, position: ['topRight'] }}
      onChange={(pagination) => setCurrentPage(pagination.current)}
    />
    ```
- **Request Files if Needed:** E.g., "Can you share the latest `backend/src/routes/appRoutes/sponsorRoutes.js`? It may affect the update fix."
- **Be Extremely Detailed:** Include every variable, function call, and side effect.
- **Anticipate Debugging:** Add logs (e.g., `console.log('Sponsors loaded:', sponsors)`) and suggest tests (e.g., "Verify 10 sponsors per page").
- **Preserve Continuity:** Reference past changes and flag unresolved issues.

---

## Current State: Where We Are (April 6, 2025)

### Database
- **Setup:**
  - **Database:** MongoDB, `idurar_db`.
  - **Collection:** `sponsors`.
  - **Connection:** `backend/src/database/db.js`:
    ```javascript
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost:27017/idurar_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    ```
- **Data:** 120 sponsors (updated April 2, 2025) via MongoDB scripts:
  - Real names (e.g., "PepsiCo", "Nike") replaced temporary placeholders ("Sponsor 1").
  - Tiers standardized to "Tier 1" to "Tier 5".
- **Sample Document:**
  ```json
  {
    "_id": "64f8b2c9d4e5f6a8b9c2d1e3",
    "name": "PepsiCo",
    "likeliness": 90,
    "est_cost": 75000,
    "tier_level": "Tier 1",
    "fit_score": 84,
    "email": "contact@pepsico.com",
    "schedule": [
      { "title": "Meeting", "date": "2025-04-03", "_id": "64f8b2c9d4e5f6a8b9c2d1e4" }
    ],
    "email_tasks": [],
    "event": "Woodkey Festival",
    "allurWallet": null,
    "allur_balance": null,
    "wristbandIds": [],
    "socialProfiles": [],
    "historicalData": [],
    "aiInsights": { "externalData": null },
    "coupons": []
  }