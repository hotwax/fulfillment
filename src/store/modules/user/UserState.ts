export default interface UserState {
    token: string;
    current: object | null;
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
}