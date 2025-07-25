# Fulfillment Extensions with Module Federation

This project supports client specific extensions that are loaded at runtime via [Module Federation](https://webpack.js.org/concepts/module-federation/). The extensions live in a separate bundle (referred to as `fulfillment_extensions`) and expose Vue components that are injected in various pages of the app.

The following extensions are currently supported:

- **ProductCategoryFilter** on the Open Orders page
- **PrintDocument** on the Order Detail page
- **OrderInvoice** on the Order Detail page
- **OrderLookupAdditionalDetailItem** on the Order Lookup Detail page

This document describes how these extensions are configured and how they are consumed by the application.

## 1. Configure the remote entry

Provide the URL of the remote bundle in the `.env` file using `VUE_APP_REMOTE_ENTRY`. The example file contains a sample value:

```bash
VUE_APP_REMOTE_ENTRY="https://dev-fulfillment-extensions.firebaseapp.com/remoteEntry.js"
```

## 2. Initialize Module Federation

When the application mounts, the module federation runtime registers the remote name `fulfillment_extensions` using the entry specified above:

```ts
init({
  name: "fulfillment",
  remotes: [
    {
      name: "fulfillment_extensions",
      entry: process.env.VUE_APP_REMOTE_ENTRY as string,
    }
  ],
});
```
Source: [`src/App.vue`](../src/App.vue) lines 118‑127.

## 3. Loading a remote component

`useDynamicImport` is a small helper located at [`src/utils/moduleFederation.ts`](../src/utils/moduleFederation.ts). It wraps `loadRemote` from `@module-federation/runtime` and returns a Vue component reference:

```ts
const useDynamicImport = ({ scope, module }: any) => {
  if (!module || !scope) return;

  const loadComponent = async () => {
    try {
      const { default: Component } = await loadRemote(`${scope}/${module}`) as any;
      return shallowRef(Component)
    } catch (error) {
      console.error(`Error loading remote module ${scope}/${module}:`, error);
    }
  };

  return loadComponent();
}
```

Typescript declares the remote modules via `fulfillment_extensions/*` in [`src/shims-vue.d.ts`](../src/shims-vue.d.ts).

## 4. Consuming the extensions

Each page loads the relevant remote components in its lifecycle hook. The `instance` prefix is derived from `instanceUrl` and forms the module name `<instance>_<ComponentName>`.

### Open Orders

`OpenOrders.vue` loads the `ProductCategoryFilter` extension in `ionViewWillEnter` and renders it using the `<Component>` helper:

```ts
const instance = this.instanceUrl.split("-")[0]
  .replace(/^(https|http):\/\//, "")
  .replace(/\/api.*/, "")
  .replace(/:.*/, "")
this.productCategoryFilterExt = await useDynamicImport({
  scope: "fulfillment_extensions",
  module: `${instance}_ProductCategoryFilter`
});
```
Source: [`src/views/OpenOrders.vue`](../src/views/OpenOrders.vue) lines 435‑443.

The component is rendered inside the page template:

```html
<Component
  :is="productCategoryFilterExt"
  :orderQuery="openOrders.query"
  :currentFacility="currentFacility"
  :currentEComStore="currentEComStore"
  @updateOpenQuery="updateOpenQuery" />
```
Source: [`src/views/OpenOrders.vue`](../src/views/OpenOrders.vue) lines 34‑38.

### Order Detail

`OrderDetail.vue` loads two extensions in `mounted()`:

```ts
const instance = this.instanceUrl.split("-")[0]
  .replace(/^(https|http):\/\//, "")
  .replace(/\/api.*/, "")
  .replace(/:.*/, "")
this.printDocumentsExt = await useDynamicImport({
  scope: "fulfillment_extensions",
  module: `${instance}_PrintDocument`
})
this.orderInvoiceExt = await useDynamicImport({
  scope: "fulfillment_extensions",
  module: `${instance}_OrderInvoice`
})
```
Source: [`src/views/OrderDetail.vue`](../src/views/OrderDetail.vue) lines 580‑584.

The components are displayed within the actions section:

```html
<Component
  :is="printDocumentsExt"
  :category="category"
  :order="order"
  :currentFacility="currentFacility"
  :hasMissingInfo="order.missingLabelImage" />

<Component
  v-if="hasPermission(Actions.APP_INVOICING_STATUS_VIEW)"
  :is="orderInvoiceExt"
  :category="category"
  :order="order"
  :userProfile="userProfile"
  :maargBaseUrl="getMaargBaseUrl"
  :userToken="getUserToken" />
```
Sources: [`src/views/OrderDetail.vue`](../src/views/OrderDetail.vue) lines 182‑186 and 304‑306.

### Order Lookup Detail

`OrderLookupDetail.vue` loads the `OrderLookupAdditionalDetailItem` extension during `ionViewWillEnter`:

```ts
const instance = this.instanceUrl.split("-")[0]
  .replace(/^(https|http):\/\//, "")
  .replace(/\/api.*/, "")
  .replace(/:.*/, "")
this.additionalDetailItemExt = await useDynamicImport({
  scope: "fulfillment_extensions",
  module: `${instance}_OrderLookupAdditionalDetailItem`
})
```
Source: [`src/views/OrderLookupDetail.vue`](../src/views/OrderLookupDetail.vue) lines 343‑350.

The extension is placed inside the order details card:

```html
<Component
  :is="additionalDetailItemExt"
  :order="order"
  :invoicingFacilityId="invoicingFacility.facilityId" />
```
Source: [`src/views/OrderLookupDetail.vue`](../src/views/OrderLookupDetail.vue) lines 180‑186.

## 5. Developing a new extension

1. **Create a remote component** in the `fulfillment_extensions` project. The component should be exported as `${instance}_<ComponentName>` so that the main app can request it based on the current instance.
2. **Build the remote bundle** so it exposes `remoteEntry.js` and deploy it to a static host.
3. **Update the `.env` file** in this repository with the URL to the remote entry (`VUE_APP_REMOTE_ENTRY`).
4. **Add the component usage** to the desired page following the examples above. Load it via `useDynamicImport` and render it with `<Component :is="..." />`.
5. Run `npm install` and start the app using `ionic serve`. The extension will be fetched on demand from the remote bundle.

This mechanism allows different clients to provide their own UI components without modifying the core application.
