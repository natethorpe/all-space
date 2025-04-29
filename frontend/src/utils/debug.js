/* File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\utils\debug.js */

/* File Description:
 * - Purpose: Provides utility functions for debugging the DOM structure and computed styles in the Woodkey Festival and Hi-Way Drive-In CRM, primarily used to diagnose layout and rendering issues in Dashboard.jsx.
 * - Functionality:
 *   - getDashboardLayoutStyles: Captures the DOM tree starting from a root element (e.g., .ant-app), including computed styles for layout-related properties.
 *   - Logs the DOM structure and styles to the console for inspection.
 *   - Filters elements to include only those relevant to layout debugging (e.g., Ant Design components, containers, headings).
 * - Structure:
 *   - getDashboardLayoutStyles: Main function that builds a DOM tree with styles.
 *   - Helper Functions:
 *     - getElementIdentifier: Builds a unique identifier for an element (tag, ID, classes).
 *     - getStyles: Extracts computed styles for specified properties.
 *     - isRelevantElement: Determines if an element should be included in the DOM tree.
 *     - buildDomTree: Recursively builds the DOM tree with styles.
 * - Connections:
 *   - Used by: Dashboard.jsx (automatically runs on mount to debug DOM structure).
 *   - Impacts: Debugging process for layout issues in Dashboard.jsx, ErpLayout.jsx, and child components.
 * - Dependencies:
 *   - Browser environment (window.getComputedStyle, document.querySelector).
 * - Current Features:
 *   - Captures DOM structure and styles for layout debugging.
 *   - Filters out irrelevant elements to reduce noise.
 *   - Includes a delay to ensure DOM rendering is complete.
 * - Status:
 *   - As of 04/04/2025, throws an error due to className.includes on non-string values.
 * - Updates (04/04/2025):
 *   - Fixed className.includes error in isRelevantElement.
 *     - Why: className can be an SVGAnimatedString or undefined, which doesn’t have includes method.
 *     - How: Added a type check to ensure className is a string before calling includes.
 *     - Impact: Prevents errors when traversing DOM elements, allowing getDashboardLayoutStyles to complete.
 *   - Next Steps: Test to confirm DOM tree is logged, verify all components are captured, reintroduce debug logs.
 * - Future Enhancements:
 *   - Add a UI component to display the DOM tree in the app (e.g., a debug panel).
 *   - Export the DOM tree to a file for offline analysis.
 *   - Add filtering options (e.g., by class or tag) to focus on specific elements.
 * - Dependencies on This File:
 *   - Dashboard.jsx: Imports and runs getDashboardLayoutStyles on mount.
 * - This File Depends On:
 *   - Browser environment (window.getComputedStyle, document.querySelector).
 */

// Function to capture the DOM structure and computed styles for debugging the dashboard layout
export function getDashboardLayoutStyles() {
    const propertiesToTrack = [
      'display', 'visibility', 'position', 'width', 'height',
      'min-width', 'max-width', 'margin', 'padding', 'border',
      'background-color', 'color', 'font-family', 'font-size', 'font-weight',
      'text-align', 'overflow', 'flex', 'flex-basis', 'flex-grow', 'flex-shrink',
      'box-sizing', 'white-space', 'word-break'
    ];
  
    const domTree = [];
  
    function getElementIdentifier(element) {
      const tagName = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : '';
      const className = (typeof element.className === 'string' && element.className)
        ? `.${element.className.trim().split(' ').join('.')}`
        : '';
      return `${tagName}${id}${className}`;
    }
  
    function getStyles(element) {
      const styles = {};
      try {
        const computedStyle = window.getComputedStyle(element);
        propertiesToTrack.forEach(prop => {
          const value = computedStyle.getPropertyValue(prop);
          styles[prop] = value;
        });
        return styles;
      } catch (error) {
        console.warn(`Error computing styles for element ${getElementIdentifier(element)}: ${error.message}`);
        return { error: error.message };
      }
    }
  
    function isRelevantElement(element) {
      const tagName = element.tagName.toLowerCase();
      const className = element.className || '';
      // Ensure className is a string before calling includes
      const isLayoutElement = typeof className === 'string' && (
        className.includes('ant-') ||
        className.includes('site-layout-background') ||
        className.includes('logo') ||
        className.includes('erp-') || // Include custom erp classes
        className.includes('content-wrapper')
      );
      const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
      const isContainer = ['div', 'main', 'aside', 'header', 'section', 'ul', 'li'].includes(tagName);
      const isRelevant = isLayoutElement || isHeading || isContainer; // Less strict: include all containers
      if (!isRelevant) {
        console.log(`Skipping element: ${getElementIdentifier(element)} - not relevant`);
      }
      return isRelevant;
    }
  
    function buildDomTree(element, depth = 0) {
      if (!isRelevantElement(element)) return null;
  
      const identifier = getElementIdentifier(element);
      const styles = getStyles(element);
  
      const node = {
        identifier: identifier,
        depth: depth,
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        className: element.className || null,
        textContent: element.textContent ? element.textContent.trim().substring(0, 50) : null,
        styles: styles,
        children: []
      };
  
      const children = Array.from(element.children);
      console.log(`Processing children for ${identifier}: ${children.length} children found`);
      children.forEach(child => {
        const childNode = buildDomTree(child, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        } else {
          console.log(`Child skipped: ${getElementIdentifier(child)}`);
        }
      });
  
      return node;
    }
  
    const rootElement = document.querySelector('.ant-app') || document.body;
    if (!rootElement) {
      console.error('Root element (.ant-app or body) not found');
      return null;
    }
    console.log(`Starting DOM traversal from: ${getElementIdentifier(rootElement)}`);
  
    return new Promise(resolve => {
      setTimeout(() => {
        const tree = buildDomTree(rootElement);
        console.log(JSON.stringify(tree, null, 2));
        resolve(tree);
      }, 2000);
    });
  }
  