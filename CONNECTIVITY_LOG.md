# Connectivity Log

## Overview
This log documents the structure, dependencies, purposes, and future enhancements of the Woodkey Festival and Hi-Way Drive-In CRM frontend, focusing on how components, files, and functionalities are interconnected. It aims to improve debugging and development by providing a clear map of the system.

## System Structure
### Core Components
- **App.jsx (RootApp.jsx)**
  - **Purpose:** Root component that sets up the app with Redux, React Router, and Ant Design providers.
  - **Dependencies:**
    - Redux: `Provider` from `react-redux` for state management.
    - React Router: `BrowserRouter` from `react-router-dom` for routing.
    - Ant Design: `ConfigProvider` for theming and localization.
  - **Dependents:**
    - `Iduraros.jsx`: Renders the main app content.
  - **Future Enhancements:**
    - Add theme switching (e.g., dark mode).
    - Integrate error tracking (e.g., Sentry).

- **Iduraros.jsx**
  - **Purpose:** Main app wrapper, handles initial navigation and auth state.
  - **Dependencies:**
    - Redux: `useSelector` for auth state.
    - React Router: `useNavigate` for navigation.
  - **Dependents:**
    - `ErpApp.jsx`: Renders the app layout.
  - **Future Enhancements:**
    - Add deep linking support.

- **ErpApp.jsx**
  - **Purpose:** Sets up the app layout with `ErpLayout`.
  - **Dependencies:**
    - `ErpLayout.jsx`: Provides the layout structure.
  - **Dependents:**
    - `AppRouter.jsx`: Defines routes.
  - **Future Enhancements:**
    - Add global error handling.

- **AppRouter.jsx**
  - **Purpose:** Defines the app’s routes, wrapping authenticated routes with `ErpLayout`.
  - **Dependencies:**
    - React Router: `Routes`, `Route` from `react-router-dom`.
    - `ErpLayout.jsx`: Layout wrapper for authenticated routes.
    - `Dashboard.jsx`: Main dashboard route.
  - **Dependents:**
    - `ErpApp.jsx`: Renders `AppRouter` as the main content.
  - **Future Enhancements:**
    - Add role-based routing (e.g., admin-only routes).
    - Implement lazy loading for routes.

- **ErpLayout.jsx**
  - **Purpose:** Provides the main layout structure for authenticated routes, including a sidebar, header, and content area.
  - **Dependencies:**
    - Ant Design: `Layout`, `Menu`, `Dropdown`, `Button` for UI.
    - `global.css`: Styles for `.erp-layout`, `.erp-inner-layout`, `.erp-content`.
  - **Dependents:**
    - `AppRouter.jsx`: Wraps authenticated routes (e.g., `Dashboard.jsx`).
    - `Dashboard.jsx`: Renders within the content area.
  - **Future Enhancements:**
    - Add dynamic menu items based on user role.
    - Integrate ALLU branding in the logo (e.g., animated logo for SPHERE).
    - Add a collapsible sidebar toggle for better mobile UX.

- **Dashboard.jsx**
  - **Purpose:** Main UI component for sponsor management, displaying sponsor list, employee dashboard, calendar, admin settings, and modals for CRUD operations.
  - **Dependencies:**
    - Ant Design: `Row`, `Col`, `Typography`, `App`, `Form`, `Button` for UI.
    - `useSponsorDashboard.js`: Hook for state and data management.
    - `SponsorHub.jsx`, `EmployeeDash.jsx`, `Calendar.jsx`, `AdminSettings.jsx`: Child components for sections.
    - `EmailModal.jsx`, `EventModal.jsx`, `SponsorModal.jsx`: Modals for CRUD operations.
    - `handlers.js`: Event handlers for modals.
    - `global.css`: Layout and typography styles.
    - `debug.js`: `getDashboardLayoutStyles` for DOM debugging.
  - **Dependents:**
    - `AppRouter.jsx`: Renders as a route.
  - **Future Enhancements:**
    - Add ALLU crypto integration (e.g., wallet display in `SponsorHub`).
    - Integrate AI for email drafting and scheduling.
    - Add a "Funny Sponsor Names" widget in `EmployeeDash`.

