export interface AgreementType {
    typeLabel: string,
    value: number
}
export const AgreementTypes: Array<AgreementType> = [
    {
        typeLabel: 'Grid',
        value: 1
    },
    {
        typeLabel: 'On-site Generation',
        value: 2
    },
    {
        typeLabel: 'Physical Power Purchase Agreement (PPPA)',
        value: 3
    },
    {
        typeLabel: 'Virtual Power Purchase Agreement (VPPA)',
        value: 4
    },
    {
        typeLabel: 'Utility Green Product',
        value: 5
    },
    {
        typeLabel: 'Renewable Energy Credits (RECs)',
        value: 6
    }
]
