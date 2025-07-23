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
    notifications: any;
    notificationPrefs: any;
    firebaseDeviceId: string;
    hasUnreadNotifications: boolean;
    allNotificationPrefs: any;
    partialOrderRejectionConfig: any;
    collateralRejectionConfig: any;
    affectQohConfig: any;
    isShipNowDisabled: boolean;
    isUnpackDisabled: boolean;
    isReservationFacilityFieldEnabled: boolean;
    isExternal: boolean;
}