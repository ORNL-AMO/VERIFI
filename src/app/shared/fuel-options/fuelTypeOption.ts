export interface FuelTypeOption {
    startingUnit: string,
    heatCapacityValue: number
    value: string,
    siteToSourceMultiplier: number,
    emissionsOutputRate: number,
    otherEnergyType?: 'Hot Water' | 'Steam' | 'Compressed Air' | 'Chilled Water';
    CO2: number,
    CH4: number,
    N2O: number,
    isBiofuel?: boolean
}