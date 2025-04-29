/*
 * File Path: backend/src/utils/fileGeneratorV18.js
 * Purpose: Generates frontend files for Allur Space Console based on task prompts.
 * How It Works:
 *   - Generates files (e.g., EmployeeLog-vX.jsx) dynamically using a mock Grok API based on task prompt, action, target, and features.
 *   - Cleans up old versioned files and persists stagedFiles to Task model.
 *   - Logs generation and persistence to MongoDB Log model.
 *   - Implements deduplication to prevent repeated generateFiles calls for the same taskId and target.
 * Mechanics:
 *   - Validates file paths to prevent errors, retries stagedFiles saves (7 attempts).
 *   - Uses taskDedupeUtils.js to track and deduplicate generateFiles calls.
 *   --

const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const { appendLog, debugLogPath, readFileNotes, installDependency } = require('./fileUtils');
const { hasGeneratedFile, recordGeneratedFile } = require('./taskDedupeUtils');
const winston = require('winston');
const moment = require('moment');
const esprima = require('esprima');
const { getModel } = require('../db');
const { parsePrompt } = require('./promptParser');
const { v4: uuidv4 } = require('uuid');

const Task = getModel('Task');
const Log = getModel('Log');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
  ],
});

console.log('=== fileGeneratorV18.js loaded ===');

const projectRoot = path.resolve(__dirname, '../../../');

/**
 * Mock Grok API to simulate dynamic file generation based on task prompt.
 * @param {string} prompt - Task prompt.
 * @param {string} target - Target component.
 * @param {Object} features - Features to include.
 * @returns {Object} Generated file content and metadata.
 */
