/*
 * File Path: backend/src/utils/taskManager.js
 * Purpose: Orchestrates task processing, file generation, and proposal creation in Allur Space Console.
 * How It Works:
 *   - Manages task lifecycle: validation, prompt parsing, file generation, testing, proposal creation, and status updates.
 *   - Processes tasks via processTask, generating stagedFiles using fileGeneratorV18.js.
 *   - Runs automated headless Playwright tests via testGenerator.js before pending_approval.
 *   - Creates BackendProposal entries for backend changes via proposalUtils.js.
 *   - Applies approved changes (applyApprovedChanges) or rolls back (rollbackChanges) using fileUtils.js.
 *   - Deletes tasks and associated data (deleteTask) with cleanup.
 *   - Emits Socket.IO events (taskUpdate, backendProposal) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs operations to MongoDB Log model.
 * Dependencies:
 *   - mongoose: Task, BackendProposal, Memory, Log models (version 8.13.2).
 *   - socket.js: getIO for Socket.IO (version 4.8.1).
 *   - path, fs.promises: File operations.
 *   - fileGeneratorV18.js, fileUtils.js, promptParser.js: Task utilities.
 *   - testGenerator.js: Automated testing.
 *   - proposalUtils.js: createProposals for proposal creation.
 * Dependents:
 *   - taskRoutes.js, proposalRoutes.js, taskProcessorV18.js, GrokUI.jsx.
 * Why It’s Here:
 *   - Replaces core taskProcessorV18.js functionality for Sprint 2 modularity (04/23/2025).
 * Change Log:
 *   - 04/21/2025: Created to modularize taskProcessorV18.js.
 *   - 04/23/2025: Enhanced BackendProposal creation.
 *   - 04/23/2025: Fixed socket.js import path.
 *   - 04/25/2025: Strengthened stagedFiles initialization with $set.
 *   - 04/25/2025: Increased retry attempts to 7 for stagedFiles persistence.
 *   - 04/25/2025: Added mock Allur Crypto API proposal logic.
 *   - 04/26/2025: Standardized retries to 7, added pre-save validation.
 *   - 04/27/2025: Fixed MissingSchemaError for Task model.
 *   - 04/28/2025: Removed MongoDB transactions for non-replica set environments.
 *   - 04/30/2025: Transitioned logging to MongoDB Log model.
 *   - 04/30/2025: Ensured compatibility with updated Memory schema.
 *   - 05/01/2025: Enhanced deleteTask with atomic operations and 10 retries.
 *   - 05/01/2025: Added newContent null check for TypeError prevention.
 *   - 05/03/2025: Fixed task deletion failure, empty stagedFiles, and getIO error.
 *   - 05/XX/2025: Added automated Playwright testing before pending_approval for Sprint 2.
 *   - 05/XX/2025: Fixed stagedFiles generation and duplicate deletion events.
 *     - Why: Address empty stagedFiles and duplicate taskUpdate events (User, 05/XX/2025).
 *     - How: Optimized multi-file loop, increased retries to 10, ensured unique eventId.
 *   - 05/XX/2025: Fixed repeated generateFiles calls and HTTP 500 errors.
 *     - Why: Prevent redundant generateFiles calls and server errors on /grok/edit (User, 05/XX/2025).
 *     - How: Fixed multi-file loop to use unique components once, added validation for stagedFiles, enhanced error handling for HTTP 500.
 *   - 05/XX/2025: Enhanced debugging for HTTP 500 errors.
 *     - Why: Persistent HTTP 500 errors and repeated generateFiles calls despite fixes (User, 05/XX/2025).
 *     - How: Added detailed logging for file generation, database operations, and error handling to trace HTTP 500 cause, ensured deduplication is enforced, added component deduplication check.
 *     - Test: Submit "Build CRM system", verify single generateFiles call per component, non-empty stagedFiles, detailed error logs for HTTP 500.
 * Test Instructions:
 *   - Run `npm start`: Verify idurar_db.logs logs operations, no grok.log writes.
 *   - POST /grok/edit with "Build CRM system" (5 times): Confirm stagedFiles persist, testResults stored, no validation errors, single generateFiles call per component, detailed HTTP 500 error logs if any.
 *   - POST /grok/edit with "Add crypto wallet": Verify BackendProposal with /wallet/balance endpoint, yellow log in LiveFeed.jsx.
 *   - DELETE /grok/tasks/:taskId: Confirm task deleted, idurar_db.logs shows deletion, LiveFeed.jsx shows single green log.
 *   - Check idurar_db.tasks: Verify stagedFiles, testResults fields non-empty.
 *   - Check idurar_db.logs: Confirm task processing, testing, and deletion logs with taskId, no duplicate events, detailed HTTP 500 error logs if any.
 * Future Enhancements:
 *   - Add task dependency handling (Sprint 6).
 *   - Support proposal versioning (Sprint 5).
 *   - Extract retry logic to retryUtils.js (Sprint 4).
 * Self-Notes:
 *   - Nate: Added atomic stagedFiles handling and crypto proposal (04/23/2025–04/25/2025).
 *   - Nate: Enhanced deleteTask and processTask for Playwright and TypeError fixes (05/01/2025).
 *   - Nate: Fixed deletion, stagedFiles, and getIO issues with retries and validation (05/03/2025).
 *   - Nate: Fixed stagedFiles and duplicate events (05/XX/2025).
 *   - Nate: Fixed repeated generateFiles calls and HTTP 500 errors, added debug logging (05/XX/2025).
 * Rollback Instructions:
 *   - If processing fails: Copy taskManager.js.bak to taskManager.js (`mv backend/src/utils/taskManager.js.bak backend/src/utils/taskManager.js`).
 *   - Verify /grok/edit works after rollback.
 */