- **useSponsorDashboard.js**
  - **Purpose:** Custom hook to manage state and logic for the sponsor dashboard, including data fetching, modals, and pagination.
  - **Dependencies:**
    - Redux: `useDispatch`, `useSelector` for state management.
    - `loadSponsors` from `redux/sponsors/actions`: Fetches sponsor data.
    - `selectAuth` from `redux/auth/selectors`: Fetches user data.
    - Ant Design: `message` for error notifications.
    - `request.js`: Uses `fetchSponsors` to make API calls.
  - **Dependents:**
    - `Dashboard.jsx`: Uses the hook for state and data.
    - `SponsorHub.jsx`: Uses state setters (e.g., `setCurrentPage`, `setSearchTerm`).
  - **Future Enhancements:**
    - Persist search and filter state in localStorage.
    - Integrate AI to predict sponsor fit scores.

- **SponsorHub.jsx**
  - **Purpose:** Displays a list of sponsors in a table with search, tier filtering, pagination, and actions (email, schedule, edit).
  - **Dependencies:**
    - Ant Design: `Input`, `Select`, `Button` for UI.
    - `DataTable.jsx`: Renders the sponsor table.
    - `useSponsorDashboard.js`: Provides state and setters.
    - `global.css`: Table and layout styles (e.g., `.sponsor-hub-controls` for alignment).
  - **Dependents:**
    - `Dashboard.jsx`: Renders as a section.
  - **Future Enhancements:**
    - Add sorting options for columns.
    - Implement inline editing for sponsors.
    - Add ALLU wallet balance column.

- **EmployeeDash.jsx**
  - **Purpose:** Displays a simple employee dashboard showing the user’s role and loading state.
  - **Dependencies:**
    - Ant Design: `Typography` for UI.
    - `global.css`: Layout styles.
  - **Dependents:**
    - `Dashboard.jsx`: Renders as a section.
  - **Future Enhancements:**
    - Add employee-specific tasks or actions.
    - Display additional user info (e.g., email, last login).

- **Calendar.jsx**
  - **Purpose:** Displays a calendar of sponsor events, allowing users to view and interact with scheduled events.
  - **Dependencies:**
    - FullCalendar: `@fullcalendar/react`, `dayGridPlugin`, `interactionPlugin` for calendar rendering.
    - `global.css`: FullCalendar styles (e.g., `.fc` for visibility and sizing).
  - **Dependents:**
    - `Dashboard.jsx`: Renders as a section.
  - **Future Enhancements:**
    - Add event editing support.
    - Integrate AI to suggest optimal event dates.
    - Implement lazy loading for large event datasets.

- **AdminSettings.jsx**
  - **Purpose:** Displays admin settings for scheduling (visible to admins only).
  - **Dependencies:**
    - Ant Design: `Typography`, `Button` for UI.
    - `global.css`: Layout styles.
  - **Dependents:**
    - `Dashboard.jsx`: Renders as a section (admin-only).
  - **Future Enhancements:**
    - Add functional buttons for scheduling optimization.
    - Support tier auto-assignment for sponsors.

- **DataTable.jsx**
  - **Purpose:** Reusable table component for displaying data, used by `SponsorHub.jsx` to render the sponsor list.
  - **Dependencies:**
    - Ant Design: `Table`, `Input`, `Button`, `Dropdown`, `PageHeader` for UI.
    - Redux: `crud/actions`, `crud/selectors` for default data fetching.
    - `useCrudContext`: Manages modal states.
    - `global.css`: Table styles.
  - **Dependents:**
    - `SponsorHub.jsx`: Uses to display sponsor list.
  - **Future Enhancements:**
    - Add crypto payment action in dropdown (ALLU).
    - Add cost tracking column (Frugal).
    - Add social media share action (SPHERE).

- **EmailModal.jsx**
  - **Purpose:** Modal for sending emails to sponsors, with fields for subject and body.
  - **Dependencies:**
    - Ant Design: `Modal`, `Form`, `Input` for UI.
    - `useSponsorDashboard.js`: Provides state (`emailModalVisible`, `emailData`).
    - `handlers.js`: Provides `handleEmailSend`.
  - **Dependents:**
    - `Dashboard.jsx`: Renders as a modal.
  - **Future Enhancements:**
    - Add AI-suggested email content.

