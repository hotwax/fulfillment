export default interface UserState {
    token: string;
    current: any;
    permissions: any;
    pwaState: any;
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
    newRejectionApiConfig: any;
    partialOrderRejectionConfig: any;
    collateralRejectionConfig: any;
    affectQohConfig: any;
    isShipNowDisabled: boolean;
    isUnpackDisabled: boolean;
    isReservationFacilityFieldEnabled: boolean;
}