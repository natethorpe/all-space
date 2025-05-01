/*
 * File Path: backend/src/utils/fileGeneratorV18.js
 * Purpose: Generates and persists staged files for tasks in Allur Space Console, supporting dynamic file creation.
 * How It Works:
 *   - Generates staged files based on parsedPrompt from promptParser.js, using a mock Grok API.
 *   - Persists files to MongoDB Task model with retries for reliability.
 *   - Optionally writes files to a temporary directory for Playwright tests.
 *   - Uses taskDedupeUtils.js to prevent redundant file generation.
 * Mechanics:
 *   - `generateFiles`: Generates files for a target, deduplicates using taskDedupeUtils, and saves to Task.stagedFiles.
 *   - `persistFilesToDisk`: Writes staged files to a temporary directory for testing.
 *   - `mockGrokAPI`: Simulates Grok API, generating rich UI components with Tailwind CSS and test instructions.
 * Dependencies:
 *   - mongoose@8.7.0: Task model for MongoDB persistence.
 *   - taskDedupeUtils.js: Deduplication logic.
 *   - logUtils.js: MongoDB logging.
 *   - fileUtils.js: File operations and error logging.
 *   - db.js: Provides getModel for MongoDB models.
 *   - fs.promises, path: File system operations.
 * Dependents:
 *   - taskManager.js: Calls generateFiles during task processing.
 *   - taskRoutes.js: Indirectly uses via taskManager.js for /api/grok/edit.
 * Why It’s Here:
 *   - Supports dynamic file generation for Sprint 2, addressing repeated generateFiles calls (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized file generation with mock Grok API (Nate).
 *   - 04/23/2025: Added deduplication with taskDedupeUtils.js (Nate).
 *   - 04/29/2025: Fixed stagedFiles persistence and empty features handling (Nate).
 *   - 04/30/2025: Added persistFilesToDisk, enhanced logging, added cleanup (Grok).
 *   - 05/02/2025: Enhanced mockGrokAPI for rich UI, added test instructions (Grok).
 *   - 05/07/2025: Fixed ReferenceError: record is not defined in Inventory.jsx (Grok).
 *     - Why: Persistent error at line 343 despite prior fix (User, 05/01/2025).
 *     - How: Reapplied record to item replacement, added input validation, enhanced logging.
 *     - Test: Submit "Create an inventory system", verify no ReferenceError, Inventory.jsx in stagedFiles.
 * Test Instructions:
 *   - Run `npm start`, POST /api/grok/edit with "Create an impressive inventory keeping system with AI features".
 *   - Verify idurar_db.tasks contains stagedFiles (e.g., Inventory.jsx, aiFeatures.js) and testInstructions.
 *   - POST /api/grok/test with { taskId, manual: true }, verify headed browser, intuitive UI.
 *   - Check grok.log for generation logs, no ReferenceError.
 * Future Enhancements:
 *   - Replace mockGrokAPI with real Grok API (Sprint 3).
 *   - Support file versioning with diffs (Sprint 5).
 */

