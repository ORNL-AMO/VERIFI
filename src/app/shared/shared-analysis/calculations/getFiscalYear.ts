import { IdbAccount, IdbFacility } from "src/app/models/idb";

export function getFiscalYear(date: Date, facilityOrAccount: IdbFacility | IdbAccount): number {
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        return date.getUTCFullYear();
    } else {
        if (facilityOrAccount.fiscalYearCalendarEnd) {
            if (date.getUTCMonth() >= facilityOrAccount.fiscalYearMonth) {
                return date.getUTCFullYear() + 1;
            } else {
                return date.getUTCFullYear();
            }
        } else {
            if (date.getUTCMonth() >= facilityOrAccount.fiscalYearMonth) {
                return date.getUTCFullYear();
            } else {
                return date.getUTCFullYear() - 1;
            }
        }
    }
}