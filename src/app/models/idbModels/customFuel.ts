import { FuelTypeOption } from "src/app/shared/fuel-options/fuelTypeOption";
import { MeterPhase } from "../constantsAndTypes";
import { IdbAccount } from "./account";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbCustomFuel extends FuelTypeOption, IdbEntry {
    id?: number,
    accountId: string,
    date: Date,
    guid: string,
    phase: MeterPhase,
    directEmissionsRate: boolean
}

export function getNewAccountCustomFuel(selectedAccount: IdbAccount): IdbCustomFuel {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        accountId: selectedAccount.guid,
        date: new Date(),
        startingUnit: undefined,
        heatCapacityValue: undefined,
        value: undefined,
        siteToSourceMultiplier: undefined,
        emissionsOutputRate: undefined,
        otherEnergyType: undefined,
        CO2: undefined,
        CH4: undefined,
        N2O: undefined,
        isBiofuel: false,
        phase: 'Gas',
        directEmissionsRate: false,
        isMobile: false,
        isOnRoad: false
    }
}