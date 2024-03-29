export type VehicleCategory = {
    value: number, label: string
}

export const VehicleCategories: Array<VehicleCategory> = [
    {
        value: 1,
        label: 'Material Transport Onsite'
    },
    {
        value: 2,
        label: 'On-Road Vehicle'
    },
    {
        value: 3,
        label: 'Off-Road Vehicles'
    },
    {
        value: 4,
        label: 'Non-Road Vehicles'
    }
];


export interface VehicleCollectionType {
    value: number,
    label: 'Fuel Usage' | 'Mileage'
}

export const VehicleCollectionTypes: Array<VehicleCollectionType> = [
    { value: 1, label: 'Fuel Usage' }, { value: 2, label: 'Mileage' }
]