const mongoose = require('mongoose');
const { hasGeneratedFile, recordGeneratedFile, clearGeneratedFile } = require('./taskDedupeUtils');
const { logInfo, logError, logDebug, logWarn } = require('./logUtils');
const { appendLog, errorLogPath } = require('./fileUtils');
const { getModel } = require('../db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Simulates Grok API to generate rich, intuitive UI components with test instructions.
 * @param {Object} parsedPrompt - Parsed prompt with features and target.
 * @returns {Promise<Array>} Array of generated files with path, content, and testInstructions.
 */
async function mockGrokAPI(parsedPrompt) {
  const { features, target } = parsedPrompt;
  const files = [];

  // Validate inputs
  if (!target || typeof target !== 'string' || !Array.isArray(features) || features.length === 0) {
    await logError('Invalid parsedPrompt: missing or invalid target/features', 'fileGeneratorV18', {
      parsedPrompt,
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid parsedPrompt: missing or invalid target/features');
  }

  // Normalize target
  const normalizedTarget = target.toLowerCase().includes('inventory') ? 'inventory' : 
                         target.toLowerCase().includes('crm') ? 'crm' : 
                         target.toLowerCase().includes('employee') ? 'employee' : 'system';

  for (const feature of features) {
    if (typeof feature !== 'string') {
      await logWarn(`Skipping invalid feature: ${feature}`, 'fileGeneratorV18', {
        target: normalizedTarget,
        feature,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    let file = null;
    if (feature.toLowerCase() === 'login') {
      file = {
        path: 'frontend/src/pages/Login.jsx',
        content: `
          import React, { useState } from 'react';
          import { Button, Input, Form } from 'antd';
          import 'tailwindcss/tailwind.css';

          const Login = () => {
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');

            return (
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                  <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
                  <Form>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mb-4 p-2 border rounded"
                      data-testid="email-input"
                    />
                    <Input.Password
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mb-4 p-2 border rounded"
                      data-testid="password-input"
                    />
                    <Button type="primary" htmlType="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="submit-button">
                      Login
                    </Button>
                  </Form>
                </div>
              </div>
            );
          };
          export default Login;
        `,
        testInstructions: `
          Test Instructions for Login.jsx:
          - Navigate to http://localhost:3000/login
          - Verify the login form renders with email and password inputs
          - Enter "admin@idurarapp.com" in the email input (data-testid="email-input")
          - Enter "admin123" in the password input (data-testid="password-input")
          - Click the submit button (data-testid="submit-button")
          - Confirm navigation to the dashboard
        `,
      };
    } else if (feature.toLowerCase() === 'dashboard') {
      file = {
        path: 'frontend/src/pages/Dashboard.jsx',
        content: `
          import React from 'react';
          import { Card, Statistic } from 'antd';
          import 'tailwindcss/tailwind.css';

          const Dashboard = () => (
            <div className="p-6 bg-gray-100 min-h-screen">
              <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <Statistic title="Active Users" value={1128} className="text-center" />
                </Card>
                <Card>
                  <Statistic title="Revenue" value={9320} prefix="$" className="text-center" />
                </Card>
                <Card>
                  <Statistic title="Orders" value={456} className="text-center" />
                </Card>
              </div>
            </div>
          );
          export default Dashboard;
        `,
        testInstructions: `
          Test Instructions for Dashboard.jsx:
          - Navigate to http://localhost:3000/dashboard
          - Verify the dashboard renders with three statistic cards
          - Confirm "Active Users" shows 1128
          - Confirm "Revenue" shows $9320
          - Confirm "Orders" shows 456
        `,
      };
    } else if (feature.toLowerCase() === 'employee') {
      file = {
        path: 'frontend/src/pages/EmployeeLog.jsx',
        content: `
          import React, { useState } from 'react';
          import { Table, Button } from 'antd';
          import 'tailwindcss/tailwind.css';

          const EmployeeLog = () => {
            const [employees, setEmployees] = useState([
              { id: 1, name: 'John Doe', status: 'In', time: '09:00 AM' },
              { id: 2, name: 'Jane Smith', status: 'Out', time: '05:00 PM' },
            ]);

            const columns = [
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Status', dataIndex: 'status', key: 'status' },
              { title: 'Time', dataIndex: 'time', key: 'time' },
              {
                title: 'Action',
                key: 'action',
                render: (_, item) => (
                  <Button
                    onClick={() => setEmployees(employees.map(e => e.id === item.id ? { ...e, status: e.status === 'In' ? 'Out' : 'In' } : e))}
                    className="bg-blue-600 text-white"
                    data-testid="toggle-status-\${item.id}"
                  >
                    Toggle Status
                  </Button>
                ),
              },
            ];

            return (
              <div className="p-6 bg-gray-100 min-h-screen">
                <h1 className="text-3xl font-bold mb-6">Employee Log</h1>
                <Table
                  columns={columns}
                  dataSource={employees}
                  rowKey="id"
                  className="shadow-md"
                  data-testid="employee-table"
                />
              </div>
            );
          };
          export default EmployeeLog;
        `,
        testInstructions: `
          Test Instructions for EmployeeLog.jsx:
          - Navigate to http://localhost:3000/employee-log
          - Verify the table renders with columns: Name, Status, Time, Action
          - Confirm two employees are listed (John Doe, Jane Smith)
          - Click the "Toggle Status" button for John Doe (data-testid="toggle-status-1")
          - Verify John's status changes to "Out"
        `,
      };
    } else if (feature.toLowerCase() === 'payroll') {
      file = {
        path: 'backend/src/routes/payroll.js',
        content: `
          const express = require('express');
          const router = express.Router();
          
          router.get('/payroll', (req, res) => {
            res.json({ employees: [{ id: 1, name: 'John Doe', salary: 5000 }, { id: 2, name: 'Jane Smith', salary: 6000 }] });
          });
          
          module.exports = router;
        `,
        testInstructions: `
          Test Instructions for payroll.js:
          - Send GET request to http://localhost:8888/api/payroll
          - Verify response contains employees array with salaries
          - Confirm status code is 200
        `,
      };
    } else if (feature.toLowerCase() === 'accounting') {
      file = {
        path: 'backend/src/routes/accounting.js',
        content: `
          const express = require('express');
          const router = express.Router();
          
          router.get('/accounting', (req, res) => {
            res.json({ transactions: [{ id: 1, amount: 1000, type: 'credit' }, { id: 2, amount: 500, type: 'debit' }] });
          });
          
          module.exports = router;
        `,
        testInstructions: `
          Test Instructions for accounting.js:
          - Send GET request to http://localhost:8888/api/accounting
          - Verify response contains transactions array with credit/debit
          - Confirm status code is 200
        `,
      };
    } else if (feature.toLowerCase() === 'ai') {
      file = {
        path: 'backend/src/utils/aiFeatures.js',
        content: `
          exports.predictInventoryNeeds = (data) => {
            // Mock AI prediction for inventory
            return { item: data.item, predictedQuantity: Math.floor(Math.random() * 100) };
          };
        `,
        testInstructions: `
          Test Instructions for aiFeatures.js:
          - Call predictInventoryNeeds({ item: 'Tickets' }) in a test script
          - Verify response includes item and predictedQuantity
        `,
      };
    } else if (feature.toLowerCase() === 'mfa') {
      file = {
        path: 'backend/src/routes/auth.js',
        content: `
          const express = require('express');
          const router = express.Router();
          
          router.post('/mfa', (req, res) => {
            res.json({ status: 'MFA verified', code: req.body.code });
          });
          
          module.exports = router;
        `,
        testInstructions: `
          Test Instructions for auth.js:
          - Send POST request to http://localhost:8888/api/mfa with { code: '123456' }
          - Verify response includes "MFA verified" and the code
          - Confirm status code is 200
        `,
      };
    } else if (normalizedTarget === 'inventory') {
      file = {
        path: 'frontend/src/pages/Inventory.jsx',
        content: `
          import React, { useState, useEffect } from 'react';
          import { Table, Button, Input, notification } from 'antd';
          import 'tailwindcss/tailwind.css';
          import axios from 'axios';

          const Inventory = () => {
            const [items, setItems] = useState([
              { id: 1, name: 'Festival Tickets', quantity: 100, category: 'Event' },
              { id: 2, name: 'Popcorn', quantity: 50, category: 'Food' },
            ]);
            const [search, setSearch] = useState('');

            useEffect(() => {
              // Mock AI prediction
              axios.post('/api/ai/predict', { item: 'Tickets' })
                .then(res => {
                  notification.success({
                    message: 'AI Prediction',
                    description: \`Predicted need: \${res.data.predictedQuantity} tickets\`,
                  });
                });
            }, []);

            const columns = [
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
              { title: 'Category', dataIndex: 'category', key: 'category' },
              {
                title: 'Action',
                key: 'action',
                render: (_, item) => (
                  <Button
                    onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 10 } : i))}
                    className="bg-green-600 text-white"
                    data-testid="restock-button-\${item.id}"
                  >
                    Restock
                  </Button>
                ),
              },
            ];

            const filteredItems = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

            return (
              <div className="p-6 bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen">
                <h1 className="text-3xl font-bold mb-6 text-center">Festival & Drive-In Inventory</h1>
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-4 p-2 border rounded w-full max-w-md mx-auto"
                  data-testid="search-input"
                />
                <Table
                  columns={columns}
                  dataSource={filteredItems}
                  rowKey="id"
                  className="shadow-xl rounded-lg"
                  data-testid="inventory-table"
                />
              </div>
            );
          };
          export default Inventory;
        `,
        testInstructions: `
          Test Instructions for Inventory.jsx:
          - Navigate to http://localhost:3000/inventory
          - Verify the table renders with columns: Name, Quantity, Category, Action
          - Confirm two items listed (Festival Tickets, Popcorn)
          - Enter "Tickets" in the search input (data-testid="search-input")
          - Verify only Festival Tickets are shown
          - Click "Restock" for Festival Tickets (data-testid="restock-button-1")
          - Confirm quantity increases to 110
          - Verify AI prediction notification appears with predicted ticket quantity
        `,
      };
    }

    if (file) {
      files.push(file);
      await logDebug('Generated file', 'fileGeneratorV18', {
        feature,
        path: file.path,
        contentLength: file.content.length,
        testInstructions: file.testInstructions,
        timestamp: new Date().toISOString(),
      });
    } else {
      await logWarn(`No file generated for feature: ${feature}`, 'fileGeneratorV18', {
        target: normalizedTarget,
        feature,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Fallback for generic or missing features
  if (files.length === 0) {
    const defaultFile = {
      path: 'frontend/src/pages/DefaultSystem.jsx',
      content: `
        import React from 'react';
        import 'tailwindcss/tailwind.css';

        const DefaultSystem = () => (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <h1 className="text-4xl font-bold text-blue-600">Default System Page</h1>
          </div>
        );
        export default DefaultSystem;
      `,
      testInstructions: `
        Test Instructions for DefaultSystem.jsx:
        - Navigate to http://localhost:3000/system
        - Verify the page renders with "Default System Page" title
      `,
    };
    files.push(defaultFile);
    await logDebug('Generated default system file', 'fileGeneratorV18', {
      path: defaultFile.path,
      contentLength: defaultFile.content.length,
      testInstructions: defaultFile.testInstructions,
      timestamp: new Date().toISOString(),
    });
  }

  await logInfo('Completed file generation', 'fileGeneratorV18', {
    target: normalizedTarget,
    generatedFiles: files.map(f => ({ path: f.path, contentLength: f.content.length, testInstructions: f.testInstructions })),
    timestamp: new Date().toISOString(),
  });
  return files;
}

/**
 * Writes staged files to a temporary directory for Playwright tests.
 * @param {string} taskId - The task ID.
 * @param {Array} stagedFiles - Array of staged files with path and content.
 * @returns {Promise<string>} Path to the temporary directory.
 */
async function persistFilesToDisk(taskId, stagedFiles) {
  if (!isValidTaskId(taskId) || !stagedFiles || !Array.isArray(stagedFiles) || stagedFiles.length === 0) {
    await logError('Invalid inputs for persistFilesToDisk', 'fileGeneratorV18', {
      taskId,
      stagedFiles,
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid taskId or stagedFiles');
  }

  const tempDir = path.join(__dirname, '../../../tmp/tests', taskId);
  try {
    await fs.mkdir(tempDir, { recursive: true });
    for (const file of stagedFiles) {
      if (!file.path || !file.content || typeof file.path !== 'string' || typeof file.content !== 'string') {
        await logWarn('Skipping invalid staged file', 'fileGeneratorV18', {
          taskId,
          file,
          timestamp: new Date().toISOString(),
        });
        continue;
      }
      const tempPath = path.join(tempDir, path.basename(file.path));
      await fs.writeFile(tempPath, file.content, 'utf8');
      await logDebug(`Persisted temporary file: ${tempPath}`, 'fileGeneratorV18', {
        taskId,
        contentLength: file.content.length,
        timestamp: new Date().toISOString(),
      });
    }
    await logInfo('Persisted staged files to disk', 'fileGeneratorV18', {
      taskId,
      tempDir,
      fileCount: stagedFiles.length,
      timestamp: new Date().toISOString(),
    });
    return tempDir;
  } catch (err) {
    await logError(`Failed to persist files to disk: ${err.message}`, 'fileGeneratorV18', {
      taskId,
      tempDir,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

/**
 * Generates and persists staged files for a task.
 * @param {string} taskId - The task ID.
 * @param {Object} parsedPrompt - Parsed prompt with action, target, and features.
 * @returns {Promise<Array>} Array of staged files.
 */
async function generateFiles(taskId, parsedPrompt) {
  console.log('fileGeneratorV18: generateFiles called with taskId:', taskId, 'parsedPrompt:', parsedPrompt);
  const target = parsedPrompt.target || 'crm'; // Fallback to 'crm' if target is missing
  const dedupeKey = `${taskId}_${target}`;

  if (!taskId || !isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'fileGeneratorV18', {
      taskId: taskId || 'missing',
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid taskId');
  }
  if (!parsedPrompt || typeof parsedPrompt !== 'object') {
    await logError('Invalid parsedPrompt', 'fileGeneratorV18', {
      taskId,
      parsedPrompt,
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid parsedPrompt');
  }

  await logDebug('Processing parsedPrompt', 'fileGeneratorV18', {
    taskId,
    target,
    features: parsedPrompt.features,
    timestamp: new Date().toISOString(),
  });

  if (await hasGeneratedFile(dedupeKey)) {
    await logInfo('Skipped redundant file generation', 'fileGeneratorV18', {
      dedupeKey,
      taskId,
      target,
      timestamp: new Date().toISOString(),
    });
    return [];
  }

  try {
    const stagedFiles = await mockGrokAPI({ ...parsedPrompt, target });
    if (!stagedFiles || stagedFiles.length === 0) {
      await logError('No stagedFiles generated', 'fileGeneratorV18', {
        taskId,
        target,
        parsedPrompt,
        timestamp: new Date().toISOString(),
      });
      throw new Error('No stagedFiles generated');
    }

    const Task = await getModel('Task');
    let attempt = 0;
    const maxAttempts = 10;
    while (attempt < maxAttempts) {
      try {
        const task = await Task.findOneAndUpdate(
          { taskId },
          {
            $set: {
              stagedFiles,
              files: stagedFiles.map(file => file.path),
              testInstructions: stagedFiles.map(file => file.testInstructions).join('\n\n'),
            },
          },
          { new: true }
        );
        if (!task) {
          throw new Error('Task not found');
        }
        if (!task.stagedFiles || task.stagedFiles.length === 0) {
          throw new Error('Failed to save stagedFiles');
        }
        await logInfo('Staged files saved successfully', 'fileGeneratorV18', {
          taskId,
          target,
          stagedFilesCount: stagedFiles.length,
          files: stagedFiles.map(f => ({ path: f.path, contentLength: f.content.length })),
          testInstructions: task.testInstructions,
          attempt: attempt + 1,
          timestamp: new Date().toISOString(),
        });
        await appendLog(errorLogPath, `# Staged Files Generated\nTask ID: ${taskId}\nTarget: ${target}\nFiles: ${stagedFiles.map(f => f.path).join(', ')}\nTest Instructions: ${task.testInstructions}`);
        await recordGeneratedFile(dedupeKey);
        return stagedFiles;
      } catch (err) {
        attempt++;
        await logError(`Staged files save attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'fileGeneratorV18', {
          taskId,
          target,
          stack: err.stack || 'No stack trace',
          attempt,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          throw new Error(`Failed to save stagedFiles after ${maxAttempts} attempts: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  } catch (err) {
    await logError(`File generation failed: ${err.message}`, 'fileGeneratorV18', {
      taskId,
      target,
      stack: err.stack || 'No stack trace',
      timestamp: new Date().toISOString(),
    });
    await appendLog(errorLogPath, `# File Generation Error\nTask ID: ${taskId}\nTarget: ${target}\nDescription: ${err.message}\nStack: ${err.stack || 'No stack trace'}`);
    throw err;
  } finally {
    await clearGeneratedFile(dedupeKey);
  }
}

/**
 * Validates taskId format (UUID v4).
 * @param {string} taskId - The task ID to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidTaskId(taskId) {
  const isValid =
    typeof taskId === 'string' &&
    taskId.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  return isValid;
}

module.exports = { generateFiles, persistFilesToDisk };
