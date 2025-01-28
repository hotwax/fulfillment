export default interface UserState {
    token: string;
    current: any;
    permissions: any;
    pwaState: any;
    omsRedirectionInfo: {
        url: string;
        token: string;
    }
    instanceUrl: string;
    preference: {
        printShippingLabel: boolean,
        printPackingSlip: boolean
    };
    fieldMappings: object | null;
    currentMapping: {
        id: string;
        mappingType: string;
        name: string;
        value: object;
    };
    notifications: any;
    notificationPrefs: any;
    firebaseDeviceId: string;
    hasUnreadNotifications: boolean;
    allNotificationPrefs: any;
    newRejectionApiConfig: any;
    partialOrderRejectionConfig: any;
    collateralRejectionConfig: any;
    affectQohConfig: any;
    isShipNowDisabled: boolean;
    isUnpackDisabled: boolean;
}