import { logger } from "@common";

const getDefaultPrinter = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!window.BrowserPrint) return reject("BrowserPrint not loaded");

    window.BrowserPrint.getDefaultDevice(
      "printer",
      (device: any) => resolve(device),
      (err: any) => reject(err)
    );
  });
}

const printZPL = async (zplCommand: string): Promise<void> => {
  const device = await getDefaultPrinter();
  return new Promise((resolve, reject) => {
    device.send(
      zplCommand,
      () => resolve(),
      (err: any) => reject(err)
    );
  });
}

const printStatus = async (): Promise<void> => {
  const device = await getDefaultPrinter();
  const zebraPrinter = new window.Zebra.Printer(device);
  zebraPrinter.getStatus(
    (status: any) => logger.log(status.getMessage()),
    (err: any) => logger.error(err)
  );
}

const printImage = async (url: string): Promise<void> => {
  const device = await getDefaultPrinter();
  const zebraPrinter = new window.Zebra.Printer(device);
  zebraPrinter.printImageAsLabel(
    url,
    () => logger.log("Image sent to printer"),
    (err: any) => logger.error(err)
  );
}

const printZplLabels = async (zplBase64Labels: string[]): Promise<void> => {
  if (!zplBase64Labels || zplBase64Labels.length === 0) {
    logger.warn('No ZPL labels to print.');
    return;
  }

  for (const base64Zpl of zplBase64Labels) {
    try {
      const isBase64 = (str: string) => /^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0;

      const decodedZpl = isBase64(base64Zpl) ? atob(base64Zpl) : base64Zpl;
      await printZPL(decodedZpl);
    } catch (err) {
      logger.error('Failed to print decoded ZPL label:', err);
    }
  }
}

export const useZebraPrinter = () => {
  return {
    getDefaultPrinter,
    printZPL,
    printStatus,
    printImage,
    printZplLabels
  }
}
