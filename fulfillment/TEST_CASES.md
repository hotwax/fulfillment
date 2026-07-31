# End-to-End Test Case Scenarios

This document outlines all the end-to-end test scenarios covered in the project, including their execution steps, the case type, and a summary of total test coverage.

## Application & Compatibility
- **Current App Version**: 3.9.0
- **Node Version**: 18.20.8
- **Playwright Version**: 1.58.2
- **Test Compatibility**: These tests are compatible with app version 3.9.0 and above.

## Total Test Coverage

- **Total Test Cases**: 34
- **Sanity / Positive Tests**: 9
- **Negative / Edge Case Tests**: 21
- **Network / Error Handling Tests**: 2
- **Visual Regression Tests**: 2

## Test Case Scenarios

### should block protected routes after logout
- **File**: `test-logout-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Goto Settings
  - Click Logout
  - Assert Logged Out Redirect


### test-logout flow
- **File**: `test-logout.spec.js`
- **Case Type**: Sanity
- **Steps**:
  - Goto Settings
  - Click Logout
  - Assert Logged Out Redirect


### API Failure on Save (500 Error) - Should handle server error gracefully without crashing
- **File**: `create-transfer-order-breaking.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Wait For
  - Click
  - Fill
  - First
  - Count
  - Fulfill
  - Continue


### Extreme Boundary Inputs - Should not crash layout or execution
- **File**: `create-transfer-order-breaking.spec.js`
- **Case Type**: Visual Regression
- **Steps**:
  - Click
  - Wait For
  - Evaluate
  - Fill


### Race Condition / Double Submission - Clicking save rapidly
- **File**: `create-transfer-order-breaking.spec.js`
- **Case Type**: Sanity
- **Steps**:
  - Wait For
  - Click
  - Fill
  - First
  - Count
  - Evaluate


### Offline Mode - Should handle network disconnection gracefully
- **File**: `create-transfer-order-breaking.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Wait For
  - Click
  - Fill
  - Count
  - Set Offline


### Backend Validation Error (400 Bad Request) - Should display error message
- **File**: `create-transfer-order-breaking.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Wait For
  - Click
  - Fill
  - Count
  - Fulfill
  - Continue


### Malformed API Responses (JSON Parse Error) - Should not crash UI
- **File**: `create-transfer-order-breaking.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Wait For
  - Click
  - Fill
  - Count
  - Fulfill
  - Continue


### Network Hang / Timeout - Should not freeze indefinitely
- **File**: `create-transfer-order-breaking.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Wait For
  - Click
  - Fill
  - Count
  - Continue


### Invalid Barcode - Display Error When Scanning Unknown Item
- **File**: `invalid-barcode.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order
  - Wait For
  - Fill
  - Press


### Transfer Order Creation - 500 Internal Server Error Graceful Handling
- **File**: `create-to-network-failure.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Continue
  - Fulfill
  - Navigate To Transfer Orders
  - Wait For
  - Click
  - Fill
  - First
  - Count


### Pack Order - 500 Internal Server Error Graceful Handling
- **File**: `pack-order-network-failure.spec.js`
- **Case Type**: Network/Error Handling
- **Steps**:
  - Fulfill
  - Goto Open Orders
  - Go To In Progress Tab
  - Wait For
  - Is Visible
  - Click
  - Count
  - First


### Sanity | Fulfillment bulk order flow - Print Picklist, Pack and Ship via tabs 
- **File**: `salesorder_Viatabs.spec.js`
- **Case Type**: Sanity
- **Steps**: (Tests UI element state or navigation directly without explicit Page Object steps)


### Negative | Sales Order | Pack stays disabled before selecting documents
- **File**: `salesorder_Viatabs.spec.js`
- **Case Type**: Negative
- **Steps**: (Tests UI element state or navigation directly without explicit Page Object steps)


