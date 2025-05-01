/*
 * File Path: frontend/src/components/GrokAnalyzer.jsx
 * Purpose: Provides a UI for data analysis in Allur Space Console, with prompt selection for common tasks.
 * How It Works:
 *   - Renders a TextArea for custom input and a Select for predefined prompts.
 *   - Sends analysis requests to /api/grok/* endpoints via grokSlice thunks.
 *   - Displays loading states, errors, and results in a Card.
 * Mechanics:
 *   - Uses Redux for state management and API calls.
 *   - Validates input before dispatching analysis.
 *   - Supports file uploads for bulk data analysis.
 * Dependencies:
 *   - react: Core library (version 18.3.1).
 *   - redux: State management (version 5.0.2).
 *   - antd: UI components (version 5.24.6).
 *   - redux-toolkit: Thunks for API calls (version 2.3.0).
 *   - axios: API requests via grokSlice (version 1.8.4).
 * Dependents:
 *   - Dashboard.jsx: Renders GrokAnalyzer in the main dashboard.
 * Why It’s Here:
 *   - Enhances data analysis for Sprint 2, adding prompt selection UI (User, 05/01/2025).
 * Change Log:
 *   - 04/04/2025: Added as GrokAnalyzer.js (Nate).
 *   - 04/06/2025: Renamed to .jsx to fix Vite JSX parsing issue (Nate).
 *   - 05/01/2025: Added prompt selection UI, improved validation (Grok).
 *     - Why: Enhance usability with predefined prompts (User, 05/01/2025).
 *     - How: Added Select component, predefined prompts, input validation.
 *     - Test: Select prompt, analyze, verify results, no errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to dashboard: Select "Analyze Customer Data" prompt, click Analyze, verify results.
 *   - Enter custom input, verify results or error message.
 *   - Upload a file, confirm upload and analysis.
 *   - Check browser console: Confirm no errors, proper loading states.
 * Future Enhancements:
 *   - Add AI email drafting (Sprint 5).
 *   - Support advanced prompt customization (Sprint 6).
 * Self-Notes:
 *   - Nate: Fixed Vite JSX parsing issue (04/06/2025).
 *   - Grok: Added prompt selection UI (05/01/2025).
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input, Upload, Spin, Card, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { analyzeData, uploadFile } from '../redux/grokSlice';

const { Option } = Select;

const GrokAnalyzer = () => {
  const [inputData, setInputData] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const dispatch = useDispatch();
  const { result, loading, error } = useSelector((state) => state.grok);

  const predefinedPrompts = [
    { value: 'customer_data', label: 'Analyze Customer Data' },
    { value: 'employee_hours', label: 'Predict Employee Hours' },
    { value: 'financial_summary', label: 'Summarize Financial Data' },
  ];

  const handlePromptSelect = (value) => {
    setSelectedPrompt(value);
    setInputData(value ? `Analyze ${value.replace('_', ' ')}` : '');
  };

  const handleAnalyze = () => {
    if (!inputData.trim()) {
      console.warn('GrokAnalyzer: Empty input data');
      return;
    }
    dispatch(analyzeData(inputData));
  };

  const handleFileUpload = (file) => {
    if (!file) {
      console.warn('GrokAnalyzer: No file selected');
      return false;
    }
    dispatch(uploadFile(file));
    return false; // Prevent default upload behavior
  };

  return (
    <Card title="Grok Analyzer">
      <Select
        style={{ width: '100%', marginBottom: 10 }}
        placeholder="Select a predefined prompt"
        value={selectedPrompt}
        onChange={handlePromptSelect}
        allowClear
      >
        {predefinedPrompts.map((prompt) => (
          <Option key={prompt.value} value={prompt.value}>
            {prompt.label}
          </Option>
        ))}
      </Select>
      <Input.TextArea
        rows={4}
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
        placeholder="Enter data to analyze (e.g., customer list) or select a prompt"
      />
      <Button type="primary" onClick={handleAnalyze} loading={loading} style={{ marginTop: 10 }}>
        Analyze
      </Button>
      <Upload beforeUpload={handleFileUpload} showUploadList={false}>
        <Button icon={<UploadOutlined />} style={{ marginLeft: 10 }}>
          Upload File
        </Button>
      </Upload>
      {loading && <Spin style={{ marginTop: 20 }} />}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {result && (
        <Card style={{ marginTop: 20 }}>
          <h3>Grok Response:</h3>
          <p>{result}</p>
        </Card>
      )}
    </Card>
  );
};

export default GrokAnalyzer;
