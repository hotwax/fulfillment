# Fulfillment extensions

Client-specific UI is not built into this app. It lives in
[hotwax-fulfillment-extensions](https://github.com/hotwax/hotwax-fulfillment-extensions), a separate bundle
that this app loads at runtime with [Module Federation](https://module-federation.io/). A page asks for a
component by name; if the bundle has one for the current OMS instance it renders, otherwise nothing does.

## Extension slots

| Slot | Page | Loaded in | Props passed |
|---|---|---|---|
| `OrderInvoice` | `src/views/OrderDetail.vue` | `onMounted` | `category`, `order`, `userProfile` (the user profile plus `facilities`) |
| `OrderLookupAdditionalDetailItem` | `src/views/OrderLookupDetail.vue` | `onIonViewWillEnter` | `order`, `invoicingFacilityId` |

`OrderInvoice` only renders for users with the `APP_INVOICING_STATUS_VIEW` permission.

These props are the contract with the extensions repo: renaming or dropping one breaks every extension
that reads it, so change both repos together.

## How it is wired

1. **Remote entry.** `VITE_REMOTE_ENTRY` in `.env` is the URL of the extensions bundle's `remoteEntry.js`
   (see `.env.example`).
2. **Registration.** `src/App.vue` registers the remote on mount:

   ```ts
   init({
     name: "fulfillment",
     remotes: [{ name: "fulfillment_extensions", entry: import.meta.env.VITE_REMOTE_ENTRY as string, type: "module" }]
   });
   ```

3. **Shared libraries.** `vite.config.ts` uses `@module-federation/vite` and shares `vue`, `vue-router`,
   `pinia`, `@ionic/*` and `vue-logger-plugin` as singletons, so an extension runs on the app's instances.
   `src/shims-vue.d.ts` declares `fulfillment_extensions/*` for TypeScript.
4. **Loading.** A page derives the instance name from the OMS URL and asks for `<instance>_<Slot>` with
   `moduleFederationUtil.useDynamicImport` from `@common`:

   ```ts
   const orderInvoiceExt = shallowRef(null as any);

   onMounted(async () => {
     const instance = commonUtil.getOmsURL().split("-")[0].replace(new RegExp("^(https|http)://"), "").replace(new RegExp("/api.*"), "").replace(new RegExp(":.*"), "");
     orderInvoiceExt.value = await moduleFederationUtil.useDynamicImport({ scope: "fulfillment_extensions", module: `${instance}_OrderInvoice` });
   });
   ```

   For `https://adoc-uat.hotwax.io/api/` the instance is `adoc`, so the page loads `adoc_OrderInvoice`.
   A missing module is logged and resolves to `undefined`, and `<Component :is="undefined" />` renders
   nothing.
5. **Rendering.** The template renders the result with Vue's dynamic component:

   ```html
   <Component :is="orderInvoiceExt" :category="props.category" :order="order" :userProfile="userProfileWithFacilities" />
   ```

## Adding an extension for an instance

In the extensions repo, add `src/modules/<instance>/<Slot>.vue`. Its `vite.config.ts` exposes every file
under `src/modules` as `<folder>_<file>`, so `src/modules/adoc/OrderInvoice.vue` becomes
`adoc_OrderInvoice`. Accept the props listed for the slot above, then build and deploy the bundle. No change
is needed in this app.

## Adding a new slot

1. In the page, keep a `shallowRef` for the component, load `<instance>_<NewSlot>` as shown above, and render
   it with `<Component :is="..." />` where the extension should appear.
2. Decide the props the slot passes and add a row to the table above.
3. Add the component for each instance that needs it in the extensions repo.

## Running locally

Run both apps from the `accxui` workspace root:

```bash
pnpm --filter fulfillment-extensions dev   # serves the remote on http://localhost:8101
pnpm --filter fulfillment dev
```

Point the app at the local remote in `apps/fulfillment/.env`:

```bash
VITE_REMOTE_ENTRY="http://localhost:8101/remoteEntry.js"
```

The extension only loads when you log in to an OMS whose instance name matches a folder under
`src/modules`.
