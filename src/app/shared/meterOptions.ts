export const ScopeOptions: Array<ScopeOption> = [
    {
        optionLabel: 'Stationary',
        value: 1,
        scope: 'Scope 1'
    },
     {
        optionLabel: 'Mobile',
        value: 2,
        scope: 'Scope 1'
    },
    {
        optionLabel: 'Purchased Electricity',
        value: 3,
        scope: 'Scope 2'
    },
    {
        optionLabel: 'Other',
        value: 4,
        scope: 'Scope 2'
    }
]

export interface ScopeOption {
    optionLabel: string, 
    value: number, 
    scope: 'Scope 1' | 'Scope 2'
}


export const AgreementTypes: Array<AgreementType> = [
    {
        typeLabel: 'Grid',
        value: 1
    },
    {
        typeLabel: 'Self-generated',
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


export interface AgreementType {
    typeLabel: string,
    value: number
}