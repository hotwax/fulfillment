# Release 1.6.0

## What's Changed
* Removed: code to get and show atp (#123) by @adityasharma7 in https://github.com/hotwax/fulfillment-pwa/pull/142
* Implemented: infinite scroll on open orders page (#143) by @adityasharma7 in https://github.com/hotwax/fulfillment-pwa/pull/144
* Fixed: Issue with report an issue on in progress page (#146) by @adityasharma7 in https://github.com/hotwax/fulfillment-pwa/pull/147


**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/compare/v1.5.1...v1.6.0


# Release 1.5.1

## What's Changed
* Fixed: shipmentId should be passed instead of complete shipment list for bulk ship orders (#131) by @adityasharma7 in https://github.com/hotwax/fulfillment-pwa/pull/136


**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/compare/v1.5.0...v1.5.1

# Release 1.5.0

## What's Changed
* Improved: show last brokered date for the orders (#126) by @adityasharma7 in https://github.com/hotwax/fulfillment-pwa/pull/133
* Implemented: Lazy load related information as per the data viewed by User (#130) by @adityasharma7 in https://github.com/hotwax/fulfillment-pwa/pull/134
* Implemented: logic to ship order, print shipping label, packing slip and retry shipping label (#131) by @adityasharma7 in https://github.com/hotwax/fulfillment-pwa/pull/135

## New Contributors
* @adityasharma7 made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/133

**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/compare/v1.4.0...v1.5.0

# Release 1.4.0

## What's Changed
* Implemented: support to fetch shipment and shipmentPackage information on completed page and added support for missingLabelImage(#85zryhjxr) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/116
* Fixed: picklist print issue due to wrong index value being passed and added success toast after picklist is created by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/124
* Fixed: issue of unwanted api calls after login, due to change in facility and productStore by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/128
* Improved: logic to lazy load shipment information for inProgress orders(#85zt3q4xz) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/125


**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/compare/v1.3.0...v1.4.0

# Release 1.3.0

## What's Changed
* Card layout adjustments by @dt2patel in https://github.com/hotwax/fulfillment-pwa/pull/111
* Implemented: support to make packing slip, shipping label and print picklist functional(#1xx6rd3) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/107
* Fixed: the issue of empty chips on UI on inProgress page(#119) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/120
* Implemented: support to only allow user to select max 100 orders at once(#85zryr6gv) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/118
* Implemented: support to print customerLetter and shippingLabel from completed page by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/115
* Implemented: support to display carrierPartyName and shipmentMethod desc on completed and open orders page(#85zry800j) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/113

**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/compare/v1.2.0...v1.3.0

# Release 1.2.0

## What's Changed
* Implemented: code to make the data dynamic on the completed page(#1xx6t61) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/94
* Implemented: support to enable searching, applying filters and change the viewSize on completed page(#207m759) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/96
* Implemented: support to make the buttons functional on completed page(#85zrvxjku) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/98
* Fixed: issue of picklist not generated from open order page(#100) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/104
* Updated: oms-api package to latest release(update/oms-version) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/108
* Implemented: support to handle the case when checkInventory api exceeds the limit(#85zrx65t8) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/103
* Implemented: support to use logger(#85zrxrwd7) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/105 and https://github.com/hotwax/fulfillment-pwa/pull/109


**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/compare/v1.1.0...v1.2.0

# Release 1.1.0

## What's Changed
* Fixed: issue of login navigation failed on token expire(#85zruuj2w) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/91
* Implemented: support to make the in-progress page functional(#1y8mznd) by @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/85
* Add spacing to layout by @dt2patel in https://github.com/hotwax/fulfillment-pwa/pull/84 and @ymaheshwari1 in https://github.com/hotwax/fulfillment-pwa/pull/99

## New Contributors
* @dt2patel made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/84

**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/compare/v1.0.0...v1.1.0

# Release 1.0.0

## What's Changed

##  Initial version of the app that comes with the following features
* User should be able to see the open orders
* Create picklist of selected orders and assign pickers
* Fetch specific number of orders and also orders for specific shipment method
* Turn fulfillment on/off from settings page
* Static UI for InProgress and Completed orders page
* Recycle open and InProgress orders from settings page

## New Contributors
* @meet-aniket made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/15
* @azkyakhan made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/20
* @Yashi002 made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/28
* @bashu22tiwari made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/38
* @disha1202 made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/42
* @Nihu-Sharma made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/55
* @rathoreprashant made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/65
* @Mayank909 made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/61
* @shashwatbangar made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/68
* @divyanshugour made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/71
* @k2maan made their first contribution in https://github.com/hotwax/fulfillment-pwa/pull/77

**Full Changelog**: https://github.com/hotwax/fulfillment-pwa/commits/v1.0.0