const mongoose = require('mongoose');
const { getIO } = require('../socket');
const path = require('path');
const fs = require('fs').promises;
const { generateFiles } = require('./fileGeneratorV18');
const { runTests, generatePlaywrightTest } = require('./testGenerator');
const { readSystemFiles } = require('./fileUtils');
const { parsePrompt } = require('./promptParser');
const { isValidTaskId } = require('./taskValidator');
const { createProposals } = require('./proposalUtils');
const { getModel } = require('../db');
const { logInfo, logDebug, logWarn, logError } = require('./logUtils');
const { v4: uuidv4 } = require('uuid');

console.log('taskManager: Module loaded');

async function processTask(taskId, prompt, action, target, features, isMultiFile = false, backendChanges = []) {
  console.log('taskManager: processTask called with taskId:', taskId, 'prompt:', prompt);
  await logDebug('Starting processTask', 'taskManager', {
    taskId,
    prompt,
    action,
    target,
    isMultiFile,
    backendChanges,
    timestamp: new Date().toISOString(),
  });

  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'failed',
        error: 'Invalid taskId',
        logColor: 'red',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskManager', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    throw new Error('Invalid taskId');
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    await logError('Invalid prompt', 'taskManager', { taskId, prompt, timestamp: new Date().toISOString() });
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'failed',
        error: 'Invalid prompt',
        logColor: 'red',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskManager', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    throw new Error('Invalid prompt');
  }

  let task;
  let attempt = 0;
  const maxAttempts = 3;

  try {
    const Task = await getModel('Task');
    const Memory = await getModel('Memory');
    const BackendProposal = await getModel('BackendProposal');

    while (attempt < maxAttempts) {
      try {
        await logDebug('Fetching or creating task', 'taskManager', { taskId, attempt: attempt + 1, timestamp: new Date().toISOString() });
        task = await Task.findOne({ taskId });
        if (!task) {
          task = await Task.findOneAndUpdate(
            { taskId },
            {
              $set: {
                taskId,
                prompt,
                status: 'pending',
                stagedFiles: [],
                generatedFiles: [],
                proposedChanges: [],
                originalContent: {},
                newContent: {},
                testResults: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { new: true, upsert: true }
          );
          await logDebug('Task created in idurar_db.tasks', 'taskManager', { taskId, status: task.status, timestamp: new Date().toISOString() });
        } else if (!Array.isArray(task.stagedFiles)) {
          await Task.findOneAndUpdate(
            { taskId },
            { $set: { stagedFiles: [] } },
            { new: true }
          );
          await logDebug('Initialized stagedFiles for existing task', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        }
        break;
      } catch (err) {
        attempt++;
        await logWarn(`Task creation attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
          taskId,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          try {
            getIO().emit('taskUpdate', {
              taskId,
              status: 'failed',
              error: `Failed to create task: ${err.message}`,
              logColor: 'red',
              timestamp: new Date().toISOString(),
              eventId: uuidv4(),
            });
          } catch (emitErr) {
            await logError('Failed to emit taskUpdate event', 'taskManager', {
              taskId,
              error: emitErr.message,
              stack: emitErr.stack,
              timestamp: new Date().toISOString(),
            });
          }
          throw new Error(`Failed to create task: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    task.status = 'processing';
    if (!Array.isArray(task.stagedFiles)) {
      task.stagedFiles = [];
      await logDebug('Pre-save validation: Initialized stagedFiles', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    }
    await task.save();
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'processing',
        message: `Processing task: ${prompt}`,
        logColor: 'blue',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskManager', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }

    await logDebug('Creating memory entry', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    const memory = new Memory({
      taskId,
      prompt,
      status: 'pending',
      stagedFiles: [],
      generatedFiles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await memory.save();
    await logDebug('Memory entry created', 'taskManager', { taskId, timestamp: new Date().toISOString() });

    await logDebug('Reading system files', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    const systemFiles = await readSystemFiles();
    const originalContent = {};
    for (const file of Object.keys(systemFiles)) {
      originalContent[file] = systemFiles[file];
    }

    const stagedFiles = [];
    const processedComponents = new Set(); // Track processed components to prevent duplicates
    const parsedData = backendChanges.length ? { action, target, features, isMultiFile, backendChanges } : parsePrompt(prompt, taskId);
    const { action: parsedAction, target: parsedTarget, features: parsedFeatures, isMultiFile: parsedIsMultiFile, backendChanges: parsedBackendChanges } = parsedData;

    let fileGenerationAttempts = 0;
    const maxFileGenerationAttempts = 3;
    while (fileGenerationAttempts < maxFileGenerationAttempts) {
      try {
        if (parsedIsMultiFile) {
          const components = parsedFeatures.includes('crm') ? ['Login', 'Dashboard', 'EmployeeLog', 'SponsorProfile'] : [...new Set(parsedFeatures)];
          await logDebug('Processing multi-file task with components:', 'taskManager', {
            taskId,
            components,
            timestamp: new Date().toISOString(),
          });
          for (const component of components) {
            if (processedComponents.has(component)) {
              await logWarn('Skipping duplicate component:', 'taskManager', {
                taskId,
                component,
                timestamp: new Date().toISOString(),
              });
              continue;
            }
            processedComponents.add(component);
            await logDebug('Attempting to generate file for component:', 'taskManager', {
              taskId,
              component,
              attempt: fileGenerationAttempts + 1,
              timestamp: new Date().toISOString(),
            });
            const file = await generateFiles(task, parsedAction, component, parsedFeatures);
            if (file) {
              let retries = 0;
              const maxRetries = 10;
              while (retries < maxRetries) {
                try {
                  await logDebug('Reading generated file content:', 'taskManager', {
                    taskId,
                    component,
                    file,
                    attempt: retries + 1,
                    timestamp: new Date().toISOString(),
                  });
                  const fileContent = await fs.readFile(file, 'utf8');
                  await logDebug('Updating task with stagedFiles:', 'taskManager', {
                    taskId,
                    component,
                    file,
                    attempt: retries + 1,
                    timestamp: new Date().toISOString(),
                  });
                  await Task.findOneAndUpdate(
                    { taskId },
                    { $push: { stagedFiles: { path: file, content: fileContent } } },
                    { new: true }
                  );
                  await logDebug(`Persisted stagedFiles: ${file}`, 'taskManager', {
                    taskId,
                    component,
                    attempt: retries + 1,
                    timestamp: new Date().toISOString(),
                  });
                  stagedFiles.push(file);
                  break;
                } catch (err) {
                  retries++;
                  await logWarn(`Staged files save attempt ${retries}/${maxRetries} failed: ${err.message}`, 'taskManager', {
                    taskId,
                    component,
                    stack: err.stack,
                    timestamp: new Date().toISOString(),
                  });
                  if (retries >= maxRetries) {
                    throw new Error(`Failed to persist stagedFiles after ${maxRetries} attempts: ${err.message}`);
                  }
                  await new Promise(resolve => setTimeout(resolve, 500 * retries));
                }
              }
            } else {
              await logWarn(`No file generated for component: ${component}`, 'taskManager', {
                taskId,
                component,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } else {
          await logDebug('Attempting to generate single file for target:', 'taskManager', {
            taskId,
            target: parsedTarget,
            attempt: fileGenerationAttempts + 1,
            timestamp: new Date().toISOString(),
          });
          const file = await generateFiles(task, parsedAction, parsedTarget, parsedFeatures);
          if (file) {
            let retries = 0;
            const maxRetries = 10;
            while (retries < maxRetries) {
              try {
                await logDebug('Reading generated file content:', 'taskManager', {
                  taskId,
                  target: parsedTarget,
                  file,
                  attempt: retries + 1,
                  timestamp: new Date().toISOString(),
                });
                const fileContent = await fs.readFile(file, 'utf8');
                await logDebug('Updating task with stagedFiles:', 'taskManager', {
                  taskId,
                  target: parsedTarget,
                  file,
                  attempt: retries + 1,
                  timestamp: new Date().toISOString(),
                });
                await Task.findOneAndUpdate(
                  { taskId },
                  { $push: { stagedFiles: { path: file, content: fileContent } } },
                  { new: true }
                );
                await logDebug(`Persisted stagedFiles: ${file}`, 'taskManager', {
                  taskId,
                  target: parsedTarget,
                  attempt: retries + 1,
                  timestamp: new Date().toISOString(),
                });
                stagedFiles.push(file);
                break;
              } catch (err) {
                retries++;
                await logWarn(`Staged files save attempt ${retries}/${maxRetries} failed: ${err.message}`, 'taskManager', {
                  taskId,
                  target: parsedTarget,
                  stack: err.stack,
                  timestamp: new Date().toISOString(),
                });
                if (retries >= maxRetries) {
                  throw new Error(`Failed to persist stagedFiles after ${maxRetries} attempts: ${err.message}`);
                }
                await new Promise(resolve => setTimeout(resolve, 500 * retries));
              }
            }
          } else {
            await logWarn(`No file generated for target: ${parsedTarget}`, 'taskManager', {
              taskId,
              target: parsedTarget,
              timestamp: new Date().toISOString(),
            });
          }
        }

        if (stagedFiles.length === 0) {
          await logError('No stagedFiles generated', 'taskManager', { taskId, timestamp: new Date().toISOString() });
          throw new Error('No stagedFiles generated');
        }
        break;
      } catch (err) {
        fileGenerationAttempts++;
        await logWarn(`File generation attempt ${fileGenerationAttempts}/${maxFileGenerationAttempts} failed: ${err.message}`, 'taskManager', {
          taskId,
          prompt,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        if (fileGenerationAttempts >= maxFileGenerationAttempts) {
          await logError('Failed to generate stagedFiles after max attempts', 'taskManager', {
            taskId,
            prompt,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          });
          try {
            getIO().emit('taskUpdate', {
              taskId,
              status: 'failed',
              error: `Failed to generate stagedFiles: ${err.message}`,
              logColor: 'red',
              timestamp: new Date().toISOString(),
              eventId: uuidv4(),
            });
          } catch (emitErr) {
            await logError('Failed to emit taskUpdate event', 'taskManager', {
              taskId,
              error: emitErr.message,
              stack: emitErr.stack,
              timestamp: new Date().toISOString(),
            });
          }
          throw new Error(`Failed to generate stagedFiles: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * fileGenerationAttempts));
      }
    }

    // Validate stagedFiles
    if (!Array.isArray(task.stagedFiles) || task.stagedFiles.length === 0 || !task.stagedFiles.every(f => f.path && f.content)) {
      await logError('Invalid stagedFiles after generation', 'taskManager', {
        taskId,
        stagedFiles: task.stagedFiles,
        timestamp: new Date().toISOString(),
      });
      try {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          error: 'Invalid stagedFiles generated',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      } catch (emitErr) {
        await logError('Failed to emit taskUpdate event', 'taskManager', {
          taskId,
          error: emitErr.message,
          stack: emitErr.stack,
          timestamp: new Date().toISOString(),
        });
      }
      throw new Error('Invalid stagedFiles generated');
    }

    task.originalContent = originalContent;
    task.newContent = task.newContent || {};
    for (const file of stagedFiles) {
      task.newContent[file] = systemFiles[file] || await fs.readFile(file, 'utf8');
    }

    // Run automated headless Playwright tests
    try {
      await logDebug('Generating Playwright test for task:', 'taskManager', { taskId, timestamp: new Date().toISOString() });
      const testFile = await generatePlaywrightTest(taskId, task.stagedFiles, prompt);
      await logDebug('Running Playwright tests for task:', 'taskManager', { taskId, testFile, timestamp: new Date().toISOString() });
      const testResult = await runTests(testFile, task.stagedFiles, taskId, false);
      task.testResults = {
        success: testResult.success,
        testedFiles: testResult.testedFiles,
        timestamp: new Date().toISOString(),
      };
      await task.save();
      await logInfo('Automated tests completed', 'taskManager', {
        taskId,
        testResult,
        timestamp: new Date().toISOString(),
      });
      try {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'tested',
          message: `Automated tests passed for ${testResult.testedFiles} files`,
          logColor: 'green',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      } catch (emitErr) {
        await logError('Failed to emit taskUpdate event', 'taskManager', {
          taskId,
          error: emitErr.message,
          stack: emitErr.stack,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (testErr) {
      await logError('Automated tests failed', 'taskManager', {
        taskId,
        error: testErr.message,
        stack: testErr.stack,
        timestamp: new Date().toISOString(),
      });
      task.testResults = {
        success: false,
        error: testErr.message,
        timestamp: new Date().toISOString(),
      };
      await task.save();
      try {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          error: `Automated tests failed: ${testErr.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      } catch (emitErr) {
        await logError('Failed to emit taskUpdate event', 'taskManager', {
          taskId,
          error: emitErr.message,
          stack: emitErr.stack,
          timestamp: new Date().toISOString(),
        });
      }
      throw new Error(`Automated tests failed: ${testErr.message}`);
    }

    await logDebug('Creating proposals for task:', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    const proposals = await createProposals(taskId, parsedBackendChanges);
    task.proposedChanges = proposals.map(p => p._id.toString());
    task.status = 'pending_approval';
    await task.save();

    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'pending_approval',
        stagedFiles: task.stagedFiles,
        proposedChanges: task.proposedChanges,
        testResults: task.testResults,
        logColor: parsedIsMultiFile ? 'yellow' : 'blue',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskManager', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }

    await logInfo('Task processed successfully', 'taskManager', {
      taskId,
      stagedFiles: stagedFiles.length,
      proposals: proposals.length,
      testResults: task.testResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await logError(`Task processing failed: ${err.message}`, 'taskManager', {
      taskId,
      prompt,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

async function applyApprovedChanges(taskId) {
  console.log('taskManager: applyApprovedChanges called with taskId:', taskId);
  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    throw new Error('Invalid taskId');
  }

  try {
    const Task = await getModel('Task');
    const BackendProposal = await getModel('BackendProposal');
    const task = await Task.findOne({ taskId });
    if (!task) {
      await logWarn('Task not found', 'taskManager', { taskId, timestamp: new Date().toISOString() });
      throw new Error('Task not found');
    }

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        await logDebug('Applying staged files for task:', 'taskManager', { taskId, stagedFiles: task.stagedFiles?.length || 0, timestamp: new Date().toISOString() });
        for (const fileObj of task.stagedFiles || []) {
          const targetPath = path.join(__dirname, '../../../', fileObj.path);
          await fs.writeFile(targetPath, fileObj.content, 'utf8');
          await logDebug('Applied staged file', 'taskManager', { taskId, file: fileObj.path, timestamp: new Date().toISOString() });
        }

        await logDebug('Fetching approved proposals for task:', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        const proposals = await BackendProposal.find({ taskId, status: 'approved' });
        for (const proposal of proposals) {
          const targetFile = path.join(__dirname, '../../../', proposal.file);
          await fs.appendFile(targetFile, `\n// BackendProposal ${proposal._id}: ${proposal.content}\n`, 'utf8');
          await logDebug('Applied BackendProposal change', 'taskManager', {
            taskId,
            proposalId: proposal._id,
            file: proposal.file,
            timestamp: new Date().toISOString(),
          });
        }

        task.status = 'applied';
        task.generatedFiles = task.stagedFiles.map(f => f.path);
        task.stagedFiles = [];
        task.updatedAt = new Date();
        await task.save();

        try {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'applied',
            message: 'Task approved and applied',
            logColor: 'green',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        } catch (emitErr) {
          await logError('Failed to emit taskUpdate event', 'taskManager', {
            taskId,
            error: emitErr.message,
            stack: emitErr.stack,
            timestamp: new Date().toISOString(),
          });
        }

        await logInfo('Applied approved changes', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        break;
      } catch (err) {
        attempt++;
        await logWarn(`Apply changes attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
          taskId,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          try {
            getIO().emit('taskUpdate', {
              taskId,
              status: 'failed',
              error: `Failed to apply changes: ${err.message}`,
              logColor: 'red',
              timestamp: new Date().toISOString(),
              eventId: uuidv4(),
            });
          } catch (emitErr) {
            await logError('Failed to emit taskUpdate event', 'taskManager', {
              taskId,
              error: emitErr.message,
              stack: emitErr.stack,
              timestamp: new Date().toISOString(),
            });
          }
          throw new Error(`Failed to apply changes: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  } catch (err) {
    await logError(`Apply approved changes failed: ${err.message}`, 'taskManager', { taskId, stack: err.stack, timestamp: new Date().toISOString() });
    throw err;
  }
}

async function rollbackChanges(taskId) {
  console.log('taskManager: rollbackChanges called with taskId:', taskId);
  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    throw new Error('Invalid taskId');
  }

  try {
    const Task = await getModel('Task');
    const BackendProposal = await getModel('BackendProposal');
    const task = await Task.findOne({ taskId });
    if (!task) {
      await logWarn('Task not found', 'taskManager', { taskId, timestamp: new Date().toISOString() });
      throw new Error('Task not found');
    }

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        await logDebug('Removing staged files for task:', 'taskManager', { taskId, stagedFiles: task.stagedFiles?.length || 0, timestamp: new Date().toISOString() });
        for (const fileObj of task.stagedFiles || []) {
          const stagedPath = path.join(__dirname, '../../../', fileObj.path);
          await fs.unlink(stagedPath).catch(() => {});
          await logDebug('Removed staged file', 'taskManager', { taskId, file: fileObj.path, timestamp: new Date().toISOString() });
        }

        task.status = 'denied';
        task.stagedFiles = [];
        task.proposedChanges = [];
        task.updatedAt = new Date();
        await task.save();

        await logDebug('Deleting backend proposals for task:', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        await BackendProposal.deleteMany({ taskId });

        try {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'denied',
            message: 'Task denied and changes rolled back',
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        } catch (emitErr) {
          await logError('Failed to emit taskUpdate event', 'taskManager', {
            taskId,
            error: emitErr.message,
            stack: emitErr.stack,
            timestamp: new Date().toISOString(),
          });
        }

        await logInfo('Rolled back changes', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        break;
      } catch (err) {
        attempt++;
        await logWarn(`Rollback attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
          taskId,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          try {
            getIO().emit('taskUpdate', {
              taskId,
              status: 'failed',
              error: `Failed to rollback changes: ${err.message}`,
              logColor: 'red',
              timestamp: new Date().toISOString(),
              eventId: uuidv4(),
            });
          } catch (emitErr) {
            await logError('Failed to emit taskUpdate event', 'taskManager', {
              taskId,
              error: emitErr.message,
              stack: emitErr.stack,
              timestamp: new Date().toISOString(),
            });
          }
          throw new Error(`Failed to rollback changes: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  } catch (err) {
    await logError(`Rollback changes failed: ${err.message}`, 'taskManager', { taskId, stack: err.stack, timestamp: new Date().toISOString() });
    throw err;
  }
}

async function deleteTask(taskId) {
  console.log('taskManager: deleteTask called with taskId:', taskId);
  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, timestamp: new Date().toISOString() });
    throw new Error('Invalid taskId');
  }

  let attempt = 0;
  const maxAttempts = 15;

  try {
    const Task = await getModel('Task');
    const Memory = await getModel('Memory');
    const BackendProposal = await getModel('BackendProposal');

    while (attempt < maxAttempts) {
      try {
        await logDebug('Fetching task for deletion:', 'taskManager', { taskId, attempt: attempt + 1, timestamp: new Date().toISOString() });
        const task = await Task.findOne({ taskId });
        if (!task) {
          await logWarn('Task not found', 'taskManager', { taskId, timestamp: new Date().toISOString() });
          throw new Error('Task not found');
        }

        await logDebug('Found task for deletion', 'taskManager', {
          taskId,
          stagedFiles: task.stagedFiles?.length || 0,
          timestamp: new Date().toISOString(),
        });

        for (const fileObj of task.stagedFiles || []) {
          try {
            const stagedPath = path.join(__dirname, '../../../', fileObj.path);
            await fs.unlink(stagedPath);
            await logDebug('Removed staged file', 'taskManager', { taskId, file: fileObj.path, timestamp: new Date().toISOString() });
          } catch (unlinkErr) {
            await logWarn(`Failed to remove staged file: ${unlinkErr.message}`, 'taskManager', {
              taskId,
              file: fileObj.path,
              stack: unlinkErr.stack,
              timestamp: new Date().toISOString(),
            });
          }
        }

        await logDebug('Deleting task from Task collection:', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        const deleteResult = await Task.findOneAndDelete({ taskId });
        await logDebug('Deleted task from Task collection', 'taskManager', {
          taskId,
          result: deleteResult ? 'success' : 'null',
          timestamp: new Date().toISOString(),
        });

        await logDebug('Deleting task memories:', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        const memoryResult = await Memory.deleteMany({ taskId });
        await logDebug('Deleted task memories', 'taskManager', {
          taskId,
          result: memoryResult.deletedCount,
          timestamp: new Date().toISOString(),
        });

        await logDebug('Deleting task proposals:', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        const proposalResult = await BackendProposal.deleteMany({ taskId });
        await logDebug('Deleted task proposals', 'taskManager', {
          taskId,
          result: proposalResult.deletedCount,
          timestamp: new Date().toISOString(),
        });

        const remainingTask = await Task.findOne({ taskId });
        if (remainingTask) {
          throw new Error('Task still exists after deletion');
        }

        try {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'deleted',
            message: 'Task deleted',
            logColor: 'green',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        } catch (emitErr) {
          await logError('Failed to emit taskUpdate event', 'taskManager', {
            taskId,
            error: emitErr.message,
            stack: emitErr.stack,
            timestamp: new Date().toISOString(),
          });
        }

        await logInfo('Deleted task', 'taskManager', { taskId, timestamp: new Date().toISOString() });
        break;
      } catch (err) {
        attempt++;
        await logWarn(`Delete task attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
          taskId,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          try {
            getIO().emit('taskUpdate', {
              taskId,
              status: 'failed',
              error: `Failed to delete task: ${err.message}`,
              logColor: 'red',
              timestamp: new Date().toISOString(),
              eventId: uuidv4(),
            });
          } catch (emitErr) {
            await logError('Failed to emit taskUpdate event', 'taskManager', {
              taskId,
              error: emitErr.message,
              stack: emitErr.stack,
              timestamp: new Date().toISOString(),
            });
          }
          throw new Error(`Failed to delete task: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  } catch (err) {
    await logError(`Delete task failed: ${err.message}`, 'taskManager', { taskId, stack: err.stack, timestamp: new Date().toISOString() });
    throw err;
  }
}

module.exports = { processTask, applyApprovedChanges, rollbackChanges, deleteTask };
