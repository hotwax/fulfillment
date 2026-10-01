/**
 * Fulfillment sync worker: the accxui polling harness with the shared reference domain and the
 * fulfillment domains registered.
 *
 * Deep imports only: this is a worker entry, and the `@common` barrels pull in `vue`.
 */

import { exposeWorkerHarness } from "@common/db/sync/pollingWorkerHarness";
import { registerDomains } from "@common/db/sync/syncRegistry";
import { FULFILLMENT_SYNC_DOMAINS } from "./domains";
import { getFulfillmentDb } from "./fulfillmentDb";

registerDomains(FULFILLMENT_SYNC_DOMAINS);
exposeWorkerHarness(getFulfillmentDb);