- **EventModal.jsx**
  - **Purpose:** Modal for adding/editing sponsor events, with fields for title, date, and description.
  - **Dependencies:**
    - Ant Design: `Modal`, `Form`, `Input`, `DatePicker` for UI.
    - `useSponsorDashboard.js`: Provides state (`eventModalVisible`, `eventData`).
    - `handlers.js`: Provides `handleEventAdd`.
  - **Dependents:**
    - `Dashboard.jsx`: Renders as a modal.
  - **Future Enhancements:**
    - Integrate AI to suggest optimal event dates.

- **SponsorModal.jsx**
  - **Purpose:** Modal for adding/editing sponsors, with fields for name, tier, cost, etc.
  - **Dependencies:**
    - Ant Design: `Modal`, `Form`, `Input`, `Select` for UI.
    - `useSponsorDashboard.js`: Provides state (`addModalVisible`, `editModalVisible`, `sponsorData`).
    - `handlers.js`: Provides `handleAddSponsor`, `handleEditSponsor`.
  - **Dependents:**
    - `Dashboard.jsx`: Renders as a modal.
  - **Future Enhancements:**
    - Add validation for sponsor data.

### Utilities
- **debug.js**
  - **Purpose:** Provides `getDashboardLayoutStyles` to debug DOM structure and styles.
  - **Dependencies:**
    - Browser environment (`window.getComputedStyle`, `document.querySelector`).
  - **Dependents:**
    - `Dashboard.jsx`: Runs on mount for debugging.
    - `DEBUG_LOG.md`: Logs DOM tree output for reference.
  - **Future Enhancements:**
    - Add a UI debug panel.
    - Export DOM tree to a file.

- **request.js**
  - **Purpose:** Sets up Axios instance for API requests, including interceptors for auth tokens and error handling.
  - **Dependencies:**
    - Axios: For making HTTP requests.
    - LocalStorage: For retrieving auth token.
  - **Dependents:**
    - `redux/sponsors/actions.js`: Uses `fetchSponsors` to load sponsor data.
    - `useSponsorDashboard.js`: Indirectly via `loadSponsors`.
  - **Future Enhancements:**
    - Add retry logic for failed requests.
    - Implement request caching for frequently accessed data.

### Styles
- **global.css**
  - **Purpose:** Global styles for layout, Ant Design components, and FullCalendar.
  - **Dependencies:**
    - Ant Design: Targets classes like `.ant-layout`, `.ant-table`.
    - FullCalendar: Targets classes like `.fc-*`.
  - **Dependents:**
    - All components: Affects layout and rendering.
  - **Future Enhancements:**
    - Add dark mode support.
    - Optimize for 4K displays.

### Logs
- **CHANGELOG.md**
  - **Purpose:** Tracks all modifications, including dates, descriptions, reasons, impacts, and next steps.
  - **Dependencies:**
    - None.
  - **Dependents:**
    - Development process: Used to reference past changes and avoid repeating mistakes.
  - **Future Enhancements:**
    - Add versioning (e.g., semantic versioning for releases).

- **CONNECTIVITY_LOG.md**
  - **Purpose:** Documents the system’s structure, dependencies, purposes, and future enhancements.
  - **Dependencies:**
    - None.
  - **Dependents:**
    - Development process: Used to understand component relationships and dependencies.
  - **Future Enhancements:**
    - Add diagrams (e.g., component dependency graph).

- **ERROR_LOG.md**
  - **Purpose:** Tracks all errors encountered, including timestamps, descriptions, causes, resolutions, and impacts.
  - **Dependencies:**
    - None.
  - **Dependents:**
    - Development process: Used to avoid repeating errors and improve debugging.
  - **Future Enhancements:**
    - Categorize errors by type (e.g., runtime, build, logic).

