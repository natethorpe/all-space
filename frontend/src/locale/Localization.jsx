// frontend/src/locale/Localization.jsx
// Nate’s instruction from 04/01/2025: Annotated provided Localization.jsx
// Why: Confirm i18n setup, align with IdurarOs.jsx
// How: Static Ant Design theme, no dynamic locale yet
// Notes:
// - Purpose: Wraps app content with Ant Design theme config, used by IdurarOs.jsx and sub-components.
// - Connects to: No direct i18n (antdLocale.js/coreTranslation.js not used), purely theme-based.
// - Limitation: Lacks dynamic locale loading from earlier chats, only sets static theme tokens.
// - Future: Could integrate antdLocale.js and translations if i18n needed.
// Next: Test theme application, consider adding dynamic locale
import { ConfigProvider } from 'antd';

export default function Localization({ children }) {
  console.log('Localization rendering');
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#339393',
          colorLink: '#1640D6',
          borderRadius: 0,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
