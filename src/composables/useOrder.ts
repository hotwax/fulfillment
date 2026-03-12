import { api, commonUtil, logger, translate } from "@common";
import { useOrderStore } from "@/store/order";
import { useUtilStore } from "@/store/util";
import { cogOutline } from 'ionicons/icons';
import { useZebraPrinter } from '@/composables/useZebraPrinter';
import { ShopifyService } from '@common';

export default function useOrder() {
  const orderStore = useOrderStore();
  const utilStore = useUtilStore();
  const zebraPrinter = useZebraPrinter();

  const downloadPicklist = async (picklistId: string) => {
    const resp = await api({
      url: `/poorti/Picklist.csv`,
      method: "GET",
      params: { picklistId },
    }) as any;
    const fileName = `Picklist-${picklistId}.csv`
    await commonUtil.downloadCsv(resp.data, fileName);
  }

  const printPicklist = async (picklistId: string) => {
    try {
      const isPicklistDownloadEnabled = utilStore.isPicklistDownloadEnabled
      if (isPicklistDownloadEnabled) {
        await downloadPicklist(picklistId)
        return;
      }

      const resp = await api({
        url: "/fop/apps/pdf/PrintPicklist",
        method: "GET",
        baseURL: commonUtil.getMaargBaseURL(),
        responseType: "blob",
        params: { picklistId }
      }) as any;

      if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
        throw resp.data;
      }

      const pdfUrl = window.URL.createObjectURL(resp.data);
      try {
        if (ShopifyService.getApp()) {
          ShopifyService.redirect(pdfUrl);
        } else {
          window.open(pdfUrl, "_blank")?.focus();
        }
      }
      catch {
        commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'picklist' }), { icon: cogOutline });
      }
    } catch (err) {
      commonUtil.showToast(translate('Failed to print picklist'))
      logger.error("Failed to print picklist", err)
    }
  }

  const printPackingSlip = async (shipmentIds: Array<string>) => {
    try {
      const resp = await api({
        url: "/fop/apps/pdf/PrintPackingSlip",
        method: "GET",
        baseURL: commonUtil.getMaargBaseURL(),
        params: {
          shipmentId: shipmentIds
        },
        responseType: "blob"
      }) as any;

      if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
        throw resp.data
      }

      const pdfUrl = window.URL.createObjectURL(resp.data);
      try {
        (window as any).open(pdfUrl, "_blank").focus();
      }
      catch {
        commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'packing slip' }), { icon: cogOutline });
      }

    } catch (err) {
      commonUtil.showToast(translate('Failed to print packing slip'))
      logger.error("Failed to load packing slip", err)
    }
  }

  const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string) => {
    try {
      let pdfUrls = shippingLabelPdfUrls;
      if (!pdfUrls || pdfUrls.length == 0) {
        let labelImageType = imageType || "PNG";

        if (!imageType && shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
          labelImageType = await utilStore.fetchLabelImageType(shipmentPackages[0].carrierPartyId);
        }

        const labelImages = [] as Array<string>
        if (labelImageType === "ZPLII") {
          shipmentPackages?.map((shipmentPackage: any) => {
            shipmentPackage.labelImage && labelImages.push(shipmentPackage.labelImage)
          })
          await zebraPrinter.printZplLabels(labelImages);
          return;
        }
        const resp = await api({
          url: "/fop/apps/pdf/PrintLabel",
          method: "GET",
          baseURL: commonUtil.getMaargBaseURL(),
          params: {
            shipmentId: shipmentIds
          },
          responseType: "blob"
        }) as any;

        if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
          throw resp.data;
        }

        const pdfUrl = window.URL.createObjectURL(resp.data);
        pdfUrls = [pdfUrl];
      }
      pdfUrls.forEach((pdfUrl: string) => {
        try {
          (window as any).open(pdfUrl, "_blank").focus();
        }
        catch {
          commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'shipping label' }), { icon: cogOutline });
        }
      })

    } catch (err) {
      commonUtil.showToast(translate('Failed to print shipping label'))
      logger.error("Failed to load shipping label", err)
    }
  }

  const printCustomDocuments = async (internationalInvoiceUrls: Array<string>) => {
    if (!internationalInvoiceUrls || internationalInvoiceUrls.length === 0) {
      return;
    }
    try {
      internationalInvoiceUrls.forEach((url: string) => {
        try {
          (window as any).open(url, "_blank").focus();
        } catch {
          commonUtil.showToast(translate('Unable to open as the browser is blocking pop-ups.', { documentName: 'custom document' }), { icon: cogOutline });
        }
      });
    } catch (err) {
      commonUtil.showToast(translate('Failed to print custom document'));
      logger.error("Failed to load custom document", err);
    }
  }

  const printShippingLabelAndPackingSlip = async (shipmentIds: Array<string>, shipmentPackages: any) => {
    let labelImageType = "PNG";
    if (shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
      labelImageType = await utilStore.fetchLabelImageType(shipmentPackages[0].carrierPartyId);
    }

    if (labelImageType === "ZPLII") {
      await printShippingLabel(shipmentIds, [], shipmentPackages, labelImageType)
      await printPackingSlip(shipmentIds)
      return;
    }

    try {
      const resp = await api({
        url: "/fop/apps/pdf/PrintPackingSlipAndLabel",
        method: "GET",
        baseURL: commonUtil.getMaargBaseURL(),
        params: {
          shipmentId: shipmentIds
        },
        responseType: "blob"
      }) as any;

      if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
        throw resp.data;
      }

      const pdfUrl = window.URL.createObjectURL(resp.data);
      try {
        (window as any).open(pdfUrl, "_blank").focus();
      }
      catch {
        commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'shipping label and packing slip' }), { icon: cogOutline });
      }

    } catch (err) {
      commonUtil.showToast(translate('Failed to print shipping label and packing slip'))
      logger.error("Failed to load shipping label and packing slip", err)
    }
  }

  return {
    downloadPicklist,
    printCustomDocuments,
    printPackingSlip,
    printPicklist,
    printShippingLabel,
    printShippingLabelAndPackingSlip
  }
}
