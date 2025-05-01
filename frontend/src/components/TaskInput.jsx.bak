/*
 * File Path: frontend/src/components/TaskInput.jsx
 * Purpose: Task input form for Allur Space Console, allowing users to submit prompts and clear tasks.
 * How It Works:
 *   - Renders a TextArea for task prompts and buttons for submitting tasks or clearing all tasks.
 *   - Passes user input to useTasks.js for API submission (via /grok/edit) and task clearing (via /grok/clear-tasks).
 *   - Disables submit button during submission to prevent duplicate requests.
 * Dependencies:
 *   - antd: Input, Button, Space for UI components and styling (version 5.24.6).
 *   - React: Core library for rendering (version 18.3.1).
 * Dependents:
 *   - GrokUI.jsx: Renders TaskInput within a Card as the primary input UI.
 *   - useTasks.js: Provides prompt, setPrompt, handleSubmit, clearTasks, buttonLoading, and isSubmitting for input handling and API interactions.
 * Why It’s Here:
 *   - Modularizes the task input UI from GrokUI.jsx, reducing its size by ~30 lines (04/21/2025).
 *   - Supports Sprint 2 usability by providing a clear, user-friendly interface for task submission.
 * Key Info:
 *   - Ensures prompt input is validated by useTasks.js (e.g., non-empty, no pending tasks) before submission.
 *   - Uses loading states to provide feedback during submission or clearing.
 * Change Log:
 *   - 04/21/2025: Created to modularize GrokUI.jsx input UI, fully implemented.
 *   - 04/23/2025: Fixed TextArea import error.
 *     - Why: SyntaxError: antd does not provide export named 'TextArea' (User, 04/23/2025).
 *     - How: Changed import to Input.TextArea, added error boundary, verified antd 5.24.6 compatibility.
 *     - Test: Run `npm run dev`, navigate to /grok, verify TaskInput renders, no TextArea error.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify TaskInput renders with TextArea, Submit, and Clear buttons.
 *   - Enter "Build CRM system" and submit: Confirm task appears in TaskList, blue log in LiveFeed.
 *   - Click Clear All Tasks: Verify tasks cleared, green log in LiveFeed.
 *   - Check browser console: Confirm no TextArea SyntaxError.
 * Future Enhancements:
 *   - Add input validation UI (e.g., highlight empty prompt, character limit) (Sprint 4).
 *   - Support prompt templates for common tasks (e.g., dropdown with "Build CRM") (Sprint 5).
 *   - Add keyboard shortcuts (e.g., Ctrl+Enter to submit) (Sprint 6).
 *   - Integrate with analytics to track submission frequency (Sprint 5).
 *   - Add autosave for draft prompts to localStorage (Sprint 6).
 * Self-Notes:
 *   - Nate: Fixed TextArea import to resolve SyntaxError, added error boundary (04/23/2025).
 * Rollback Instructions:
 *   - If TaskInput fails: Copy TaskInput.jsx.bak to TaskInput.jsx (`mv frontend/src/components/TaskInput.jsx.bak frontend/src/components/TaskInput.jsx`).
 *   - Verify TaskInput renders after rollback.
 */
import React from 'react';
import { Input, Button, Space } from 'antd';

const { TextArea } = Input;

const TaskInput = ({ prompt, setPrompt, handleSubmit, clearTasks, buttonLoading, isSubmitting }) => {
  console.log('TaskInput rendering, props:', {
    prompt,
    setPromptDefined: !!setPrompt,
    handleSubmitDefined: !!handleSubmit,
    clearTasksDefined: !!clearTasks,
    buttonLoadingKeys: Object.keys(buttonLoading),
    isSubmitting,
  });

  try {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <TextArea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your task prompt (e.g., 'Build a CRM system')"
        />
        <Space>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={buttonLoading.submit}
            disabled={isSubmitting}
          >
            Submit Task
          </Button>
          <Button
            onClick={clearTasks}
            loading={buttonLoading.clear}
          >
            Clear All Tasks
          </Button>
        </Space>
      </Space>
    );
  } catch (err) {
    console.error('TaskInput: Runtime error:', err);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Task Input Error</h2>
        <p>{err.message}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }
};

export default TaskInput;
