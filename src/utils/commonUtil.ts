import { translate } from '@common';
import { hasError } from '@common/utils/commonUtil';
import { useUserStore as useAppUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";
import { JsonToCsvOption } from '@/types';
import { Plugins } from '@capacitor/core';
import { toastController } from '@ionic/vue';
import { saveAs } from 'file-saver';
import { DateTime } from 'luxon';
import Papa from 'papaparse';
import Encoding from 'encoding-japanese';

const showToast = async (message: string, options?: any) => {
  const config = {
    message,
    ...options
  } as any;

  if (!options?.position) {
    config.position = 'bottom';
  }
  if (options?.canDismiss) {
    config.buttons = [
      {
        text: translate('Dismiss'),
        role: 'cancel',
      },
    ]
  }
  if (!options?.manualDismiss) {
    config.duration = 3000;
  }

  const toast = await toastController.create(config)
  // present toast if manual dismiss is not needed
  return !options?.manualDismiss ? toast.present() : toast
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { setZone: true }).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

const formatDate = (value: any, inFormat?: string, outFormat?: string) => {
  // TODO Make default format configurable and from environment variables
  if (inFormat) {
    return DateTime.fromFormat(value, inFormat).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
  }
  return DateTime.fromISO(value).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
}

const formatUtcDate = (value: any, outFormat: string) => {
  // TODO Make default format configurable and from environment variables
  // TODO Fix this setDefault should set the default timezone instead of getting it everytiem and setting the tz
  const userStore = useAppUserStore();
  return DateTime.fromISO(value, { zone: 'utc' }).setZone(userStore.current?.userTimeZone).toFormat(outFormat ? outFormat : 'MM-dd-yyyy')
}

const getFeatures = (productFeatures: any) => {
  const features = productFeatures
    ?.sort((firstFeature: string, secondFeature: string) => firstFeature.split('/')[0].localeCompare(secondFeature.split('/')[0]))
    ?.map((feature: string) => feature.substring(feature.indexOf("/") + 1)) // Not using split method as we may have features with value as `Size/N/S` and thus the only value returned is N when accessing 1st index considering that 1st index will have actual feature value, so we need to have some additional handling in case of split method
    ?.join(' ');
  return features || "";
}

const downloadCsv = (csv: any, fileName: any) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName ? fileName : "default.csv");
  return blob;
};

const jsonToCsv = (file: any, options: JsonToCsvOption = {}) => {
  const csv = Papa.unparse(file, {
    ...options.parse
  });
  const encoding = {
    type: String,
    default: "utf-8",
    ...options.encode
  };

  let buffer: Uint8Array;
  let blob: Blob;
  if (encoding.default === 'shift-jis') {
    buffer = new Uint8Array(Encoding.convert(Encoding.stringToCode(csv), 'SJIS'));
    blob = new Blob([buffer as any], { type: `application/csv;charset=${encoding.default}` });

  } else {
    blob = new Blob([csv], { type: `application/csv;charset=${encoding.default}` });
  }

  if (options.download) {
    saveAs(blob, options.name ? options.name : "default.csv");
  }
  return blob;
}

const copyToClipboard = async (value: string, text?: string) => {
  const { Clipboard } = Plugins;

  await Clipboard.write({
    string: value,
  }).then(() => {
    text ? showToast(translate(text)) : showToast(translate("Copied", { value }));
  });
}

const getIdentificationId = (identifications: any, id: string) => {
  let externalId = ''
  if (identifications) {
    const externalIdentification = identifications.find((identification: any) => identification.startsWith(id))
    const externalIdentificationSplit = externalIdentification ? externalIdentification.split('/') : [];
    externalId = externalIdentificationSplit[1] ? externalIdentificationSplit[1] : '';
  }
  return externalId;
}

const formatPhoneNumber = (countryCode: string | null, areaCode: string | null, contactNumber: string | null) => {
  if (countryCode && areaCode) {
    return `+${countryCode}-${areaCode}-${contactNumber}`;
  } else if (countryCode) {
    return `+${countryCode}-${contactNumber}`;
  } else {
    return contactNumber;
  }
}


const generateInternalId = (name: string) => {
  return name.trim().toUpperCase().split(' ').join('_');
}

const sortItems = (items: any, sortByField: any) => {
  items.sort((firstMethod: any, secondMethod: any) => {
    if (firstMethod[sortByField] === null && secondMethod[sortByField] !== null) {
      return 1;
    } else if (firstMethod[sortByField] !== null && secondMethod[sortByField] === null) {
      return -1;
    } else {
      return firstMethod[sortByField] - secondMethod[sortByField];
    }
  });
}

const isValidDeliveryDays = (deliveryDays: any) => {
  // Regular expression pattern for a valid delivery days
  // Allow only positive integers (no decimals, no zero, no negative)
  const delieveryDaysPattern = /^(0*[1-9]\d*)$/;
  return delieveryDaysPattern.test(deliveryDays);
}

