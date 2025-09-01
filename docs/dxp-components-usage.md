# Using DXP Components

This application uses the `@hotwax/dxp-components` package for shared UI components, translation utilities and Pinia stores. These components maintain their own state and expose getters and actions to access or modify that state.

## Installation

The dependency is declared in `package.json`:

```json
"@hotwax/dxp-components": "^1.22.1"
```

Install dependencies with `npm install` (internet access required).

## Importing utilities

Utilities such as `translate`, `initialiseFirebaseApp`, and store composables can be imported directly:

```ts
import { initialiseFirebaseApp, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
```

Source example: `src/App.vue` lines 16‑21 show these imports.

## Store usage

DXP provides Pinia stores like `useUserStore`, `useAuthStore` and `useProductIdentificationStore`. They have getters and actions for accessing and mutating state. Example usage from `src/store/modules/user/actions.ts`:

```ts
const facilities = await useUserStore().getUserFacilities(userProfile?.partyId, "OMS_FULFILLMENT", isAdminUser)
await useUserStore().getFacilityPreference('SELECTED_FACILITY')
const currentFacility: any = useUserStore().getCurrentFacility
```

Use getters to read data (`getCurrentFacility`) and actions to update or fetch data (`getUserFacilities`, `getFacilityPreference`).

## Components

Commonly used components include:

- **DxpShopifyImg** – displays product images. Used in multiple components such as `CloseTransferOrderModal.vue`.
- **DxpProductIdentifier** – allows selecting the identifier used for product lookup.
- **DxpTimeZoneSwitcher** – lets the user choose a timezone. Emits `timeZoneUpdated`.
- **DxpLanguageSwitcher** – changes the app locale.
- **DxpFacilitySwitcher** – updates the selected facility.
- **DxpProductStoreSelector** – updates the selected product store.
- **DxpAppVersionInfo** – shows build information.
- **DxpOmsInstanceNavigator** – navigates across OMS instances.
- **DxpLogin** – login form used on the `/login` route.

Refer to `src/views/Settings.vue` lines 84‑92 for a usage example that combines several of these components.

To use a component, import it from the package and register it in the `components` block:

```ts
import { DxpTimeZoneSwitcher } from '@hotwax/dxp-components'

export default defineComponent({
  components: { DxpTimeZoneSwitcher }
})
```

Then place it in the template:

```html
<DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />
```

## Translation utility

Use the `translate` function for all user-facing strings. Example from `src/components/Menu.vue`:

```ts
import { translate } from '@hotwax/dxp-components'
...
<ion-label>{{ translate(page.title) }}</ion-label>
```

Messages are defined in JSON files under `src/locales/`.

## Firebase helper

`initialiseFirebaseApp` connects to Firebase for notifications. Example from `src/App.vue` lines 150‑159:

```ts
await initialiseFirebaseApp(
  this.appFirebaseConfig,
  this.appFirebaseVapidKey,
  storeClientRegistrationToken,
  addNotification,
)
```

## Summary

1. Install dependencies and import required components or utilities from `@hotwax/dxp-components`.
2. Use Pinia store composables (`useUserStore`, `useAuthStore`, etc.) to access or update shared state.
3. Register DXP components in your Vue components and use them in templates.
4. Wrap user‑visible strings with `translate()` for localisation support.
5. Initialise Firebase using `initialiseFirebaseApp` when notification support is required.

These steps provide a foundation for adding or using any component from the DXP package in the project.

