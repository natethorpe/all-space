// Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\components\GrokAnalyzer.jsx
// Historical Note: Added April 4, 2025, as GrokAnalyzer.js; renamed to .jsx on April 6, 2025, to fix Vite JSX parsing issue.
// Future Direction: Enhance with more UI controls (e.g., prompt selection) and integrate AI email drafting.
// Dependencies: react, redux, antd, redux toolkit (for thunks), axios (via grokSlice).
// Connections: Links to /api/grok/* endpoints via grokSlice thunks; used in Dashboard.jsx.

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input, Upload, Spin, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { analyzeData, uploadFile } from '../redux/grokSlice';

const GrokAnalyzer = () => {
  const [inputData, setInputData] = useState('');
  const dispatch = useDispatch();
  const { result, loading, error } = useSelector((state) => state.grok);

  const handleAnalyze = () => {
    dispatch(analyzeData(inputData));
  };

  const handleFileUpload = (file) => {
    dispatch(uploadFile(file));
    return false; // Prevent default upload behavior
  };

  return (
    <Card title="Grok Analyzer">
      <Input.TextArea
        rows={4}
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
        placeholder="Enter data to analyze (e.g., customer list)"
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