async function mockGrokAPI(prompt, target, features) {
  const parsed = parsePrompt(prompt, 'mock-task-id');
  const { action, target: parsedTarget, features: parsedFeatures } = parsed;
  const component = target || parsedTarget || 'GenericComponent';
  const featureList = { ...features, ...parsedFeatures };

  let content = '';
  let dependencies = ['react', 'antd'];

  try {
    if (component === 'EmployeeLog' || featureList.payroll || featureList.ai) {
      if (featureList.payroll) dependencies.push('moment');
      if (featureList.ai) dependencies.push('@tensorflow/tfjs');
      content = `/*
 * File: ${component}.jsx
 * Purpose: Employee log system with ${featureList.payroll ? 'payroll' : ''}${featureList.ai ? ', AI predictions' : ''}.
 * Dependencies: ${dependencies.join(', ')}
 */
import React, { useState } from 'react';
import { Button, Table } from 'antd';
${featureList.payroll ? "import moment from 'moment';" : ''}
${featureList.ai ? "import * as tf from '@tensorflow/tfjs';" : ''}

const ${component} = () => {
  const [logs, setLogs] = useState([]);

  const logEvent = (type) => {
    const log = { time: new Date().toISOString(), type${featureList.payroll ? ", hours: 0" : ""} };
    setLogs([...logs, log]);
  };

  const columns = [
    { title: 'Time', dataIndex: 'time', key: 'time' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    ${featureList.payroll ? "{ title: 'Hours', dataIndex: 'hours', key: 'hours' }" : ""}
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Button onClick={() => logEvent('login')}>Log In</Button>
      <Table dataSource={logs} columns={columns} />
    </div>
  );
};

export default ${component};
`;
    } else if (component === 'Login' || prompt.toLowerCase().includes('login')) {
      dependencies.push('axios', 'react-router-dom');
      content = `/*
 * File: ${component}.jsx
 * Purpose: Login page with modern UI.
 * Dependencies: ${dependencies.join(', ')}
 */
import React from 'react';
import { Form, Input, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ${component} = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      await axios.post('/api/auth/login', values);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Form onFinish={onFinish}>
        <Form.Item name="email" rules={[{ required: true }]}>
          <Input placeholder="Email" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true }]}>
          <Input.Password placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Log In</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ${component};
`;
    } else if (component === 'Dashboard' || prompt.toLowerCase().includes('dashboard')) {
      dependencies.push('react-router-dom');
      content = `/*
 * File: ${component}.jsx
 * Purpose: CRM dashboard with navigation.
 * Dependencies: ${dependencies.join(', ')}
 */
import React from 'react';
import { Card, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const ${component} = () => {
  const navigate = useNavigate();

  return (
    <Card title="CRM Dashboard">
      <Button onClick={() => navigate('/employee-log')}>Employee Log</Button>
    </Card>
  );
};

export default ${component};
`;
    } else {
      // Fallback for invalid or unhandled prompts
      content = `/*
 * File: ${component}.jsx
 * Purpose: Generic component for task: ${prompt}.
 * Dependencies: ${dependencies.join(', ')}
 */
import React from 'react';
import { Card } from 'antd';

const ${component} = () => (
  <Card title="${component}">
    <p>Generated for task: ${prompt}</p>
  </Card>
);

export default ${component};
`;
      await Log.create({
        level: 'warn',
        message: `Fallback to generic component for prompt: ${prompt}`,
        context: 'fileGenerator',
        details: { taskId: parsed.taskId, component },
        timestamp: new Date().toISOString(),
      });
    }

    return { content, dependencies };
  } catch (err) {
    await Log.create({
      level: 'error',
      message: `mockGrokAPI failed: ${err.message}`,
      context: 'fileGenerator',
      details: { prompt, target, features, stack: err.stack },
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Failed to generate file content: ${err.message}`);
  }
}

/**
 * Validates generated code for syntax and project conventions.
 * @param {string} code - The generated code to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
async function validateGeneratedCode(code) {
  try {
    esprima.parseScript(code);
    return true;
  } catch (err) {
    await Log.create({
      level: 'error',
      message: `Code validation failed: ${err.message}`,
      context: 'fileGenerator',
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

/**
 * Cleans up old versioned files.
 * @param {string} targetDir - Directory to clean.
 * @param {string} baseFileName - Base name of files to remove.
 */
async function cleanupOldVersions(targetDir, baseFileName) {
  console.log('fileGeneratorV18: cleanupOldVersions called for:', baseFileName);
  const files = await fs.readdir(targetDir).catch(() => []);
  const oldVersions = files.filter((f) => f.startsWith(baseFileName + '-v') && f.endsWith('.jsx'));
  for (const oldFile of oldVersions) {
    await fs.unlink(path.join(targetDir, oldFile)).catch(() => {});
    await Log.create({
      level: 'info',
      message: `Deleted old version: ${oldFile}`,
      context: 'fileGenerator',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generates files based on task prompt, features, and existing notes.
 * @param {Object} task - The task object being processed.
 * @param {string} action - The parsed action (e.g., 'generate', 'redo').
 * @param {string} target - The target component (e.g., 'EmployeeLog').
 * @param {Object} features - Features to include (e.g., { payroll: true }).
 * @returns {Promise<string|null>} Path to generated file or null if failed.
 */
async function generateFiles(task, action, target, features) {
  console.log('fileGeneratorV18: generateFiles called with taskId:', task.taskId, 'target:', target);
  const targetDir = path.join(projectRoot, 'frontend/src/pages');
  const baseFileName = target || 'GenericComponent';

  // Check for deduplication
  const dedupeKey = `${task.taskId}_${target}`;
  if (await hasGeneratedFile(dedupeKey)) {
    await Log.create({
      level: 'info',
      message: `Skipped generateFiles: Already generated for taskId: ${task.taskId}, target: ${target}`,
      context: 'fileGenerator',
      details: { dedupeKey, taskId: task.taskId, target },
      timestamp: new Date().toISOString(),
    });
    return null; // Skip generation if already processed
  }

  await cleanupOldVersions(targetDir, baseFileName);

  let version = 0;
  let targetFile = path.join(targetDir, `${baseFileName}-v${version}.jsx`);
  while (await fs.access(targetFile).then(() => true).catch(() => false)) {
    version++;
    targetFile = path.join(targetDir, `${baseFileName}-v${version}.jsx`);
  }

  const resolvedPath = path.resolve(targetFile);
  if (!resolvedPath.startsWith(projectRoot)) {
    await Log.create({
      level: 'error',
      message: `Invalid file path: ${resolvedPath} is outside project root`,
      context: 'fileGenerator',
      details: { taskId: task.taskId },
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Invalid file path: ${resolvedPath}`);
  }

  await Log.create({
    level: 'debug',
    message: `Generating file: ${targetFile}`,
    context: 'fileGenerator',
    details: { taskId: task.taskId, target, version, attempt: 1 },
    timestamp: new Date().toISOString(),
  });

  let content, dependencies;
  try {
    const result = await mockGrokAPI(task.prompt, target, features);
    content = result.content;
    dependencies = result.dependencies;
  } catch (err) {
    await Log.create({
      level: 'error',
      message: `File generation failed for ${targetFile}: ${err.message}`,
      context: 'fileGenerator',
      details: { taskId: task.taskId, target, stack: err.stack },
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Failed to generate file: ${err.message}`);
  }

  if (!await validateGeneratedCode(content)) {
    await Log.create({
      level: 'error',
      message: `Invalid generated code for ${targetFile}`,
      context: 'fileGenerator',
      details: { taskId: task.taskId },
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid generated code');
  }

  for (const dep of dependencies) {
    await installDependency(dep).catch((err) => {
      logger.warn(`Failed to install dependency ${dep}: ${err.message}`);
    });
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetFile, content, 'utf8');

  try {
    await fs.access(targetFile);
    await Log.create({
      level: 'debug',
      message: `File written and verified: ${targetFile}`,
      context: 'fileGenerator',
      details: { taskId: task.taskId },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await Log.create({
      level: 'error',
      message: `File write failed or file not accessible: ${targetFile}`,
      context: 'fileGenerator',
      details: { taskId: task.taskId, error: err.message },
      timestamp: new Date().toISOString(),
    });
    throw new Error(`File write failed: ${targetFile}`);
  }

  let retries = 0;
  const maxRetries = 7;
  while (retries < maxRetries) {
    try {
      task.stagedFiles = Array.isArray(task.stagedFiles) ? task.stagedFiles : [];
      const fileObj = { path: targetFile, content: await fs.readFile(targetFile, 'utf8') };
      if (!task.stagedFiles.some(f => f.path === targetFile)) {
        task.stagedFiles.push(fileObj);
        task.markModified('stagedFiles');
        await task.save();
        await Log.create({
          level: 'debug',
          message: `Persisted stagedFiles object: ${JSON.stringify(fileObj)}`,
          context: 'fileGenerator',
          details: { taskId: task.taskId, attempt: retries + 1 },
          timestamp: new Date().toISOString(),
        });
        // Verify save
        const savedTask = await Task.findOne({ taskId: task.taskId });
        if (!savedTask.stagedFiles.some(f => f.path === targetFile && f.content === fileObj.content)) {
          throw new Error('Staged files not persisted correctly');
        }
        await Log.create({
          level: 'debug',
          message: `Verified stagedFiles persistence`,
          context: 'fileGenerator',
          details: { taskId: task.taskId, file: targetFile },
          timestamp: new Date().toISOString(),
        });
      }
      // Record successful generation for deduplication
      await recordGeneratedFile(dedupeKey);
      break;
    } catch (err) {
      retries++;
      await Log.create({
        level: 'warn',
        message: `Staged files save attempt ${retries}/${maxRetries} failed: ${err.message}`,
        context: 'fileGenerator',
        details: { taskId: task.taskId, stack: err.stack },
        timestamp: new Date().toISOString(),
      });
      if (retries >= maxRetries) {
        await Log.create({
          level: 'error',
          message: `Failed to persist stagedFiles after ${maxRetries} attempts`,
          context: 'fileGenerator',
          details: { taskId: task.taskId, error: err.message },
          timestamp: new Date().toISOString(),
        });
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * retries));
    }
  }

  await Log.create({
    level: 'info',
    message: `File generated: ${targetFile}`,
    context: 'fileGenerator',
    details: { taskId: task.taskId, dedupeKey },
    timestamp: new Date().toISOString(),
  });
  await appendLog(debugLogPath, `# File Generated\nTask ID: ${task.taskId}\nFile: ${targetFile}\nTimestamp: ${new Date().toISOString()}`);
  return targetFile;
}

module.exports = { generateFiles };
