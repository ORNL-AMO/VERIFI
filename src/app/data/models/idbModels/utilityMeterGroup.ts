import { MonthlyData } from "../calanderization";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbUtilityMeter } from "./utilityMeter";



export interface IdbUtilityMeterGroup extends IdbEntry {
    facilityId: string,
    accountId: string,
    //data
    groupType: 'Energy' | 'Water' | 'Other',
    name: string,
    description?: string,
    factionOfTotalEnergy?: number,
    totalEnergyUse?: number,
    totalConsumption?: number,
    groupData?: Array<IdbUtilityMeter>,
    combinedMonthlyData?: Array<MonthlyData>,
    visible?: boolean    
}

export function getNewIdbUtilityMeterGroup(type: 'Energy' | 'Water' | 'Other', name: string, facilityId: string, accountId: string): IdbUtilityMeterGroup {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        groupType: type,
        name: name,
        description: undefined,
        factionOfTotalEnergy: undefined,
        visible: true
    }
}