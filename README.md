# Fulfillment App

## 1. Repository Overview
**Logical Name**: Fulfillment.

**Business Purpose**: This repository provides the Fulfillment PWA used by store and warehouse teams to execute order fulfillment workflows, including picking, packing, shipping, and transfer order processing. It connects to HotWax Commerce services to retrieve work queues, manage shipments, and print fulfillment documents so organizations can ship customer orders and move inventory efficiently.

## 2. Core Responsibilities & Business Logic
- **Order Fulfillment**: Locate open orders, create picklists, pick/scan items, pack shipments, generate labels, and ship orders.
- **Transfer Order Handling**: Pick, ship, and reject transfer orders between facilities.
- **Carrier & Shipping Operations**: Manage carrier shipment methods, generate tracking labels, and print packing slips.
- **Inventory & Exception Handling**: Handle unfulfillable items, rejections, and order status updates.
- **User & Facility Context**: Resolve user permissions, facilities, and product store context for fulfillment operations.

**Core workflows implemented**:
- **Open Orders → Picking**: Build Solr-backed order queues, create picklists/waves, and scan items to update picked quantities before packing and shipping.
- **Packing & Shipping**: Generate packing slips, shipping labels, and tracking codes; update shipment status from approved → packed → shipped.
- **Transfer Orders**: Retrieve transfer orders, scan items, create outbound shipments, and handle rejection reasons when inventory is not fulfillable.
- **Printing & Device Support**: Print picklists, packing slips, and labels (including Zebra printer flows) for operational execution.

## 3. Dependencies & Architecture
**Tech Stack**:
- **Frontend**: Vue 3, Ionic Vue, Vue Router, Pinia, TypeScript.
- **Mobile/PWA**: Capacitor, Ionic PWA tooling, service workers.
- **Platform/Utilities**: HotWax OMS API client (`@hotwax/oms-api`), HotWax DXP components, Firebase, Module Federation runtime.

**Dependency Map (App Repo)**:
- **HotWax OMS / Maarg services**: Core API for orders, shipments, picklists, and facility/user context via `@hotwax/oms-api`.
- **Solr-backed search**: Order queues are retrieved via Solr query endpoints for open orders and fulfillment queues.
- **Document services**: Printing endpoints for picklists, packing slips, shipping labels, and custom documents.
- **Firebase**: Notifications and remote entry hosting for modular UI extensions.
- **Zebra printer integration**: Dedicated services to support label/print workflows for Zebra devices.

## 4. Technical Context
**Run locally**:

