export interface Month {
    name: string,
    abbreviation: string,
    monthNumValue: number
}


export const Months: Array<Month> = [
    { name: 'January', abbreviation: 'Jan', monthNumValue: 0 },
    { name: 'February', abbreviation: 'Feb', monthNumValue: 1 },
    { name: 'March', abbreviation: 'Mar', monthNumValue: 2 },
    { name: 'April', abbreviation: 'Apr', monthNumValue: 3 },
    { name: 'May', abbreviation: 'May', monthNumValue: 4 },
    { name: 'June', abbreviation: 'Jun', monthNumValue: 5 },
    { name: 'July', abbreviation: 'Jul', monthNumValue: 6 },
    { name: 'August', abbreviation: 'Aug', monthNumValue: 7 },
    { name: 'September', abbreviation: 'Sep', monthNumValue: 8 },
    { name: 'October', abbreviation: 'Oct', monthNumValue: 9 },
    { name: 'November', abbreviation: 'Nov', monthNumValue: 10 },
    { name: 'December', abbreviation: 'Dec', monthNumValue: 11 }
]