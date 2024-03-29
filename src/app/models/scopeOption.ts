export interface ScopeOption {
    optionLabel: string,
    value: number,
    scope: 'Scope 1' | 'Scope 2' | 'Scope'
}

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
    },
    {
        optionLabel: 'Fugitive',
        value: 5,
        scope: 'Scope 1'
    },
    {
        optionLabel: 'Process',
        value: 6,
        scope: 'Scope 1'
    },
    {
        optionLabel: 'N/A',
        value: 100,
        scope: 'Scope'
    }
]