This app is developed and run from the [`accxui`](https://github.com/hotwax/accxui) pnpm workspace, not from this folder directly. See [Build Notes (Contributors)](#build-notes-contributors) below for the full setup, or the [accxui README](https://github.com/hotwax/accxui/blob/main/README.md) for the complete workspace guide.

1. Place this app at `apps/fulfillment` inside an `accxui` workspace checkout.
2. Copy `.env.example` to `.env` and set required environment values.
3. Install dependencies from the `accxui` root: `pnpm install`
4. Start the app from the `accxui` root: `pnpm --filter fulfillment dev`

**Key environment configuration** (see `.env.example`):
- `VITE_BASE_URL`: Base URL for OMS API calls.
- `VITE_LOGIN_URL`: Login entry for HotWax Launchpad.
- `VITE_APP_VERSION_CONFIG`: Multi-version app hosting config as a single JSON object; `buildVersion` of `""` is the root bootstrap and `"vX.Y.Z"` is a versioned build. Required — the Vite config fails to load without it.
- `VITE_FIREBASE_CONFIG`: Firebase configuration for notifications.
- `VITE_FIREBASE_VAPID_KEY`: Firebase VAPID key for notifications.
- `VITE_REMOTE_ENTRY`: Remote entry for module federation extensions.
- `VITE_DEFAULT_PRODUCT_STORE_SETTINGS`: Default store-level fulfillment flags.

---

This README is structured to help automated release notes systems classify changes by fulfillment workflow, integrations, and operational domains.

---

## Prerequisite

- Node `v22.12.0` or higher
- `pnpm`


# Build Notes (Users)

This app is developed and run from the [`accxui`](https://github.com/hotwax/accxui) pnpm workspace. It is not started by running commands inside this app folder directly.

1. Open a Terminal window.
2. Clone the workspace using the command: `git clone https://github.com/hotwax/accxui.git`
3. Go to the workspace root using command: `cd accxui`
4. Download the app from the [release](https://github.com/hotwax/fulfillment/releases) page, extract it, and place it at `apps/fulfillment`.
5. Create a `.env` file in `apps/fulfillment` by taking reference from its `.env.example`.
6. Run following command from the `accxui` root to download dependencies  
    `pnpm install`
7. To run the app in browser use the command from the `accxui` root:  
    `pnpm --filter fulfillment dev`


# Build Notes (Contributors)

1. Open a Terminal window.
2. Clone the workspace using the command: `git clone https://github.com/hotwax/accxui.git`
3. Go to the workspace root using command: `cd accxui`
4. Clone this app under `apps/` using the command:  
    `git clone https://github.com/hotwax/fulfillment.git apps/fulfillment`
5. Create a `.env` file in `apps/fulfillment` by taking reference from its `.env.example`.
6. Run following command from the `accxui` root to download dependencies  
    `pnpm install`
7. To run the app in browser use the command from the `accxui` root:  
    `pnpm --filter fulfillment dev`
8. To build the app use the command from the `accxui` root:  
    `pnpm --filter fulfillment build`

Run `pnpm install` from the `accxui` root again whenever you add another app under `apps/`. See the [accxui README](https://github.com/hotwax/accxui/blob/main/README.md) for the full workspace guide.


# Contribution Guideline

1. Fork the repository and clone it locally from the `main` branch. Before starting your work make sure it's up to date with current `main` branch.
2. Pick an issue from [here](https://github.com/hotwax/fulfillment-pwa/issues). Write in the issue comment that you want to pick it, if you can't assign yourself. **Please stay assigned to one issue at a time to not block others**.
3. Create a branch for your edits. Use the following branch naming conventions: **fulfillment-pwa/issue-number**.
4. Please add issue number to your commit message.
5. Propose a Pull Request to `main` branch containing issue number and issue title.
6. Use [Pull Request template](https://github.com/hotwax/fulfillment-pwa/blob/main/.github/PULL_REQUEST_TEMPLATE.md) (it's automatically added to each PR) and fill as much fields as possible to describe your solution.
7. Reference any relevant issues or other information in your PR.
8. Wait for review and adjust your PR according to it.
9. Congrats! Your PR should now be merged in!

If you can't handle some parts of the issue then please ask for help in the comment. If you have any problems during the implementation of some complex issue, feel free to implement just a part of it.

## Report a bug or request a feature

Always define the type of issue:
* Bug report
* Feature request

While writing issues, please be as specific as possible. All requests regarding support with implementation or application setup should be sent to.
    
    
# UI / UX Resources
You may find some useful resources for improving the UI / UX of the app <a href="https://www.figma.com/community/file/885791511781717756" target="_blank">here</a>.

# Join the community on Discord
If you have any questions or ideas feel free to join our <a href="https://discord.gg/SwpJnpdyg3" target="_blank">Discord channel</a>
    
# The license

Fulfillment app is completely free and released under the Apache v2.0 License. Check <a href="https://github.com/hotwax/fulfillment-pwa/blob/main/LICENSE" target="_blank">LICENSE</a> for more details.


## Playwright Automation – Execution Guidelines

This document explains how to run Playwright tests on local machine. This assumes that you already have project setup locally.

1. Install Playwright browsers:

    `npx playwright install`

2. Commands to run test cases:

    - `npx playwright test`: Runs all tests
    - `npx playwright test tests/login.spec.js`: Runs specific test file
    - `npx playwright test --headed`: Runs in headed mode
    - `npx playwright test --project=chromium`: Runs in specific browser
    - `npx playwright test --debug`: Runs in debug mode

3. Generate and View Report

    Once a test cases finshed, you can check its report using:
    `npx playwright show-report`

 
