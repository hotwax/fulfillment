export default interface UserState {
    token: string;
    current: any;
    permissions: any;
    pwaState: any;
    currentFacility: object;
    instanceUrl: string;
    currentEComStore: object;
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
    partialOrderRejectionConfig: any;
}