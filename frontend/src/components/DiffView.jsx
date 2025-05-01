/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\components\DiffView.jsx
 * Purpose: Displays a diff view of original vs. modified content for Grok tasks.
 * Dependencies: react
 * Notes:
 *   - Used by GrokUI.jsx to show task changes.
 *   - Simple pre-formatted text display for now.
 * Change Log:
 *   - 04/07/2025: Created by user (assumed).
 *   - 04/07/2025: Fixed export to default for GrokUI.jsx compatibility.
 *     - Why: GrokUI.jsx expects default export, errored without it.
 *     - How: Changed to `export default DiffView`.
 *     - Impact: Resolves SyntaxError in frontend.
 *     - Test: Run `npm run dev`, load http://localhost:3000/grok, verify diff view loads.
 * Future Enhancements:
 *   - Add syntax highlighting or a proper diff library (e.g., react-diff-viewer).
 * Project Structure Reference:
 *   - Lives in src/components/, imported as @/components/DiffView per vite.config.js.
 */
/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\components\DiffView.jsx
 * Purpose: Displays diff of original vs. modified content for Grok tasks.
 * Dependencies: react
 * Notes:
 *   - Used by GrokUI.jsx to show task changes.
 * Change Log:
 *   - 04/07/2025: Created by user.
 *   - 04/07/2025: Fixed export to default.
 * Future Enhancements:
 *   - Add react-diff-viewer for proper diff rendering.
 */

import React from 'react';

const DiffView = ({ original, modified }) => (
  <div>
    <h3>Original:</h3>
    <pre>{original || 'No original content'}</pre>
    <h3>Modified:</h3>
    <pre>{modified || 'No modified content'}</pre>
  </div>
);

export default DiffView;
