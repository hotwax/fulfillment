import { commonUtil, logger, translate } from "@common";
import { useUtilStore } from "@/store/util";
import { cogOutline } from "ionicons/icons";
import { useZebraPrinter } from '@/composables/useZebraPrinter';
import { api } from "@common";

export const useTransferOrder = () => {
  const utilStore = useUtilStore();
  const zebraPrinter = useZebraPrinter();

  const printTransferOrderPicklist = async (orderId: string) => {
    try {
      const resp: any = await api({
        method: "get",
        url: `poorti/transferOrders/${orderId}/printPicklist`,
        responseType: "blob",
      })

      if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
        throw resp.data;
      }

      const pdfUrl = window.URL.createObjectURL(resp.data);
      try {
        (window as any).open(pdfUrl, "_blank").focus();
      } catch {
        commonUtil.showToast(
          translate("Unable to open as browser is blocking pop-ups.", {
            documentName: "picklist",
          }),
          { icon: cogOutline }
        );
      }
    } catch (err) {
      commonUtil.showToast(translate("Failed to print picklist"));
      logger.error("Failed to load picklist", err);
    }
  };

  const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string) => {
    try {
      let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
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

        const resp: any = await api({
          method: "get",
          url: "/fop/apps/pdf/PrintLabel",
          params: {
            shipmentId: shipmentIds[0]
          },
          responseType: "blob",
          baseURL: commonUtil.getMaargBaseURL(),
        });

        if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
          throw resp.data;
        }

        const pdfUrl = window.URL.createObjectURL(resp.data);
        pdfUrls = [pdfUrl];
      }

      pdfUrls.forEach((pdfUrl: string) => {
        try {
          (window as any).open(pdfUrl, "_blank").focus();
        } catch {
          commonUtil.showToast(
            translate("Unable to open as browser is blocking pop-ups.", {
              documentName: "shipping label",
            }),
            { icon: cogOutline }
          );
        }
      });
    } catch (err) {
      commonUtil.showToast(translate("Failed to print shipping label"));
      logger.error("Failed to load shipping label", err);
    }
  };

  return {
    printTransferOrderPicklist,
    printShippingLabel
  }
}