const isValidCarrierCode = (trackingCode: any) => {
  // Regular expression pattern for a valid tracking code
  const trackingCodePattern = /^[a-zA-Z0-9]*$/;
  return trackingCodePattern.test(trackingCode);
}

const isPdf = (url: any) => {
  const pdfUrlPattern = /\.pdf(\?.*)?$/;
  return url && pdfUrlPattern.test(url.toLowerCase());
}

const currentSymbol: any = {
  "USD": "$",
  "EUR": "€",
  "JPY": "¥"
}

const formatCurrency = (amount: any, code: string) => {
  return `${currentSymbol[code] || code || "$"}${amount || 0}`
}

const getColorByDesc = (desc: string) => ({
  "Approved": "primary",
  "Authorized": "medium",
  "Cancelled": "danger",
  "Completed": "success",
  "Created": "medium",
  "Declined": "danger",
  "Held": "warning",
  "Not-Authorized": "warning",
  "Not-Received": "warning",
  "Pending": "warning",
  "Received": "success",
  "Refunded": "success",
  "Settled": "success",
  "default": "medium"
} as any)[desc]

const dateOrdinalSuffix = {
  1: 'st',
  21: 'st',
  31: 'st',
  2: 'nd',
  22: 'nd',
  3: 'rd',
  23: 'rd'
} as any

const getCurrentFacilityId = () => {
  const currentFacility: any = useAppUserStore().getCurrentFacility;
  return currentFacility?.facilityId
}

const getProductStoreId = () => {
  const currentEComStore: any = useAppUserStore().getCurrentEComStore;
  return currentEComStore.productStoreId
};

function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const suffix = dateOrdinalSuffix[dateTime.day] || "th"
  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

const hasWebcamAccess = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    return true;
  } catch {
    return false;
  }
}

const parseCsv = async (file: File, options?: any) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results: any) {
        if (results.errors.length) {
          reject(results.error)
        } else {
          resolve(results.data)
        }
      },
      ...options
    });
  })
}

/**
 * Returns true if the query object contains any active filters, excluding specified fields; 
 * add future fields to `excludedFields` to ignore them in the check.
 */
const hasActiveFilters = (query: any): boolean => {
  const excludedFields = ["viewSize", "viewIndex", "queryString", "hideLoader"];
  return Object.keys(query).some((key: string) =>
    !excludedFields.includes(key) && (Array.isArray(query[key]) ? query[key].length : query[key].trim())
  );
}

const getFacilityFilter = (value: any): any => {
  const utilStore = useUtilStore();
  const isReservationFacilityFieldEnabled = utilStore.isReservationFacilityFieldEnabled;
  const facilityFilter = {} as any;
  facilityFilter[isReservationFacilityFieldEnabled ? "reservationFacilityId" : "facilityId"] = { value }
  return facilityFilter
}

const parseBooleanSetting = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;

  const normalizedValue = value.trim().toLowerCase();
  if (["true", "1", "y", "yes"].includes(normalizedValue)) return true;
  if (["false", "0", "n", "no", ""].includes(normalizedValue)) return false;

  try {
    return parseBooleanSetting(JSON.parse(value));
  } catch {
    return false;
  }
}

export const getProductIdentificationValue = (productIdentifier: string, product: any) => {
  // handled this case as on page load initially the data is not available, so not to execute furthur code
  // untill product is not available
  if (!Object.keys(product).length) {
    return;
  }

  let value = product[productIdentifier]

  // considered that the goodIdentification will always have values in the format "productIdentifier/value" and there will be no entry like "productIdentifier/"
  const identification = product['goodIdentifications']?.find((identification: string) => identification.startsWith(productIdentifier + "/"))

  if (identification) {
    const goodIdentification = identification.split('/')
    value = goodIdentification[1]
  }

  return value;
}

// TimeZone format = 04:16 PM EDT
const getCurrentTime = (zone: string, format = 't ZZZZ') => {
  return DateTime.now().setZone(zone).toFormat(format)
}

export const commonUtil = {
  copyToClipboard,
  downloadCsv,
  formatCurrency,
  formatDate,
  formatPhoneNumber,
  formatUtcDate,
  generateInternalId,
  getCurrentFacilityId,
  getFacilityFilter,
  getFeatures,
  getProductIdentificationValue,
  getProductStoreId,
  getColorByDesc,
  getDateWithOrdinalSuffix,
  getIdentificationId,
  getCurrentTime,
  handleDateTimeInput,
  hasActiveFilters,
  isValidDeliveryDays,
  isValidCarrierCode,
  isPdf,
  showToast,
  sortItems,
  hasError,
  jsonToCsv,
  hasWebcamAccess,
  parseCsv,
  parseBooleanSetting
}
