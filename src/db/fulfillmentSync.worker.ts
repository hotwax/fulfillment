/**
 * Fulfillment sync worker: the accxui polling harness with the shared reference domains and the
 * fulfillment domains registered. Registration order is tick order.
 */

import { registerCommonSeedDomains } from "@common/db/domains/commonSeedDomains";
import { exposeWorkerHarness } from "@common/db/sync/pollingWorkerHarness";
import { registerFulfillmentDomains } from "./domains";
import { getFulfillmentDb } from "./fulfillmentDb";

registerCommonSeedDomains(getFulfillmentDb);
registerFulfillmentDomains(getFulfillmentDb);
exposeWorkerHarness(getFulfillmentDb);