### Sanity | Sales Order - add Box logic for multiple items
- **File**: `salesorder_addbox.spec.js`
- **Case Type**: Sanity
- **Steps**:
  - Prepare the environment by navigating to Sales Orders and finding an eligible order.
  - Execute the packing logic (adding a box and packing items into it)
  - This verifies that we can add boxes up to the item count, and then the button becomes disabled.


### Negative | Sales Order - add Box logic for single item
- **File**: `salesorder_addbox.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Prepare the environment by navigating to Sales Orders and finding an eligible order.
  - This verifies that the Add Box button is disabled for orders with only 1 item.


### Sanity | Fulfillment- sales order bulk order flow - Rejectall
- **File**: `salesorder_rejectall.Spec.js`
- **Case Type**: Sanity
- **Steps**: (Tests UI element state or navigation directly without explicit Page Object steps)


### Negative | Sales Order | Reject confirmation should not show before clicking Reject all
- **File**: `salesorder_rejectall.Spec.js`
- **Case Type**: Negative
- **Steps**: (Tests UI element state or navigation directly without explicit Page Object steps)


### Sanity | Fulfillment | Reject single order via details page
- **File**: `salesorder_rejectorder_details.spec.js`
- **Case Type**: Sanity
- **Steps**: (Tests UI element state or navigation directly without explicit Page Object steps)


### Negative | Sales Order | Reject order is disabled before issue selection
- **File**: `salesorder_rejectorder_details.spec.js`
- **Case Type**: Negative
- **Steps**: (Tests UI element state or navigation directly without explicit Page Object steps)


### should keep Ship later disabled before adding items
- **File**: `test-createOrder-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order


### should keep Pack and ship order disabled before adding items
- **File**: `test-createOrder-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order


### test-create order
- **File**: `test-createOrder.spec.js`
- **Case Type**: Sanity
- **Steps**:
  - 1. Navigate to the base application URL and wait for DOM and network to settle
  - 2. Initialize the POM responsible for orchestrating the entire Transfer Order creation flow
  - 3. Determine the client ID from the Playwright project name (e.g., adoc-sv-uat)
  - 4. Attempt to prepare the transfer order (clicks through to creation modal).
  - If no facilities are available (e.g., due to stale environment data), skip the test instead of failing.
  - 5. Execute the core Transfer Order item addition and packing workflow, passing in the client's test SKUs


### should not show Discard order action on transfer order list page
- **File**: `test-discardorder-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders


### should keep Ship later disabled before any item is added
- **File**: `test-discardorder-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order


### test-discardorder
- **File**: `test-discardorder.spec.js`
- **Case Type**: Sanity
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order
  - Open Search Tab
  - Search And Add Product
  - Discard Order


### should not show transfer name editor before edit mode
- **File**: `test-editdetails-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order


### should not show store/facility combobox before edit mode
- **File**: `test-editdetails-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order


### test-edit details
- **File**: `test-editdetails.spec.js`
- **Case Type**: Sanity
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order
  - Edit Transfer Order Name
  - Update Store For Transfer Order


### should keep Ship later disabled before adding any item
- **File**: `test-shiplater-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order


### should not show Search orders field before ship-later move
- **File**: `test-shiplater-negative.spec.js`
- **Case Type**: Negative
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order


### test-ship later
- **File**: `test-shiplater.spec.js`
- **Case Type**: Sanity
- **Steps**:
  - Navigate To Transfer Orders
  - Create Transfer Order
  - Open Search Tab
  - Search And Add Product
  - Mark Order To Ship Later
  - Fulfill Ship Later Order


### Open Sales Orders - Layout and Fonts
- **File**: `positive-flows.spec.js`
- **Case Type**: Visual Regression
- **Steps**:
  - Goto Open Orders


### Create Transfer Order Modal - Layout and Fonts
- **File**: `positive-flows.spec.js`
- **Case Type**: Visual Regression
- **Steps**:
  - Wait For
  - Is Visible
  - Click

