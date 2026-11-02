// The staff who can pick, for the Assign Pickers modal. Read from Solr, the same source the modal queried each time it opened,
// so the modal opens with the list already here and the sync keeps it current.

import { workerPost } from "@common/core/workerRemoteApi";
import { diffStaleKeys, entityKeyOf, projectRows } from "@common/db/storage/projection";
import { defineSyncDomain } from "@common/db/sync/defineSyncDomain";
import type { DbKey, DbRow, SyncContext } from "@common/db/types";
import { fulfillmentDb, getFulfillmentDb } from "../fulfillmentDb";
import { changedRows } from "./rowSync";

export const PICKERS_DOMAIN = "pickers";

const pickerEntity = fulfillmentDb.entities.pickers;
const PICKER_ROWS = 500;

// The body the search endpoint takes: params, a query and a filter string, as the products domain sends it.
export const pickerQuery = () => ({
  params: { rows: PICKER_ROWS, start: 0, sort: "firstName asc" },
  query: "*:*",
  filter: "docType: EMPLOYEE AND statusId: PARTY_ENABLED AND WAREHOUSE_PICKER_role: true"
});

export const pickersDomain = defineSyncDomain({
  name: PICKERS_DOMAIN,
  label: "Pickers",
  syncClass: "A",
  table: "pickers",

  async sync(ctx: SyncContext) {
    const db = getFulfillmentDb(ctx.omsInstance);
    const response = await workerPost(ctx, "admin/search/query", pickerQuery());
    const docs: any[] = response?.response?.response?.docs ?? response?.response?.docs ?? response?.docs ?? [];
    const fresh = projectRows(docs, pickerEntity, Date.now());
    // A full page means more staff than were read, so nothing is pruned.
    const complete = docs.length < PICKER_ROWS;
    const keyOf = (row: DbRow) => entityKeyOf(row, pickerEntity) as DbKey;

    return db.transaction("rw", ["pickers"], async () => {
      const existing = await db.table<DbRow, DbKey>("pickers").toArray();
      const staleKeys = complete && fresh.length ? diffStaleKeys(existing.map(keyOf), fresh.map(keyOf)) : [];
      if(staleKeys.length) {await db.table("pickers").bulkDelete(staleKeys);}
      const changed = changedRows(fresh, existing, pickerEntity);
      if(changed.length) {await db.table("pickers").bulkPut(changed);}

      return changed.length;
    });
  }
});
