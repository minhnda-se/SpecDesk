/**
 * Action and Token Constants for Playwright Embedded Studio
 */

export const ACTION_CATEGORIES = {
  UI: [
    { action: 'goto', label: 'Navigate to URL', description: 'Open web page URL' },
    { action: 'click', label: 'Click Element', description: 'Click targeted element' },
    { action: 'left_click', label: 'Left Click', description: 'Explicit left mouse button click' },
    { action: 'right_click', label: 'Right Click', description: 'Right mouse button click (context menu)' },
    { action: 'double_click', label: 'Double Click', description: 'Double click targeted element' },
    { action: 'hover', label: 'Hover Element', description: 'Hover mouse over targeted element' },
    { action: 'fill', label: 'Fill Input', description: 'Type text into input field' },
    { action: 'clear', label: 'Clear Input', description: 'Empty text input without triggering fill validator' },
    { action: 'press_key', label: 'Press Key', description: 'Press keyboard key (Enter, Escape, Tab, etc.)' },
    { action: 'select_option', label: 'Select Option', description: 'Select dropdown option by value or label' },
    { action: 'check', label: 'Check Box', description: 'Check checkbox or radio button' },
    { action: 'uncheck', label: 'Uncheck Box', description: 'Uncheck checkbox' },
    { action: 'upload_file', label: 'Upload File', description: 'Upload file to file input element' },
    { action: 'scroll_to', label: 'Scroll To', description: 'Scroll element smoothly into view' },
    { action: 'wait', label: 'Wait (ms)', description: 'Pause execution for fixed milliseconds' },
    { action: 'wait_for_element', label: 'Wait for Element', description: 'Wait until element reaches visible/hidden state' },
    { action: 'switch_new_tab', label: 'Switch Tab', description: 'Switch context to newly opened browser tab' },
    { action: 'store_text', label: 'Store Text', description: 'Store element inner text into a runtime variable' },
    { action: 'save_storage_state', label: 'Save Storage State', description: 'Persist cookies and localStorage to session file' },
  ],
  ASSERTION: [
    { action: 'verify_visible', label: 'Verify Visible', description: 'Assert element is present and visible in DOM' },
    { action: 'verify_not_visible', label: 'Verify Not Visible', description: 'Assert element is hidden or detached from DOM' },
    { action: 'verify_enabled', label: 'Verify Enabled', description: 'Assert interactive element is enabled' },
    { action: 'verify_disabled', label: 'Verify Disabled', description: 'Assert interactive element is disabled' },
    { action: 'verify_checked', label: 'Verify Checked', description: 'Assert checkbox/radio is checked' },
    { action: 'verify_unchecked', label: 'Verify Unchecked', description: 'Assert checkbox/radio is unchecked' },
    { action: 'verify_value', label: 'Verify Input Value', description: 'Assert current input DOM value matches' },
    { action: 'verify_text', label: 'Verify Exact Text', description: 'Assert element text exactly matches expected value' },
    { action: 'verify_text_contains', label: 'Verify Text Contains', description: 'Assert element text contains expected substring' },
    { action: 'verify_not_contains_text', label: 'Verify Not Contains Text', description: 'Assert element text does not contain substring' },
    { action: 'verify_class_contains', label: 'Verify Class Contains', description: 'Assert element class attribute contains token' },
    { action: 'verify_not_contains_class', label: 'Verify Class Not Contains', description: 'Assert element class does not contain token' },
    { action: 'verify_url_contains', label: 'Verify URL Contains', description: 'Assert current browser page URL contains substring' },
    { action: 'verify_attribute', label: 'Verify Attribute', description: 'Assert element attribute matches value or regex' },
    { action: 'verify_element_count', label: 'Verify Element Count', description: 'Assert count of matched elements in DOM' },
    { action: 'verify_visual_snapshot', label: 'Visual Comparison', description: 'Pixel-level visual regression comparison' },
  ],
  API: [
    { action: 'api_get', label: 'HTTP GET Request', description: 'Execute REST GET request and store response' },
    { action: 'api_post', label: 'HTTP POST Request', description: 'Execute REST POST request with body' },
    { action: 'api_put', label: 'HTTP PUT Request', description: 'Execute REST PUT request with body' },
    { action: 'api_patch', label: 'HTTP PATCH Request', description: 'Execute REST PATCH request with body' },
    { action: 'api_delete', label: 'HTTP DELETE Request', description: 'Execute REST DELETE request' },
  ],
  NETWORK: [
    { action: 'mock_route', label: 'Mock Network Route', description: 'Intercept network URL pattern and return mock response' },
    { action: 'unmock_route', label: 'Unmock Network Route', description: 'Remove network interception for URL pattern' },
  ],
  FLOW: [
    { action: 'call_flow', label: 'Call Reusable Flow', description: 'Invoke reusable sub-flow scenario with parameters' },
  ],
};

export const DYNAMIC_TOKENS = [
  { token: '{{TIMESTAMP}}', label: 'Current Epoch Milliseconds' },
  { token: '{{DATE_TODAY}}', label: 'Today (YYYY-MM-DD)' },
  { token: '{{RANDOM_EMAIL}}', label: 'Randomized Test Email' },
  { token: '{{RANDOM_NAME}}', label: 'Randomized Person Name' },
  { token: '{{UUID}}', label: 'Standard UUID v4' },
  { token: '{{RANDOM_NUMBER_6}}', label: '6-digit OTP/PIN' },
];