- **DEBUG_LOG.md**
  - **Purpose:** Logs debugging sessions, including console outputs, DOM trees, and findings.
  - **Dependencies:**
    - `debug.js`: Provides DOM tree output (e.g., from `getDashboardLayoutStyles`).
  - **Dependents:**
    - Development process: Used to reference debug data for troubleshooting.
  - **Future Enhancements:**
    - Add timestamps for each debug entry.
    - Include screenshots of DOM states.

- **FEATURE_LOG.md**
  - **Purpose:** Documents planned features, their status, dependencies, and blockers.
  - **Dependencies:**
    - None.
  - **Dependents:**
    - Development process: Used to prioritize and track feature development.
  - **Future Enhancements:**
    - Add priority levels for features.
    - Link to related issues in `ERROR_LOG.md`.

- **TEST_LOG.md**
  - **Purpose:** Tracks testing results, including test cases, outcomes, and issues found.
  - **Dependencies:**
    - None.
  - **Dependents:**
    - Development process: Used to ensure thorough testing and track issues.
  - **Future Enhancements:**
    - Add automated test integration (e.g., Jest results).
    - Include performance metrics (e.g., load times).

## Future Enhancements (System-Wide)
- **ALLU Crypto Integration:** Add wallet displays and payment buttons across components.
- **AI Enhancements:** Integrate AI for email drafting, scheduling, and sponsor fit prediction.
- **SPHERE Branding:** Add animations and social media sharing features.
- **Frugal Goals:** Optimize API calls and add cost tracking.
- **Funny Lists:** Add morale-boosting widgets (e.g., "Funny Sponsor Names").
# System Structure
Backend: 
  - Port: 8888 (server.js)
  - Connects To: MongoDB (idurar_db), xAI API, routes (authRoutes, coreApiRoutes, sponsorRoutes)
  - Dependencies: mongoose, express, axios, multer, ws, .env
Frontend: 
  - Port: 3000 (main.jsx)
  - Connects To: Backend API (8888)
  - Dependencies: react, antd, redux, crudContext
Tests: 
  - Playwright (grok.test.js)
  - Connects To: Frontend (3000), Backend (8888)
  - Dependencies: @playwright/test, playwright.config.js
Tools: 
  - review-changes.js
  - Connects To: Any modified file (e.g., grok.test.js, SponsorHub.jsx)
  - Dependencies: readline, fs.promises
  # System Structure (Updated)
**Backend**:  
- Port: 8888 (`server.js`)  
- Connects To: MongoDB (`idurar_db`), XAI API, routes (`authRoutes`, `coreApiRoutes`, `sponsorRoutes`)  
- Dependencies: `mongoose`, `express`, `multer`, `ws`, `.env`  
**Frontend**:  
- Port: 3000 (`main.jsx`)  
- Connects To: Backend API (8888)  
- Dependencies: `react`, `antd`, `redux`, `crudContext`  
- Note: Display issue tied to `ErpLayout/index.jsx`, `global.css`, `Dashboard.jsx`.  
**Tests**:  
- Playwright (`grok.test.js`)  
- Connects To: Frontend (3000), Backend (8888)  
**Tools**:  
- `review-changes.js`: Connects to modified files (e.g., `grok.test.js`, `SponsorHub.jsx`).  
# System Structure
**Frontend**: `ErpLayout` → `Dashboard` → `SponsorHub` → `DataTable`, `SponsorModal`.  
**Backend**: `server.js` → MongoDB, xAI API.  
**Tests**: `grok.test.js` → Frontend/Backend.  
// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\CONNECTIVITY_LOG.md
// Historical Note: Maps system structure.
// Updated: 04/07/2025 - Updated with latest connections.

# System Structure
- *Backend:* 8888 (server.js) → MongoDB (idurar_db), xAI API; endpoints: /api/grok/edit, /approve, /reject, /playwright, /tasks.
- *Frontend:* 3000 → Backend API; GrokUI.jsx (ws://localhost:8888), SponsorHub.jsx stabilized.
- *Tests:* Playwright (grok.test.js) → Frontend, Backend.
/*
 * Detailed Notes for Future Chats:
 * - Path: For accuracy.
 * - Updates:* Reflects 04/23 server.js and 04/06 frontend fixes.
 * - Today:* Will finalize connections with Grok UI enhancements.
 */