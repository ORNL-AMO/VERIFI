import { AccountBackup } from "src/app/shared/helper-services/backup-data.service";

export const ExampleAccount: AccountBackup = {
    "account": {
        "name": "Better Plants Partner",
        "city": "Oak Ridge",
        "state": "TENNESSEE",
        "zip": "37830",
        "country": "US",
        "address": "123 First St.",
        "size": 0,
        "naics1": "-28",
        "naics2": "-282",
        "naics3": "-2828",
        "notes": "",
        "img": "https://placehold.it/50x50",
        "unitsOfMeasure": "Custom",
        "energyUnit": "MMBtu",
        "volumeLiquidUnit": "gal",
        "volumeGasUnit": "SCF",
        "massUnit": "lb",
        "sustainabilityQuestions": {
            "energyReductionGoal": true,
            "energyReductionPercent": 25,
            "energyReductionBaselineYear": 2015,
            "energyReductionTargetYear": 2025,
            "energyIsAbsolute": true,
            "greenhouseReductionGoal": false,
            "greenhouseReductionPercent": 0,
            "greenhouseReductionBaselineYear": 0,
            "greenhouseReductionTargetYear": 0,
            "greenhouseIsAbsolute": true,
            "renewableEnergyGoal": false,
            "renewableEnergyPercent": 0,
            "renewableEnergyBaselineYear": 0,
            "renewableEnergyTargetYear": 0,
            "wasteReductionGoal": false,
            "wasteReductionPercent": 0,
            "wasteReductionBaselineYear": 0,
            "wasteReductionTargetYear": 0,
            "wasteIsAbsolute": true,
            "waterReductionGoal": false,
            "waterReductionPercent": 0,
            "waterReductionBaselineYear": 0,
            "waterReductionTargetYear": 0,
            "waterIsAbsolute": true
        },
        "fiscalYear": "calendarYear",
        "fiscalYearMonth": 0,
        "fiscalYearCalendarEnd": true,
        "setupWizard": false,
        "setupWizardComplete": true,
        "energyIsSource": true,
        "id": 7,
        "emissionsOutputRate": 955.587,
        "contactEmail": undefined,
        "contactName": undefined,
        "contactPhone": undefined
    },
    "facilities": [
        {
            "facility": {
                "accountId": 7,
                "name": "Better Facility East",
                "country": "US",
                "city": "Wrightstown",
                "state": "WISCONSIN",
                "zip": "54180",
                "address": "456 Second St.",
                "naics1": '-28',
                "naics2": '-282',
                "naics3": '-2828',
                "notes": null,
                "unitsOfMeasure": "Custom",
                "energyUnit": "MMBtu",
                "volumeLiquidUnit": "gal",
                "volumeGasUnit": "SCF",
                "massUnit": "lb",
                "sustainabilityQuestions": {
                    "energyReductionGoal": true,
                    "energyReductionPercent": 25,
                    "energyReductionBaselineYear": 2015,
                    "energyReductionTargetYear": 2025,
                    "energyIsAbsolute": true,
                    "greenhouseReductionGoal": false,
                    "greenhouseReductionPercent": 0,
                    "greenhouseReductionBaselineYear": 0,
                    "greenhouseReductionTargetYear": 0,
                    "greenhouseIsAbsolute": true,
                    "renewableEnergyGoal": false,
                    "renewableEnergyPercent": 0,
                    "renewableEnergyBaselineYear": 0,
                    "renewableEnergyTargetYear": 0,
                    "wasteReductionGoal": false,
                    "wasteReductionPercent": 0,
                    "wasteReductionBaselineYear": 0,
                    "wasteReductionTargetYear": 0,
                    "wasteIsAbsolute": true,
                    "waterReductionGoal": false,
                    "waterReductionPercent": 0,
                    "waterReductionBaselineYear": 0,
                    "waterReductionTargetYear": 0,
                    "waterIsAbsolute": true
                },
                "fiscalYear": "calendarYear",
                "fiscalYearMonth": 0,
                "fiscalYearCalendarEnd": true,
                "energyIsSource": true,
                "id": 9,
                "emissionsOutputRate": 681.57,
                "color": "#0c7e0e",
                "contactEmail": undefined,
                "contactName": undefined,
                "contactPhone": undefined
            },
            "meters": [
                {
                    "meter": {
                        "facilityId": 9,
                        "accountId": 7,
                        "groupId": 10,
                        "meterNumber": "BP43756",
                        "accountNumber": 456,
                        "siteToSource": 3,
                        "name": "Electricity",
                        "supplier": "ACME Electric",
                        "source": "Electricity",
                        "group": "group 1",
                        "startingUnit": "kWh",
                        "energyUnit": "kWh",
                        "visible": true,
                        "id": 47,
                        "meterReadingDataApplication": "backward",
                        "emissionsOutputRate": 681.57
                    },
                    "meterData": [
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2015-12-18T05:00:00.000Z"),
                            "totalEnergyUse": 1238631,
                            "totalCost": 93745.97,
                            "checked": false,
                            "totalDemand": 4978,
                            "basicCharge": 210,
                            "supplyBlockCharge": 35602.01,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 24890.88,
                            "utilityTax": 1793.08,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2377
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-01-18T05:00:00.000Z"),
                            "totalEnergyUse": 1425750,
                            "totalCost": 106168.37,
                            "checked": false,
                            "totalDemand": 5611,
                            "basicCharge": 210,
                            "supplyBlockCharge": 44621.15,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 28056.53,
                            "utilityTax": 2030.68,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2378
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-02-17T05:00:00.000Z"),
                            "totalEnergyUse": 1493785,
                            "totalCost": 103487.14,
                            "checked": false,
                            "totalDemand": 4429,
                            "basicCharge": 210,
                            "supplyBlockCharge": 47900.44,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22147.3,
                            "utilityTax": 1979.4,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2379
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-03-16T04:00:00.000Z"),
                            "totalEnergyUse": 1288730,
                            "totalCost": 91800.32,
                            "checked": false,
                            "totalDemand": 4114,
                            "basicCharge": 210,
                            "supplyBlockCharge": 38016.79,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20567.67,
                            "utilityTax": 1755.87,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2380
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-04-14T04:00:00.000Z"),
                            "totalEnergyUse": 1313542,
                            "totalCost": 95696.98,
                            "checked": false,
                            "totalDemand": 4639,
                            "basicCharge": 210,
                            "supplyBlockCharge": 39212.72,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 23193.85,
                            "utilityTax": 1830.4,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2381
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-05-18T04:00:00.000Z"),
                            "totalEnergyUse": 1162551,
                            "totalCost": 82176.14,
                            "checked": false,
                            "totalDemand": 3442,
                            "basicCharge": 210,
                            "supplyBlockCharge": 31934.96,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17209.4,
                            "utilityTax": 1571.78,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2382
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-06-17T04:00:00.000Z"),
                            "totalEnergyUse": 1282324,
                            "totalCost": 91014,
                            "checked": false,
                            "totalDemand": 4021,
                            "basicCharge": 210,
                            "supplyBlockCharge": 37708.02,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20105.15,
                            "utilityTax": 1740.83,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2383
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-07-15T04:00:00.000Z"),
                            "totalEnergyUse": 1136990,
                            "totalCost": 81441.12,
                            "checked": false,
                            "totalDemand": 3544,
                            "basicCharge": 210,
                            "supplyBlockCharge": 30702.92,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17720.47,
                            "utilityTax": 1557.73,
                            "latePayment": 2730.42,
                            "meterNumber": "BP43756",
                            "id": 2384
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-08-14T04:00:00.000Z"),
                            "totalEnergyUse": 1525276,
                            "totalCost": 111437.37,
                            "checked": false,
                            "totalDemand": 5686,
                            "basicCharge": 210,
                            "supplyBlockCharge": 49418.3,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 28427.6,
                            "utilityTax": 2131.47,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2385
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-09-14T04:00:00.000Z"),
                            "totalEnergyUse": 1221569,
                            "totalCost": 87900.66,
                            "checked": false,
                            "totalDemand": 3996,
                            "basicCharge": 210,
                            "supplyBlockCharge": 34779.63,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 19979.76,
                            "utilityTax": 1681.28,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2386
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-10-14T04:00:00.000Z"),
                            "totalEnergyUse": 1284924,
                            "totalCost": 93929.94,
                            "checked": false,
                            "totalDemand": 4568,
                            "basicCharge": 210,
                            "supplyBlockCharge": 37833.34,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22840,
                            "utilityTax": 1796.6,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2387
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-11-15T05:00:00.000Z"),
                            "totalEnergyUse": 1252465,
                            "totalCost": 89747.98,
                            "checked": false,
                            "totalDemand": 4061,
                            "basicCharge": 210,
                            "supplyBlockCharge": 36268.81,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20302.55,
                            "utilityTax": 1716.61,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2388
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-12-14T05:00:00.000Z"),
                            "totalEnergyUse": 1152054,
                            "totalCost": 81987.79,
                            "checked": false,
                            "totalDemand": 3506,
                            "basicCharge": 210,
                            "supplyBlockCharge": 31429,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17530.61,
                            "utilityTax": 1568.18,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2389
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-01-17T05:00:00.000Z"),
                            "totalEnergyUse": 1194582,
                            "totalCost": 86676.72,
                            "checked": false,
                            "totalDemand": 4016,
                            "basicCharge": 210,
                            "supplyBlockCharge": 33478.85,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20080,
                            "utilityTax": 1657.87,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2390
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-02-14T05:00:00.000Z"),
                            "totalEnergyUse": 1325393,
                            "totalCost": 98203.13,
                            "checked": false,
                            "totalDemand": 5016,
                            "basicCharge": 210,
                            "supplyBlockCharge": 39783.94,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 25080.86,
                            "utilityTax": 1878.33,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2391
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-03-17T04:00:00.000Z"),
                            "totalEnergyUse": 1346662,
                            "totalCost": 96404.89,
                            "checked": false,
                            "totalDemand": 4458,
                            "basicCharge": 210,
                            "supplyBlockCharge": 40809.11,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22291.85,
                            "utilityTax": 1843.94,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2392
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-04-18T04:00:00.000Z"),
                            "totalEnergyUse": 1110157,
                            "totalCost": 80795.33,
                            "checked": false,
                            "totalDemand": 3676,
                            "basicCharge": 210,
                            "supplyBlockCharge": 29409.57,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 18380.39,
                            "utilityTax": 1545.37,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2393
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-05-17T04:00:00.000Z"),
                            "totalEnergyUse": 1156256,
                            "totalCost": 85897.92,
                            "checked": false,
                            "totalDemand": 4233,
                            "basicCharge": 210,
                            "supplyBlockCharge": 31631.54,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 21163.41,
                            "utilityTax": 1642.97,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2394
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-06-15T04:00:00.000Z"),
                            "totalEnergyUse": 1242847,
                            "totalCost": 89200.8,
                            "checked": false,
                            "totalDemand": 4046,
                            "basicCharge": 210,
                            "supplyBlockCharge": 35805.23,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20229.43,
                            "utilityTax": 1706.15,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2395
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-07-14T04:00:00.000Z"),
                            "totalEnergyUse": 983161,
                            "totalCost": 72847.32,
                            "checked": false,
                            "totalDemand": 3341,
                            "basicCharge": 210,
                            "supplyBlockCharge": 23288.36,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 16705.6,
                            "utilityTax": 1393.35,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2396
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-08-18T04:00:00.000Z"),
                            "totalEnergyUse": 1456521,
                            "totalCost": 105978.6,
                            "checked": false,
                            "totalDemand": 5277,
                            "basicCharge": 210,
                            "supplyBlockCharge": 46104.31,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 26387.23,
                            "utilityTax": 2027.06,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2397
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-09-18T04:00:00.000Z"),
                            "totalEnergyUse": 1049972,
                            "totalCost": 79651.2,
                            "checked": false,
                            "totalDemand": 4032,
                            "basicCharge": 210,
                            "supplyBlockCharge": 26508.65,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20159.06,
                            "utilityTax": 1523.49,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2398
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-10-17T04:00:00.000Z"),
                            "totalEnergyUse": 1262268,
                            "totalCost": 91784.19,
                            "checked": false,
                            "totalDemand": 4365,
                            "basicCharge": 210,
                            "supplyBlockCharge": 36741.32,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 21827.32,
                            "utilityTax": 1755.56,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2399
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-11-18T05:00:00.000Z"),
                            "totalEnergyUse": 1115227,
                            "totalCost": 80443.97,
                            "checked": false,
                            "totalDemand": 3558,
                            "basicCharge": 210,
                            "supplyBlockCharge": 29653.94,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17791.37,
                            "utilityTax": 1538.65,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2400
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-12-15T05:00:00.000Z"),
                            "totalEnergyUse": 1178740,
                            "totalCost": 85786.1,
                            "checked": false,
                            "totalDemand": 3994,
                            "basicCharge": 210,
                            "supplyBlockCharge": 32715.27,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 19970,
                            "utilityTax": 1640.83,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2401
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-01-15T05:00:00.000Z"),
                            "totalEnergyUse": 1265976,
                            "totalCost": 92987.05,
                            "checked": false,
                            "totalDemand": 4566,
                            "basicCharge": 210,
                            "supplyBlockCharge": 36920.04,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22828.44,
                            "utilityTax": 1778.57,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2402
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-02-15T05:00:00.000Z"),
                            "totalEnergyUse": 1083949,
                            "totalCost": 78592.71,
                            "checked": false,
                            "totalDemand": 3497,
                            "basicCharge": 210,
                            "supplyBlockCharge": 28146.34,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17483.12,
                            "utilityTax": 1503.24,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2403
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-03-18T04:00:00.000Z"),
                            "totalEnergyUse": 1169951,
                            "totalCost": 84188.56,
                            "checked": false,
                            "totalDemand": 3765,
                            "basicCharge": 210,
                            "supplyBlockCharge": 32291.64,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 18826.65,
                            "utilityTax": 1610.28,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2404
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-04-14T04:00:00.000Z"),
                            "totalEnergyUse": 1358701,
                            "totalCost": 95222.71,
                            "checked": false,
                            "totalDemand": 4110,
                            "basicCharge": 210,
                            "supplyBlockCharge": 41389.39,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20552,
                            "utilityTax": 1821.33,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2405
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-05-17T04:00:00.000Z"),
                            "totalEnergyUse": 1310253,
                            "totalCost": 90811.14,
                            "checked": false,
                            "totalDemand": 3712,
                            "basicCharge": 210,
                            "supplyBlockCharge": 39054.19,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 18560,
                            "utilityTax": 1736.95,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2406
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-06-15T04:00:00.000Z"),
                            "totalEnergyUse": 1289293,
                            "totalCost": 91028.44,
                            "checked": false,
                            "totalDemand": 3957,
                            "basicCharge": 210,
                            "supplyBlockCharge": 38043.92,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 19783.41,
                            "utilityTax": 1741.1,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2407
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-07-17T04:00:00.000Z"),
                            "totalEnergyUse": 1030644,
                            "totalCost": 74144.53,
                            "checked": false,
                            "totalDemand": 3138,
                            "basicCharge": 210,
                            "supplyBlockCharge": 25577.04,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 15689.33,
                            "utilityTax": 1418.16,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2408
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-08-16T04:00:00.000Z"),
                            "totalEnergyUse": 1244668,
                            "totalCost": 91996.53,
                            "checked": false,
                            "totalDemand": 4577,
                            "basicCharge": 210,
                            "supplyBlockCharge": 35893,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22883.92,
                            "utilityTax": 1759.62,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2409
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-09-17T04:00:00.000Z"),
                            "totalEnergyUse": 1267751,
                            "totalCost": 89915.26,
                            "checked": false,
                            "totalDemand": 3946,
                            "basicCharge": 210,
                            "supplyBlockCharge": 37005.6,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 19729.85,
                            "utilityTax": 1719.81,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2410
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-10-17T04:00:00.000Z"),
                            "totalEnergyUse": 1245406,
                            "totalCost": 93359.96,
                            "checked": false,
                            "totalDemand": 4837,
                            "basicCharge": 210,
                            "supplyBlockCharge": 35928.57,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 24185.69,
                            "utilityTax": 1785.7,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2411
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-11-16T05:00:00.000Z"),
                            "totalEnergyUse": 1151378,
                            "totalCost": 81900.69,
                            "checked": false,
                            "totalDemand": 3496,
                            "basicCharge": 210,
                            "supplyBlockCharge": 31396.42,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17477.75,
                            "utilityTax": 1566.52,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2412
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-12-18T05:00:00.000Z"),
                            "totalEnergyUse": 1084136,
                            "totalCost": 81533.13,
                            "checked": false,
                            "totalDemand": 4072,
                            "basicCharge": 210,
                            "supplyBlockCharge": 28155.36,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20358.29,
                            "utilityTax": 1559.49,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2413
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-01-16T05:00:00.000Z"),
                            "totalEnergyUse": 1455354,
                            "totalCost": 102244.72,
                            "checked": false,
                            "totalDemand": 4556,
                            "basicCharge": 210,
                            "supplyBlockCharge": 46048.06,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22781.02,
                            "utilityTax": 1955.64,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2414
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-02-16T05:00:00.000Z"),
                            "totalEnergyUse": 1270209,
                            "totalCost": 93002.33,
                            "checked": false,
                            "totalDemand": 4528,
                            "basicCharge": 210,
                            "supplyBlockCharge": 37124.07,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22639.4,
                            "utilityTax": 1778.86,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2415
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-03-14T04:00:00.000Z"),
                            "totalEnergyUse": 1167654,
                            "totalCost": 82973.19,
                            "checked": false,
                            "totalDemand": 3549,
                            "basicCharge": 210,
                            "supplyBlockCharge": 32180.92,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17745.24,
                            "utilityTax": 1587.03,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2416
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-04-15T04:00:00.000Z"),
                            "totalEnergyUse": 1180453,
                            "totalCost": 88199.78,
                            "checked": false,
                            "totalDemand": 4451,
                            "basicCharge": 210,
                            "supplyBlockCharge": 32797.83,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22254.94,
                            "utilityTax": 1687,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2417
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-05-14T04:00:00.000Z"),
                            "totalEnergyUse": 1363755,
                            "totalCost": 97691.54,
                            "checked": false,
                            "totalDemand": 4546,
                            "basicCharge": 210,
                            "supplyBlockCharge": 41632.99,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 22730,
                            "utilityTax": 1868.55,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2418
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-06-17T04:00:00.000Z"),
                            "totalEnergyUse": 1319645,
                            "totalCost": 96976.62,
                            "checked": false,
                            "totalDemand": 4831,
                            "basicCharge": 210,
                            "supplyBlockCharge": 39506.89,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 24154.86,
                            "utilityTax": 1854.87,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2419
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-07-15T04:00:00.000Z"),
                            "totalEnergyUse": 1071299,
                            "totalCost": 77559.37,
                            "checked": false,
                            "totalDemand": 3416,
                            "basicCharge": 210,
                            "supplyBlockCharge": 27536.61,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17079.28,
                            "utilityTax": 1483.48,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2420
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-08-18T04:00:00.000Z"),
                            "totalEnergyUse": 1105611,
                            "totalCost": 82293.22,
                            "checked": false,
                            "totalDemand": 4014,
                            "basicCharge": 210,
                            "supplyBlockCharge": 29190.45,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 20068.75,
                            "utilityTax": 1574.02,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2421
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-09-18T04:00:00.000Z"),
                            "totalEnergyUse": 1076829,
                            "totalCost": 77055.56,
                            "checked": false,
                            "totalDemand": 3264,
                            "basicCharge": 210,
                            "supplyBlockCharge": 27803.16,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 16318.56,
                            "utilityTax": 1473.84,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2422
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-10-14T04:00:00.000Z"),
                            "totalEnergyUse": 1131425,
                            "totalCost": 82558.15,
                            "checked": false,
                            "totalDemand": 3817,
                            "basicCharge": 210,
                            "supplyBlockCharge": 30434.69,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 19084.38,
                            "utilityTax": 1579.09,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2423
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-11-14T05:00:00.000Z"),
                            "totalEnergyUse": 864729,
                            "totalCost": 66427.91,
                            "checked": false,
                            "totalDemand": 3223,
                            "basicCharge": 210,
                            "supplyBlockCharge": 17579.94,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 16117.41,
                            "utilityTax": 1270.57,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2424
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-12-15T05:00:00.000Z"),
                            "totalEnergyUse": 843872,
                            "totalCost": 62794.77,
                            "checked": false,
                            "totalDemand": 2712,
                            "basicCharge": 210,
                            "supplyBlockCharge": 16574.63,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 13559.06,
                            "utilityTax": 1201.08,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2425
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-01-14T05:00:00.000Z"),
                            "totalEnergyUse": 987940,
                            "totalCost": 73826.65,
                            "checked": false,
                            "totalDemand": 3487,
                            "basicCharge": 210,
                            "supplyBlockCharge": 23518.71,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17435.86,
                            "utilityTax": 1412.08,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2426
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-02-16T05:00:00.000Z"),
                            "totalEnergyUse": 1188170,
                            "totalCost": 84497.85,
                            "checked": false,
                            "totalDemand": 3650,
                            "basicCharge": 210,
                            "supplyBlockCharge": 33169.79,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 18251.86,
                            "utilityTax": 1616.19,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2427
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-03-17T04:00:00.000Z"),
                            "totalEnergyUse": 1095192,
                            "totalCost": 81431.35,
                            "checked": false,
                            "totalDemand": 3945,
                            "basicCharge": 210,
                            "supplyBlockCharge": 28688.25,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 19725.56,
                            "utilityTax": 1557.54,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2428
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-04-18T04:00:00.000Z"),
                            "totalEnergyUse": 1105691,
                            "totalCost": 80310.41,
                            "checked": false,
                            "totalDemand": 3624,
                            "basicCharge": 210,
                            "supplyBlockCharge": 29194.31,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 18120,
                            "utilityTax": 1536.1,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2429
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-05-15T04:00:00.000Z"),
                            "totalEnergyUse": 883124,
                            "totalCost": 63654.09,
                            "checked": false,
                            "totalDemand": 2502,
                            "basicCharge": 210,
                            "supplyBlockCharge": 18466.58,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 12510,
                            "utilityTax": 1217.51,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2430
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-06-15T04:00:00.000Z"),
                            "totalEnergyUse": 972362,
                            "totalCost": 73079.97,
                            "checked": false,
                            "totalDemand": 3491,
                            "basicCharge": 210,
                            "supplyBlockCharge": 22767.85,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 17454.32,
                            "utilityTax": 1397.8,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2431
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-07-17T04:00:00.000Z"),
                            "totalEnergyUse": 829968,
                            "totalCost": 62388.63,
                            "checked": false,
                            "totalDemand": 2766,
                            "basicCharge": 210,
                            "supplyBlockCharge": 15904.46,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 13830.86,
                            "utilityTax": 1193.31,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2432
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-08-17T04:00:00.000Z"),
                            "totalEnergyUse": 1056372,
                            "totalCost": 76722.57,
                            "checked": false,
                            "totalDemand": 3396,
                            "basicCharge": 210,
                            "supplyBlockCharge": 26817.13,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 16977.97,
                            "utilityTax": 1467.47,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2433
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-09-14T04:00:00.000Z"),
                            "totalEnergyUse": 1319252,
                            "totalCost": 99500.42,
                            "checked": false,
                            "totalDemand": 5330,
                            "basicCharge": 210,
                            "supplyBlockCharge": 39487.95,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 26649.33,
                            "utilityTax": 1903.15,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2434
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-10-14T04:00:00.000Z"),
                            "totalEnergyUse": 1163070,
                            "totalCost": 83211.14,
                            "checked": false,
                            "totalDemand": 3640,
                            "basicCharge": 210,
                            "supplyBlockCharge": 31959.97,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 18199.59,
                            "utilityTax": 1591.58,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2435
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-11-15T05:00:00.000Z"),
                            "totalEnergyUse": 1074950,
                            "totalCost": 76782.49,
                            "checked": false,
                            "totalDemand": 3228,
                            "basicCharge": 210,
                            "supplyBlockCharge": 27712.59,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 16141.28,
                            "utilityTax": 1468.62,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2436
                        },
                        {
                            "meterId": 47,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-12-17T05:00:00.000Z"),
                            "totalEnergyUse": 1169776,
                            "totalCost": 87056.06,
                            "checked": false,
                            "totalDemand": 4330,
                            "basicCharge": 210,
                            "supplyBlockCharge": 32283.2,
                            "flatRateCharge": 31250,
                            "transmissionCharge": 21647.74,
                            "utilityTax": 1665.12,
                            "latePayment": 0,
                            "meterNumber": "BP43756",
                            "id": 2437
                        }
                    ],
                    "meterGroup": {
                        "facilityId": 9,
                        "accountId": 7,
                        "groupType": "Energy",
                        "name": "group 1",
                        "visible": true,
                        "id": 10
                    }
                },
                {
                    "meter": {
                        "facilityId": 9,
                        "accountId": 7,
                        "groupId": 11,
                        "meterNumber": "BP99443",
                        "accountNumber": 654,
                        "heatCapacity": 0.001027,
                        "siteToSource": 1,
                        "name": "Natural Gas",
                        "supplier": "NGC",
                        "source": "Natural Gas",
                        "group": "group 2",
                        "startingUnit": "SCF",
                        "energyUnit": "MMBtu",
                        "visible": true,
                        "id": 48,
                        "meterReadingDataApplication": "backward",
                        "emissionsOutputRate": 53.06
                    },
                    "meterData": [
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2015-12-18T05:00:00.000Z"),
                            "totalVolume": 27773526,
                            "totalEnergyUse": 28523.411202,
                            "totalCost": 113846.54550000001,
                            "commodityCharge": 111094,
                            "deliveryCharge": 575,
                            "otherCharge": 2177.5455,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 27773526,
                            "id": 2438
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-01-18T05:00:00.000Z"),
                            "totalVolume": 31689477,
                            "totalEnergyUse": 32545.092878999996,
                            "totalCost": 129815.58570000001,
                            "commodityCharge": 126757.6,
                            "deliveryCharge": 575,
                            "otherCharge": 2482.9857,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 31689477,
                            "id": 2439
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-02-20T05:00:00.000Z"),
                            "totalVolume": 29456148,
                            "totalEnergyUse": 30251.463996,
                            "totalCost": 120708.18830000001,
                            "commodityCharge": 117824.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 2308.7883,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 29456148,
                            "id": 2440
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-03-19T04:00:00.000Z"),
                            "totalVolume": 27693036,
                            "totalEnergyUse": 28440.747971999997,
                            "totalCost": 113518.2665,
                            "commodityCharge": 110772,
                            "deliveryCharge": 575,
                            "otherCharge": 2171.2665,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 27693036,
                            "id": 2441
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-04-16T04:00:00.000Z"),
                            "totalVolume": 23976492,
                            "totalEnergyUse": 24623.857283999998,
                            "totalCost": 98361.97170000001,
                            "commodityCharge": 95905.6,
                            "deliveryCharge": 575,
                            "otherCharge": 1881.3717000000001,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 23976492,
                            "id": 2442
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-05-16T04:00:00.000Z"),
                            "totalVolume": 18793160,
                            "totalEnergyUse": 19300.57532,
                            "totalCost": 77224.4743,
                            "commodityCharge": 75172.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1477.0743000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 18793160,
                            "id": 2443
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-06-20T04:00:00.000Z"),
                            "totalVolume": 16637257,
                            "totalEnergyUse": 17086.462938999997,
                            "totalCost": 68432.7141,
                            "commodityCharge": 66548.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1308.9141,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 16637257,
                            "id": 2444
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-07-17T04:00:00.000Z"),
                            "totalVolume": 12658918,
                            "totalEnergyUse": 13000.708786,
                            "totalCost": 52209.2067,
                            "commodityCharge": 50635.600000000006,
                            "deliveryCharge": 575,
                            "otherCharge": 998.6067000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 12658918,
                            "id": 2445
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-08-17T04:00:00.000Z"),
                            "totalVolume": 14713234,
                            "totalEnergyUse": 15110.491317999999,
                            "totalCost": 60586.642100000005,
                            "commodityCharge": 58852.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1158.8421,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 14713234,
                            "id": 2446
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-09-16T04:00:00.000Z"),
                            "totalVolume": 14952513,
                            "totalEnergyUse": 15356.230850999998,
                            "totalCost": 61562.5075,
                            "commodityCharge": 59810,
                            "deliveryCharge": 575,
                            "otherCharge": 1177.5075,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 14952513,
                            "id": 2447
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-10-19T04:00:00.000Z"),
                            "totalVolume": 18202600,
                            "totalEnergyUse": 18694.0702,
                            "totalCost": 74816.41530000001,
                            "commodityCharge": 72810.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1431.0153000000003,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 18202600,
                            "id": 2448
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-11-18T05:00:00.000Z"),
                            "totalVolume": 21392108,
                            "totalEnergyUse": 21969.694915999997,
                            "totalCost": 87823.19630000001,
                            "commodityCharge": 85568.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1679.7963000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 21392108,
                            "id": 2449
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2016-12-19T05:00:00.000Z"),
                            "totalVolume": 29782056,
                            "totalEnergyUse": 30586.171511999997,
                            "totalCost": 122037.2085,
                            "commodityCharge": 119128,
                            "deliveryCharge": 575,
                            "otherCharge": 2334.2085,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 29782056,
                            "id": 2450
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-01-18T05:00:00.000Z"),
                            "totalVolume": 31684183,
                            "totalEnergyUse": 32539.655940999997,
                            "totalCost": 129793.97230000001,
                            "commodityCharge": 126736.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 2482.5723000000003,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 31684183,
                            "id": 2451
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-02-19T05:00:00.000Z"),
                            "totalVolume": 26104455,
                            "totalEnergyUse": 26809.275284999996,
                            "totalCost": 107039.9557,
                            "commodityCharge": 104417.6,
                            "deliveryCharge": 575,
                            "otherCharge": 2047.3557,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 26104455,
                            "id": 2452
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-03-16T04:00:00.000Z"),
                            "totalVolume": 26649690,
                            "totalEnergyUse": 27369.23163,
                            "totalCost": 109263.2813,
                            "commodityCharge": 106598.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 2089.8813,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 26649690,
                            "id": 2453
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-04-20T04:00:00.000Z"),
                            "totalVolume": 20928376,
                            "totalEnergyUse": 21493.442152,
                            "totalCost": 85931.81990000002,
                            "commodityCharge": 83713.20000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1643.6199000000001,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 20928376,
                            "id": 2454
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-05-17T04:00:00.000Z"),
                            "totalVolume": 19099579,
                            "totalEnergyUse": 19615.267633,
                            "totalCost": 78473.9735,
                            "commodityCharge": 76398,
                            "deliveryCharge": 575,
                            "otherCharge": 1500.9735,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 19099579,
                            "id": 2455
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-06-20T04:00:00.000Z"),
                            "totalVolume": 16278663,
                            "totalEnergyUse": 16718.186900999997,
                            "totalCost": 66970.3433,
                            "commodityCharge": 65114.4,
                            "deliveryCharge": 575,
                            "otherCharge": 1280.9433,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 16278663,
                            "id": 2456
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-07-17T04:00:00.000Z"),
                            "totalVolume": 13557349,
                            "totalEnergyUse": 13923.397422999999,
                            "totalCost": 55872.88190000001,
                            "commodityCharge": 54229.200000000004,
                            "deliveryCharge": 575,
                            "otherCharge": 1068.6819,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 13557349,
                            "id": 2457
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-08-19T04:00:00.000Z"),
                            "totalVolume": 17399631,
                            "totalEnergyUse": 17869.421037,
                            "totalCost": 71541.7813,
                            "commodityCharge": 69598.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1368.3813000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 17399631,
                            "id": 2458
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-09-20T04:00:00.000Z"),
                            "totalVolume": 16581532,
                            "totalEnergyUse": 17029.233364,
                            "totalCost": 68205.5695,
                            "commodityCharge": 66326,
                            "deliveryCharge": 575,
                            "otherCharge": 1304.5695,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 16581532,
                            "id": 2459
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-10-16T04:00:00.000Z"),
                            "totalVolume": 19050642,
                            "totalEnergyUse": 19565.009334,
                            "totalCost": 78274.55930000001,
                            "commodityCharge": 76202.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1497.1593000000003,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 19050642,
                            "id": 2460
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-11-20T05:00:00.000Z"),
                            "totalVolume": 24051952,
                            "totalEnergyUse": 24701.354703999998,
                            "totalCost": 98669.8607,
                            "commodityCharge": 96207.6,
                            "deliveryCharge": 575,
                            "otherCharge": 1887.2607,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 24051952,
                            "id": 2461
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2017-12-17T05:00:00.000Z"),
                            "totalVolume": 30981522,
                            "totalEnergyUse": 31818.023093999996,
                            "totalCost": 126928.7695,
                            "commodityCharge": 123926,
                            "deliveryCharge": 575,
                            "otherCharge": 2427.7695,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 30981522,
                            "id": 2462
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-01-18T05:00:00.000Z"),
                            "totalVolume": 31583099,
                            "totalEnergyUse": 32435.842673,
                            "totalCost": 129381.6865,
                            "commodityCharge": 126332,
                            "deliveryCharge": 575,
                            "otherCharge": 2474.6865,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 31583099,
                            "id": 2463
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-02-17T05:00:00.000Z"),
                            "totalVolume": 28075879,
                            "totalEnergyUse": 28833.927732999997,
                            "totalCost": 115079.3249,
                            "commodityCharge": 112303.20000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 2201.1249000000003,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 28075879,
                            "id": 2464
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-03-16T04:00:00.000Z"),
                            "totalVolume": 26892871,
                            "totalEnergyUse": 27618.978517,
                            "totalCost": 110255.05090000002,
                            "commodityCharge": 107571.20000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 2108.8509000000004,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 26892871,
                            "id": 2465
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-04-17T04:00:00.000Z"),
                            "totalVolume": 25489075,
                            "totalEnergyUse": 26177.280024999996,
                            "totalCost": 104530.3545,
                            "commodityCharge": 101956,
                            "deliveryCharge": 575,
                            "otherCharge": 1999.3545,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 25489075,
                            "id": 2466
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-05-17T04:00:00.000Z"),
                            "totalVolume": 18152452,
                            "totalEnergyUse": 18642.568204,
                            "totalCost": 74611.69970000001,
                            "commodityCharge": 72609.6,
                            "deliveryCharge": 575,
                            "otherCharge": 1427.0997000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 18152452,
                            "id": 2467
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-06-20T04:00:00.000Z"),
                            "totalVolume": 15830331,
                            "totalEnergyUse": 16257.749936999999,
                            "totalCost": 65142.1759,
                            "commodityCharge": 63321.200000000004,
                            "deliveryCharge": 575,
                            "otherCharge": 1245.9759000000001,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 15830331,
                            "id": 2468
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-07-18T04:00:00.000Z"),
                            "totalVolume": 12802392,
                            "totalEnergyUse": 13148.056583999998,
                            "totalCost": 52793.9919,
                            "commodityCharge": 51209.200000000004,
                            "deliveryCharge": 575,
                            "otherCharge": 1009.7919,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 12802392,
                            "id": 2469
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-08-16T04:00:00.000Z"),
                            "totalVolume": 15784032,
                            "totalEnergyUse": 16210.200863999999,
                            "totalCost": 64953.3645,
                            "commodityCharge": 63136,
                            "deliveryCharge": 575,
                            "otherCharge": 1242.3645,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 15784032,
                            "id": 2470
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-09-16T04:00:00.000Z"),
                            "totalVolume": 15923231,
                            "totalEnergyUse": 16353.158236999998,
                            "totalCost": 65521.0221,
                            "commodityCharge": 63692.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1253.2221,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 15923231,
                            "id": 2471
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-10-17T04:00:00.000Z"),
                            "totalVolume": 19434958,
                            "totalEnergyUse": 19959.701866,
                            "totalCost": 79841.7347,
                            "commodityCharge": 77739.6,
                            "deliveryCharge": 575,
                            "otherCharge": 1527.1347,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 19434958,
                            "id": 2472
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-11-17T05:00:00.000Z"),
                            "totalVolume": 23927985,
                            "totalEnergyUse": 24574.040595,
                            "totalCost": 98164.1887,
                            "commodityCharge": 95711.6,
                            "deliveryCharge": 575,
                            "otherCharge": 1877.5887,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 23927985,
                            "id": 2473
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2018-12-17T05:00:00.000Z"),
                            "totalVolume": 25049573,
                            "totalEnergyUse": 25725.911471,
                            "totalCost": 102738.0735,
                            "commodityCharge": 100198,
                            "deliveryCharge": 575,
                            "otherCharge": 1965.0735,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 25049573,
                            "id": 2474
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-01-19T05:00:00.000Z"),
                            "totalVolume": 29860282,
                            "totalEnergyUse": 30666.509614,
                            "totalCost": 122356.1081,
                            "commodityCharge": 119440.8,
                            "deliveryCharge": 575,
                            "otherCharge": 2340.3081,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 29860282,
                            "id": 2475
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-02-20T05:00:00.000Z"),
                            "totalVolume": 26488936,
                            "totalEnergyUse": 27204.137271999996,
                            "totalCost": 108607.9467,
                            "commodityCharge": 105955.6,
                            "deliveryCharge": 575,
                            "otherCharge": 2077.3467,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 26488936,
                            "id": 2476
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-03-17T04:00:00.000Z"),
                            "totalVolume": 25396510,
                            "totalEnergyUse": 26082.21577,
                            "totalCost": 104153.1395,
                            "commodityCharge": 101586,
                            "deliveryCharge": 575,
                            "otherCharge": 1992.1395,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 25396510,
                            "id": 2477
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-04-19T04:00:00.000Z"),
                            "totalVolume": 20776543,
                            "totalEnergyUse": 21337.509661,
                            "totalCost": 85312.7795,
                            "commodityCharge": 83106,
                            "deliveryCharge": 575,
                            "otherCharge": 1631.7795,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 20776543,
                            "id": 2478
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-05-16T04:00:00.000Z"),
                            "totalVolume": 19667293,
                            "totalEnergyUse": 20198.309910999997,
                            "totalCost": 80789.05410000001,
                            "commodityCharge": 78668.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1545.2541,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 19667293,
                            "id": 2479
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-06-20T04:00:00.000Z"),
                            "totalVolume": 15169029,
                            "totalEnergyUse": 15578.592782999998,
                            "totalCost": 62445.3945,
                            "commodityCharge": 60676,
                            "deliveryCharge": 575,
                            "otherCharge": 1194.3945,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 15169029,
                            "id": 2480
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-07-20T04:00:00.000Z"),
                            "totalVolume": 11738386,
                            "totalEnergyUse": 12055.322422,
                            "totalCost": 48454.9999,
                            "commodityCharge": 46953.200000000004,
                            "deliveryCharge": 575,
                            "otherCharge": 926.7999000000001,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 11738386,
                            "id": 2481
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-08-16T04:00:00.000Z"),
                            "totalVolume": 14074657,
                            "totalEnergyUse": 14454.672739,
                            "totalCost": 57982.431300000004,
                            "commodityCharge": 56298.4,
                            "deliveryCharge": 575,
                            "otherCharge": 1109.0313,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 14074657,
                            "id": 2482
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-09-16T04:00:00.000Z"),
                            "totalVolume": 14395379,
                            "totalEnergyUse": 14784.054232999999,
                            "totalCost": 59290.2459,
                            "commodityCharge": 57581.200000000004,
                            "deliveryCharge": 575,
                            "otherCharge": 1134.0459,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 14395379,
                            "id": 2483
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-10-17T04:00:00.000Z"),
                            "totalVolume": 18016027,
                            "totalEnergyUse": 18502.459729,
                            "totalCost": 74055.4605,
                            "commodityCharge": 72064,
                            "deliveryCharge": 575,
                            "otherCharge": 1416.4605,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 18016027,
                            "id": 2484
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-11-17T05:00:00.000Z"),
                            "totalVolume": 23862665,
                            "totalEnergyUse": 24506.956954999998,
                            "totalCost": 97897.8953,
                            "commodityCharge": 95450.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1872.4953000000003,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 23862665,
                            "id": 2485
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2019-12-18T05:00:00.000Z"),
                            "totalVolume": 24804744,
                            "totalEnergyUse": 25474.472088,
                            "totalCost": 101739.7791,
                            "commodityCharge": 99218.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1945.9791,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 24804744,
                            "id": 2486
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-01-18T05:00:00.000Z"),
                            "totalVolume": 25320944,
                            "totalEnergyUse": 26004.609488,
                            "totalCost": 103844.84270000001,
                            "commodityCharge": 101283.6,
                            "deliveryCharge": 575,
                            "otherCharge": 1986.2427,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 25320944,
                            "id": 2487
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-02-19T05:00:00.000Z"),
                            "totalVolume": 25083523,
                            "totalEnergyUse": 25760.778121,
                            "totalCost": 102876.7255,
                            "commodityCharge": 100334,
                            "deliveryCharge": 575,
                            "otherCharge": 1967.7255,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 25083523,
                            "id": 2488
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-03-16T04:00:00.000Z"),
                            "totalVolume": 21995540,
                            "totalEnergyUse": 22589.419579999998,
                            "totalCost": 90283.8615,
                            "commodityCharge": 87982,
                            "deliveryCharge": 575,
                            "otherCharge": 1726.8615,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 21995540,
                            "id": 2489
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-04-20T04:00:00.000Z"),
                            "totalVolume": 19027404,
                            "totalEnergyUse": 19541.143908,
                            "totalCost": 78179.94970000001,
                            "commodityCharge": 76109.6,
                            "deliveryCharge": 575,
                            "otherCharge": 1495.3497000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 19027404,
                            "id": 2490
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-05-20T04:00:00.000Z"),
                            "totalVolume": 16343336,
                            "totalEnergyUse": 16784.606072,
                            "totalCost": 67234.18990000001,
                            "commodityCharge": 65373.200000000004,
                            "deliveryCharge": 575,
                            "otherCharge": 1285.9899000000003,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 16343336,
                            "id": 2491
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-06-20T04:00:00.000Z"),
                            "totalVolume": 14428238,
                            "totalEnergyUse": 14817.800425999998,
                            "totalCost": 59424.4121,
                            "commodityCharge": 57712.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1136.6121,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 14428238,
                            "id": 2492
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-07-16T04:00:00.000Z"),
                            "totalVolume": 11799839,
                            "totalEnergyUse": 12118.434652999998,
                            "totalCost": 48705.7969,
                            "commodityCharge": 47199.200000000004,
                            "deliveryCharge": 575,
                            "otherCharge": 931.5969000000001,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 11799839,
                            "id": 2493
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-08-17T04:00:00.000Z"),
                            "totalVolume": 14582210,
                            "totalEnergyUse": 14975.92967,
                            "totalCost": 60052.424100000004,
                            "commodityCharge": 58328.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1148.6241,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 14582210,
                            "id": 2494
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-09-17T04:00:00.000Z"),
                            "totalVolume": 14620238,
                            "totalEnergyUse": 15014.984425999999,
                            "totalCost": 60207.388100000004,
                            "commodityCharge": 58480.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1151.5881000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 14620238,
                            "id": 2495
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-10-16T04:00:00.000Z"),
                            "totalVolume": 18703242,
                            "totalEnergyUse": 19208.229534,
                            "totalCost": 76857.8621,
                            "commodityCharge": 74812.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1470.0621,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 18703242,
                            "id": 2496
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-11-16T05:00:00.000Z"),
                            "totalVolume": 20317241,
                            "totalEnergyUse": 20865.806506999998,
                            "totalCost": 83439.7541,
                            "commodityCharge": 81268.8,
                            "deliveryCharge": 575,
                            "otherCharge": 1595.9541000000002,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 20317241,
                            "id": 2497
                        },
                        {
                            "meterId": 48,
                            "facilityId": 9,
                            "accountId": 7,
                            "readDate": new Date("2020-12-16T05:00:00.000Z"),
                            "totalVolume": 24495623,
                            "totalEnergyUse": 25157.004821,
                            "totalCost": 100479.26930000001,
                            "commodityCharge": 97982.40000000001,
                            "deliveryCharge": 575,
                            "otherCharge": 1921.8693,
                            "checked": false,
                            "meterNumber": "BP99443",
                            "totalImportConsumption": 24495623,
                            "id": 2498
                        }
                    ],
                    "meterGroup": {
                        "facilityId": 9,
                        "accountId": 7,
                        "groupType": "Energy",
                        "name": "group 2",
                        "visible": true,
                        "id": 11
                    }
                }
            ],
            "predictors": [
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1297
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 332294
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 34575
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1727
                        }
                    ],
                    "id": 130
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1099
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 405953
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 61664
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2028
                        }
                    ],
                    "id": 131
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 922
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 341256
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 34856
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1508
                        }
                    ],
                    "id": 132
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 740
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 368783
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 23811
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1721
                        }
                    ],
                    "id": 133
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 60
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 339
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 340259
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 32349
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2014
                        }
                    ],
                    "id": 134
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 164
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 87
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 222608
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 38722
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2014
                        }
                    ],
                    "id": 135
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 352
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 216373
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 18983
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1361
                        }
                    ],
                    "id": 136
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 350
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 240061
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 35868
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1280
                        }
                    ],
                    "id": 137
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 153
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 49
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 286518
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 27199
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1705
                        }
                    ],
                    "id": 138
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 20
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 366
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 267581
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 32110
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1601
                        }
                    ],
                    "id": 139
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 620
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 332780
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 27638
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1463
                        }
                    ],
                    "id": 140
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2016-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1246
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 224354
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 30592
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1135
                        }
                    ],
                    "id": 141
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1262
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 343098
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 80136
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2394
                        }
                    ],
                    "id": 142
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 981
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 275767
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 66357
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2457
                        }
                    ],
                    "id": 143
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1039
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 425925
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 49855
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1923
                        }
                    ],
                    "id": 144
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 568
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 411758
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 27006
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1521
                        }
                    ],
                    "id": 145
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 20
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 426
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 317151
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 36537
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1854
                        }
                    ],
                    "id": 146
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 204
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 249562
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 71260
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1925
                        }
                    ],
                    "id": 147
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 279
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 242811
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 39627
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1071
                        }
                    ],
                    "id": 148
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 181
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 28
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 259554
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 64561
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1558
                        }
                    ],
                    "id": 149
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 122
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 133
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 225786
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 50391
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2409
                        }
                    ],
                    "id": 150
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 41
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 377
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 465666
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 64350
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1465
                        }
                    ],
                    "id": 151
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 867
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 266168
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 66464
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1472
                        }
                    ],
                    "id": 152
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2017-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1339
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 295269
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 58195
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1953
                        }
                    ],
                    "id": 153
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1389
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 243419
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 65045
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1722
                        }
                    ],
                    "id": 154
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1188
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 276877
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 41094
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1836
                        }
                    ],
                    "id": 155
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1055
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 422704
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 50822
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2368
                        }
                    ],
                    "id": 156
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 903
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 389882
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 35470
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1882
                        }
                    ],
                    "id": 157
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 113
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 243
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 269158
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 53348
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1432
                        }
                    ],
                    "id": 158
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 177
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 83
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 313868
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 43728
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2421
                        }
                    ],
                    "id": 159
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 324
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 241787
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 26330
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1060
                        }
                    ],
                    "id": 160
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 296
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 364739
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 38883
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1978
                        }
                    ],
                    "id": 161
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 137
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 121
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 342339
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 21115
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1137
                        }
                    ],
                    "id": 162
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 12
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 547
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 244777
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 57387
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1466
                        }
                    ],
                    "id": 163
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 983
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 375648
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 33325
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1786
                        }
                    ],
                    "id": 164
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2018-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1115
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 241736
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 31474
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1763
                        }
                    ],
                    "id": 165
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1433
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 292249
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 51112
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2153
                        }
                    ],
                    "id": 166
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1262
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 344488
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 30372
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1614
                        }
                    ],
                    "id": 167
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1148
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 432103
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 33732
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1420
                        }
                    ],
                    "id": 168
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 707
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 391262
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 43887
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1682
                        }
                    ],
                    "id": 169
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 12
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 471
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 306929
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 28439
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2063
                        }
                    ],
                    "id": 170
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 99
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 162
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 408253
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 31068
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1784
                        }
                    ],
                    "id": 171
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 374
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 219435
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 27128
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 874
                        }
                    ],
                    "id": 172
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 231
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 23
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 288133
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 33574
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1342
                        }
                    ],
                    "id": 173
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 143
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 104
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 221094
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 24873
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1566
                        }
                    ],
                    "id": 174
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 536
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 220366
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 30265
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2016
                        }
                    ],
                    "id": 175
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1016
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 178243
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 15890
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 860
                        }
                    ],
                    "id": 176
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2019-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1125
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 202461
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 20542
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 855
                        }
                    ],
                    "id": 177
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1162
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 240938
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 28820
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1757
                        }
                    ],
                    "id": 178
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1195
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 281513
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 21058
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2015
                        }
                    ],
                    "id": 179
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 940
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 293879
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 36923
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1511
                        }
                    ],
                    "id": 180
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 769
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 230175
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 24320
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1205
                        }
                    ],
                    "id": 181
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 60
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 426
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 168714
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 11127
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 713
                        }
                    ],
                    "id": 182
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 233
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 85
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 319382
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 15965
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1547
                        }
                    ],
                    "id": 183
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 418
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 218010
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 24252
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1251
                        }
                    ],
                    "id": 184
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 314
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 21
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 211228
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 27497
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1508
                        }
                    ],
                    "id": 185
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 95
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 163
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 253822
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 33987
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1884
                        }
                    ],
                    "id": 186
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 627
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 438189
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 32096
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1395
                        }
                    ],
                    "id": 187
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 18
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 710
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 370973
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 18782
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 2002
                        }
                    ],
                    "id": 188
                },
                {
                    "facilityId": 9,
                    "accountId": 7,
                    "date": new Date("2020-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "7rvv8hikk",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "fjtz8617e",
                            "importWizardName": "HDD",
                            "amount": 1109
                        },
                        {
                            "name": "Product 1",
                            "id": "wi0rrlljw",
                            "importWizardName": "Product 1",
                            "amount": 429101
                        },
                        {
                            "name": "Product 2",
                            "id": "5xq8zcrz4",
                            "importWizardName": "Product 2",
                            "amount": 24745
                        },
                        {
                            "name": "Product 3",
                            "id": "r462pd17t",
                            "importWizardName": "Product 3",
                            "amount": 1226
                        }
                    ],
                    "id": 189
                }
            ]
        },
        {
            "facility": {
                "accountId": 7,
                "name": "Better Facility West",
                "country": "US",
                "city": "Hopkins",
                "state": "MINNESOTA",
                "zip": "55343",
                "address": "789 Third St.",
                "naics1": '-28',
                "naics2": '-282',
                "naics3": '-2828',
                "notes": null,
                "unitsOfMeasure": "Custom",
                "energyUnit": "MMBtu",
                "volumeLiquidUnit": "gal",
                "volumeGasUnit": "SCF",
                "massUnit": "lb",
                "sustainabilityQuestions": {
                    "energyReductionGoal": true,
                    "energyReductionPercent": 25,
                    "energyReductionBaselineYear": 2015,
                    "energyReductionTargetYear": 2025,
                    "energyIsAbsolute": true,
                    "greenhouseReductionGoal": false,
                    "greenhouseReductionPercent": 0,
                    "greenhouseReductionBaselineYear": 0,
                    "greenhouseReductionTargetYear": 0,
                    "greenhouseIsAbsolute": true,
                    "renewableEnergyGoal": false,
                    "renewableEnergyPercent": 0,
                    "renewableEnergyBaselineYear": 0,
                    "renewableEnergyTargetYear": 0,
                    "wasteReductionGoal": false,
                    "wasteReductionPercent": 0,
                    "wasteReductionBaselineYear": 0,
                    "wasteReductionTargetYear": 0,
                    "wasteIsAbsolute": true,
                    "waterReductionGoal": false,
                    "waterReductionPercent": 0,
                    "waterReductionBaselineYear": 0,
                    "waterReductionTargetYear": 0,
                    "waterIsAbsolute": true
                },
                "fiscalYear": "calendarYear",
                "fiscalYearMonth": 0,
                "fiscalYearCalendarEnd": true,
                "energyIsSource": true,
                "id": 10,
                "emissionsOutputRate": 498.23,
                "color": "#6012a1",
                "contactEmail": undefined,
                "contactName": undefined,
                "contactPhone": undefined
            },
            "meters": [
                {
                    "meter": {
                        "facilityId": 10,
                        "accountId": 7,
                        "groupId": 12,
                        "meterNumber": "BP123",
                        "accountNumber": 456,
                        "siteToSource": 3,
                        "name": "Electricity",
                        "supplier": "Electric Co.",
                        "source": "Electricity",
                        "group": "group 1",
                        "startingUnit": "kWh",
                        "energyUnit": "kWh",
                        "visible": true,
                        "id": 49,
                        "meterReadingDataApplication": "backward",
                        "emissionsOutputRate": 498.23
                    },
                    "meterData": [
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-01-17T05:00:00.000Z"),
                            "totalEnergyUse": 608583,
                            "totalCost": 46326.42,
                            "checked": false,
                            "totalDemand": 2323.79,
                            "basicCharge": 220,
                            "supplyBlockCharge": 14873.7,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 11618.93,
                            "utilityTax": 863.79,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2499
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-02-16T05:00:00.000Z"),
                            "totalEnergyUse": 624050,
                            "totalCost": 46456.51,
                            "checked": false,
                            "totalDemand": 2200.22,
                            "basicCharge": 220,
                            "supplyBlockCharge": 15619.21,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 11001.08,
                            "utilityTax": 866.22,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2500
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-03-19T04:00:00.000Z"),
                            "totalEnergyUse": 582433,
                            "totalCost": 42650.15,
                            "checked": false,
                            "totalDemand": 1854.33,
                            "basicCharge": 220,
                            "supplyBlockCharge": 13613.27,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 9271.64,
                            "utilityTax": 795.25,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2501
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-04-18T04:00:00.000Z"),
                            "totalEnergyUse": 593160,
                            "totalCost": 44065.57,
                            "checked": false,
                            "totalDemand": 2028.73,
                            "basicCharge": 220,
                            "supplyBlockCharge": 14130.31,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10143.63,
                            "utilityTax": 821.63,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2502
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-05-14T04:00:00.000Z"),
                            "totalEnergyUse": 734522,
                            "totalCost": 55988.85,
                            "checked": false,
                            "totalDemand": 2746.72,
                            "basicCharge": 220,
                            "supplyBlockCharge": 20943.96,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 13733.61,
                            "utilityTax": 1019.3,
                            "latePayment": 1321.97,
                            "meterNumber": "BP123",
                            "id": 2503
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-06-17T04:00:00.000Z"),
                            "totalEnergyUse": 764678,
                            "totalCost": 56736.49,
                            "checked": false,
                            "totalDemand": 2862.22,
                            "basicCharge": 220,
                            "supplyBlockCharge": 22397.48,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 14311.12,
                            "utilityTax": 1057.9,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2504
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-07-16T04:00:00.000Z"),
                            "totalEnergyUse": 789283,
                            "totalCost": 55727.46,
                            "checked": false,
                            "totalDemand": 2426.99,
                            "basicCharge": 220,
                            "supplyBlockCharge": 23583.44,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 12134.94,
                            "utilityTax": 1039.08,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2505
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-08-17T04:00:00.000Z"),
                            "totalEnergyUse": 809207,
                            "totalCost": 56744.88,
                            "checked": false,
                            "totalDemand": 2434.61,
                            "basicCharge": 220,
                            "supplyBlockCharge": 24543.78,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 12173.05,
                            "utilityTax": 1058.05,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2506
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-09-13T04:00:00.000Z"),
                            "totalEnergyUse": 719681,
                            "totalCost": 53529.21,
                            "checked": false,
                            "totalDemand": 2666.5,
                            "basicCharge": 220,
                            "supplyBlockCharge": 20228.62,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 13332.49,
                            "utilityTax": 998.09,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2507
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-10-16T04:00:00.000Z"),
                            "totalEnergyUse": 641825,
                            "totalCost": 48792.47,
                            "checked": false,
                            "totalDemand": 2487.35,
                            "basicCharge": 220,
                            "supplyBlockCharge": 16475.97,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 12436.73,
                            "utilityTax": 909.77,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2508
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-11-13T05:00:00.000Z"),
                            "totalEnergyUse": 709945,
                            "totalCost": 54103.14,
                            "checked": false,
                            "totalDemand": 2873,
                            "basicCharge": 220,
                            "supplyBlockCharge": 19759.35,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 14365,
                            "utilityTax": 1008.8,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2509
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-12-19T05:00:00.000Z"),
                            "totalEnergyUse": 659390,
                            "totalCost": 48444.39,
                            "checked": false,
                            "totalDemand": 2249.7,
                            "basicCharge": 220,
                            "supplyBlockCharge": 17322.6,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 11248.52,
                            "utilityTax": 903.28,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2510
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-01-16T05:00:00.000Z"),
                            "totalEnergyUse": 654420,
                            "totalCost": 48420.27,
                            "checked": false,
                            "totalDemand": 2292.88,
                            "basicCharge": 220,
                            "supplyBlockCharge": 17083.04,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 11464.39,
                            "utilityTax": 902.8299999999999,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2511
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-02-15T05:00:00.000Z"),
                            "totalEnergyUse": 685615,
                            "totalCost": 49177.97,
                            "checked": false,
                            "totalDemand": 2140.87,
                            "basicCharge": 220,
                            "supplyBlockCharge": 18586.64,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10704.36,
                            "utilityTax": 916.9599999999999,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2512
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-03-19T04:00:00.000Z"),
                            "totalEnergyUse": 606784,
                            "totalCost": 43498.04,
                            "checked": false,
                            "totalDemand": 1786,
                            "basicCharge": 220,
                            "supplyBlockCharge": 14786.99,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 8930,
                            "utilityTax": 811.0600000000001,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2513
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-04-19T04:00:00.000Z"),
                            "totalEnergyUse": 612646,
                            "totalCost": 45248.91,
                            "checked": false,
                            "totalDemand": 2073.13,
                            "basicCharge": 220,
                            "supplyBlockCharge": 15069.54,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10365.67,
                            "utilityTax": 843.7,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2514
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-05-17T04:00:00.000Z"),
                            "totalEnergyUse": 633942,
                            "totalCost": 47488.43,
                            "checked": false,
                            "totalDemand": 2040.96,
                            "basicCharge": 220,
                            "supplyBlockCharge": 16096,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10204.81,
                            "utilityTax": 860.1500000000001,
                            "latePayment": 1357.47,
                            "meterNumber": "BP123",
                            "id": 2515
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-06-14T04:00:00.000Z"),
                            "totalEnergyUse": 718248,
                            "totalCost": 52334.78,
                            "checked": false,
                            "totalDemand": 2445.88,
                            "basicCharge": 220,
                            "supplyBlockCharge": 20159.55,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 12229.4,
                            "utilityTax": 975.8199999999999,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2516
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-07-19T04:00:00.000Z"),
                            "totalEnergyUse": 814041,
                            "totalCost": 56102.85,
                            "checked": false,
                            "totalDemand": 2262,
                            "basicCharge": 220,
                            "supplyBlockCharge": 24776.78,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 11310,
                            "utilityTax": 1046.08,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2517
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-08-16T04:00:00.000Z"),
                            "totalEnergyUse": 760742,
                            "totalCost": 56084.97,
                            "checked": false,
                            "totalDemand": 2772.29,
                            "basicCharge": 220,
                            "supplyBlockCharge": 22207.76,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 13861.46,
                            "utilityTax": 1045.75,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2518
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-09-15T04:00:00.000Z"),
                            "totalEnergyUse": 713185,
                            "totalCost": 51745.3,
                            "checked": false,
                            "totalDemand": 2378.99,
                            "basicCharge": 220,
                            "supplyBlockCharge": 19915.52,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 11894.95,
                            "utilityTax": 964.83,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2519
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-10-18T04:00:00.000Z"),
                            "totalEnergyUse": 586450,
                            "totalCost": 44030.94,
                            "checked": false,
                            "totalDemand": 2086.61,
                            "basicCharge": 220,
                            "supplyBlockCharge": 13806.89,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10433.06,
                            "utilityTax": 820.98,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2520
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-11-19T05:00:00.000Z"),
                            "totalEnergyUse": 609620,
                            "totalCost": 45459.33,
                            "checked": false,
                            "totalDemand": 2143.6,
                            "basicCharge": 220,
                            "supplyBlockCharge": 14923.68,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10718.02,
                            "utilityTax": 847.62,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2521
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-12-18T05:00:00.000Z"),
                            "totalEnergyUse": 643899,
                            "totalCost": 46723.49,
                            "checked": false,
                            "totalDemand": 2061.27,
                            "basicCharge": 220,
                            "supplyBlockCharge": 16575.93,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10306.36,
                            "utilityTax": 871.1899999999999,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2522
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-01-15T05:00:00.000Z"),
                            "totalEnergyUse": 594003,
                            "totalCost": 44061.36,
                            "checked": false,
                            "totalDemand": 2019.77,
                            "basicCharge": 220,
                            "supplyBlockCharge": 14170.94,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10098.85,
                            "utilityTax": 821.5600000000001,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2523
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-02-19T05:00:00.000Z"),
                            "totalEnergyUse": 650773,
                            "totalCost": 47675.97,
                            "checked": false,
                            "totalDemand": 2181.95,
                            "basicCharge": 220,
                            "supplyBlockCharge": 16907.26,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10909.75,
                            "utilityTax": 888.96,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2524
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-03-19T04:00:00.000Z"),
                            "totalEnergyUse": 613806,
                            "totalCost": 45533.53,
                            "checked": false,
                            "totalDemand": 2117.81,
                            "basicCharge": 220,
                            "supplyBlockCharge": 15125.45,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10589.07,
                            "utilityTax": 849,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2525
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-04-19T04:00:00.000Z"),
                            "totalEnergyUse": 502709,
                            "totalCost": 38546.27,
                            "checked": false,
                            "totalDemand": 1817.4,
                            "basicCharge": 220,
                            "supplyBlockCharge": 9770.57,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 9086.98,
                            "utilityTax": 718.72,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2526
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-05-19T04:00:00.000Z"),
                            "totalEnergyUse": 554652,
                            "totalCost": 40175.34,
                            "checked": false,
                            "totalDemand": 1636.4,
                            "basicCharge": 220,
                            "supplyBlockCharge": 12274.23,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 8182.01,
                            "utilityTax": 749.0999999999999,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2527
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-06-16T04:00:00.000Z"),
                            "totalEnergyUse": 608013,
                            "totalCost": 45229.06,
                            "checked": false,
                            "totalDemand": 2113.9,
                            "basicCharge": 220,
                            "supplyBlockCharge": 14846.23,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10569.5,
                            "utilityTax": 843.32,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2528
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-07-18T04:00:00.000Z"),
                            "totalEnergyUse": 688000,
                            "totalCost": 51710.61,
                            "checked": false,
                            "totalDemand": 2614.97,
                            "basicCharge": 220,
                            "supplyBlockCharge": 18701.6,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 13074.83,
                            "utilityTax": 964.19,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2529
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-08-19T04:00:00.000Z"),
                            "totalEnergyUse": 708361,
                            "totalCost": 52065.94,
                            "checked": false,
                            "totalDemand": 2183.95,
                            "basicCharge": 220,
                            "supplyBlockCharge": 19683,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10919.74,
                            "utilityTax": 941.8800000000001,
                            "latePayment": 1551.32,
                            "meterNumber": "BP123",
                            "id": 2530
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-09-14T04:00:00.000Z"),
                            "totalEnergyUse": 520948,
                            "totalCost": 40028.34,
                            "checked": false,
                            "totalDemand": 1932.46,
                            "basicCharge": 220,
                            "supplyBlockCharge": 10649.69,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 9662.29,
                            "utilityTax": 746.35,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2531
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-10-13T04:00:00.000Z"),
                            "totalEnergyUse": 518281,
                            "totalCost": 38737.57,
                            "checked": false,
                            "totalDemand": 1704.83,
                            "basicCharge": 220,
                            "supplyBlockCharge": 10521.14,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 8524.14,
                            "utilityTax": 722.29,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2532
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-11-18T05:00:00.000Z"),
                            "totalEnergyUse": 578323,
                            "totalCost": 43210.25,
                            "checked": false,
                            "totalDemand": 2003.88,
                            "basicCharge": 220,
                            "supplyBlockCharge": 13415.17,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10019.39,
                            "utilityTax": 805.6899999999999,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2533
                        },
                        {
                            "meterId": 49,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-12-15T05:00:00.000Z"),
                            "totalEnergyUse": 574517,
                            "totalCost": 43682.94,
                            "checked": false,
                            "totalDemand": 2133.34,
                            "basicCharge": 220,
                            "supplyBlockCharge": 13231.72,
                            "flatRateCharge": 18750,
                            "transmissionCharge": 10666.72,
                            "utilityTax": 814.5,
                            "latePayment": 0,
                            "meterNumber": "BP123",
                            "id": 2534
                        }
                    ],
                    "meterGroup": {
                        "facilityId": 10,
                        "accountId": 7,
                        "groupType": "Energy",
                        "name": "group 1",
                        "visible": true,
                        "id": 12
                    }
                },
                {
                    "meter": {
                        "facilityId": 10,
                        "accountId": 7,
                        "groupId": 13,
                        "meterNumber": "BP987",
                        "accountNumber": 654,
                        "heatCapacity": 0.001027,
                        "siteToSource": 1,
                        "name": "Natural Gas",
                        "supplier": "ACME Gas",
                        "source": "Natural Gas",
                        "group": "group 2",
                        "startingUnit": "SCF",
                        "energyUnit": "MMBtu",
                        "visible": true,
                        "id": 50,
                        "meterReadingDataApplication": "backward",
                        "emissionsOutputRate": 53.06
                    },
                    "meterData": [
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-01-14T05:00:00.000Z"),
                            "totalVolume": 6223224,
                            "totalEnergyUse": 6391.251047999999,
                            "totalCost": 25875.260000000002,
                            "commodityCharge": 24892.800000000003,
                            "deliveryCharge": 500,
                            "otherCharge": 482.46000000000004,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 6223224,
                            "id": 2535
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-02-10T05:00:00.000Z"),
                            "totalVolume": 5910241,
                            "totalEnergyUse": 6069.817507,
                            "totalCost": 24599.47,
                            "commodityCharge": 23640.800000000003,
                            "deliveryCharge": 500,
                            "otherCharge": 458.67,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 5910241,
                            "id": 2536
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-03-12T04:00:00.000Z"),
                            "totalVolume": 4051716,
                            "totalEnergyUse": 4161.112332,
                            "totalCost": 17024.230000000003,
                            "commodityCharge": 16206.800000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 317.43,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 4051716,
                            "id": 2537
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-04-13T04:00:00.000Z"),
                            "totalVolume": 3483419,
                            "totalEnergyUse": 3577.4713129999996,
                            "totalCost": 14707.83,
                            "commodityCharge": 13933.6,
                            "deliveryCharge": 500,
                            "otherCharge": 274.23,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 3483419,
                            "id": 2538
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-05-09T04:00:00.000Z"),
                            "totalVolume": 1441396,
                            "totalEnergyUse": 1480.313692,
                            "totalCost": 6384.240000000001,
                            "commodityCharge": 5765.200000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 119.03999999999999,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1441396,
                            "id": 2539
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-06-08T04:00:00.000Z"),
                            "totalVolume": 1235241,
                            "totalEnergyUse": 1268.5925069999998,
                            "totalCost": 5544.170000000001,
                            "commodityCharge": 4940.8,
                            "deliveryCharge": 500,
                            "otherCharge": 103.36999999999999,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1235241,
                            "id": 2540
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-07-14T04:00:00.000Z"),
                            "totalVolume": 1196328,
                            "totalEnergyUse": 1228.6288559999998,
                            "totalCost": 5385.62,
                            "commodityCharge": 4785.2,
                            "deliveryCharge": 500,
                            "otherCharge": 100.41999999999999,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1196328,
                            "id": 2541
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-08-09T04:00:00.000Z"),
                            "totalVolume": 1212165,
                            "totalEnergyUse": 1244.893455,
                            "totalCost": 5450.02,
                            "commodityCharge": 4848.400000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 101.62,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1212165,
                            "id": 2542
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-09-11T04:00:00.000Z"),
                            "totalVolume": 1333595,
                            "totalEnergyUse": 1369.6020649999998,
                            "totalCost": 5944.85,
                            "commodityCharge": 5334,
                            "deliveryCharge": 500,
                            "otherCharge": 110.85000000000001,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1333595,
                            "id": 2543
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-10-13T04:00:00.000Z"),
                            "totalVolume": 2742077,
                            "totalEnergyUse": 2816.1130789999997,
                            "totalCost": 11685.89,
                            "commodityCharge": 10968,
                            "deliveryCharge": 500,
                            "otherCharge": 217.89,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 2742077,
                            "id": 2544
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-11-11T05:00:00.000Z"),
                            "totalVolume": 4590234,
                            "totalEnergyUse": 4714.1703179999995,
                            "totalCost": 19219.15,
                            "commodityCharge": 18360.8,
                            "deliveryCharge": 500,
                            "otherCharge": 358.34999999999997,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 4590234,
                            "id": 2545
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2018-12-11T05:00:00.000Z"),
                            "totalVolume": 5181006,
                            "totalEnergyUse": 5320.893161999999,
                            "totalCost": 21627.260000000002,
                            "commodityCharge": 20724,
                            "deliveryCharge": 500,
                            "otherCharge": 403.26,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 5181006,
                            "id": 2546
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-01-11T05:00:00.000Z"),
                            "totalVolume": 6993359,
                            "totalEnergyUse": 7182.179692999999,
                            "totalCost": 29014.190000000002,
                            "commodityCharge": 27973.2,
                            "deliveryCharge": 500,
                            "otherCharge": 540.99,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 6993359,
                            "id": 2547
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-02-13T05:00:00.000Z"),
                            "totalVolume": 6045780,
                            "totalEnergyUse": 6209.01606,
                            "totalCost": 25151.780000000002,
                            "commodityCharge": 24182.800000000003,
                            "deliveryCharge": 500,
                            "otherCharge": 468.97999999999996,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 6045780,
                            "id": 2548
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-03-11T04:00:00.000Z"),
                            "totalVolume": 4690170,
                            "totalEnergyUse": 4816.80459,
                            "totalCost": 19626.350000000002,
                            "commodityCharge": 18760.4,
                            "deliveryCharge": 500,
                            "otherCharge": 365.95,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 4690170,
                            "id": 2549
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-04-13T04:00:00.000Z"),
                            "totalVolume": 2836551,
                            "totalEnergyUse": 2913.1378769999997,
                            "totalCost": 12071.08,
                            "commodityCharge": 11346,
                            "deliveryCharge": 500,
                            "otherCharge": 225.08,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 2836551,
                            "id": 2550
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-05-13T04:00:00.000Z"),
                            "totalVolume": 2039110,
                            "totalEnergyUse": 2094.16597,
                            "totalCost": 8820.87,
                            "commodityCharge": 8156.400000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 164.47000000000003,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 2039110,
                            "id": 2551
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-06-11T04:00:00.000Z"),
                            "totalVolume": 1335252,
                            "totalEnergyUse": 1371.303804,
                            "totalCost": 5951.77,
                            "commodityCharge": 5340.8,
                            "deliveryCharge": 500,
                            "otherCharge": 110.97,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1335252,
                            "id": 2552
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-07-09T04:00:00.000Z"),
                            "totalVolume": 1158922,
                            "totalEnergyUse": 1190.212894,
                            "totalCost": 5233.18,
                            "commodityCharge": 4635.6,
                            "deliveryCharge": 500,
                            "otherCharge": 97.58,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1158922,
                            "id": 2553
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-08-08T04:00:00.000Z"),
                            "totalVolume": 1323116,
                            "totalEnergyUse": 1358.8401319999998,
                            "totalCost": 5902.45,
                            "commodityCharge": 5292.400000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 110.05,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1323116,
                            "id": 2554
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-09-13T04:00:00.000Z"),
                            "totalVolume": 1366510,
                            "totalEnergyUse": 1403.4057699999998,
                            "totalCost": 6079.36,
                            "commodityCharge": 5466,
                            "deliveryCharge": 500,
                            "otherCharge": 113.36,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1366510,
                            "id": 2555
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-10-14T04:00:00.000Z"),
                            "totalVolume": 3012813,
                            "totalEnergyUse": 3094.158951,
                            "totalCost": 12789.67,
                            "commodityCharge": 12051.2,
                            "deliveryCharge": 500,
                            "otherCharge": 238.47,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 3012813,
                            "id": 2556
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-11-08T05:00:00.000Z"),
                            "totalVolume": 4413744,
                            "totalEnergyUse": 4532.915088,
                            "totalCost": 18499.739999999998,
                            "commodityCharge": 17654.8,
                            "deliveryCharge": 500,
                            "otherCharge": 344.94,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 4413744,
                            "id": 2557
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2019-12-13T05:00:00.000Z"),
                            "totalVolume": 5147909,
                            "totalEnergyUse": 5286.902542999999,
                            "totalCost": 21492.34,
                            "commodityCharge": 20591.600000000002,
                            "deliveryCharge": 500,
                            "otherCharge": 400.74,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 5147909,
                            "id": 2558
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-01-08T05:00:00.000Z"),
                            "totalVolume": 6024596,
                            "totalEnergyUse": 6187.2600919999995,
                            "totalCost": 25065.37,
                            "commodityCharge": 24098,
                            "deliveryCharge": 500,
                            "otherCharge": 467.37,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 6024596,
                            "id": 2559
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-02-08T05:00:00.000Z"),
                            "totalVolume": 5609084,
                            "totalEnergyUse": 5760.529267999999,
                            "totalCost": 23371.78,
                            "commodityCharge": 22436,
                            "deliveryCharge": 500,
                            "otherCharge": 435.78,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 5609084,
                            "id": 2560
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-03-10T04:00:00.000Z"),
                            "totalVolume": 3714149,
                            "totalEnergyUse": 3814.4310229999996,
                            "totalCost": 15648.17,
                            "commodityCharge": 14856.400000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 291.77,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 3714149,
                            "id": 2561
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-04-10T04:00:00.000Z"),
                            "totalVolume": 2574479,
                            "totalEnergyUse": 2643.989933,
                            "totalCost": 11002.75,
                            "commodityCharge": 10297.6,
                            "deliveryCharge": 500,
                            "otherCharge": 205.15,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 2574479,
                            "id": 2562
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-05-10T04:00:00.000Z"),
                            "totalVolume": 1570800,
                            "totalEnergyUse": 1613.2115999999999,
                            "totalCost": 7236.820000000001,
                            "commodityCharge": 6283.200000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 128.88,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1570800,
                            "id": 2563
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-06-09T04:00:00.000Z"),
                            "totalVolume": 1126454,
                            "totalEnergyUse": 1156.868258,
                            "totalCost": 5100.700000000001,
                            "commodityCharge": 4505.6,
                            "deliveryCharge": 500,
                            "otherCharge": 95.10000000000001,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1126454,
                            "id": 2564
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-07-11T04:00:00.000Z"),
                            "totalVolume": 1217026,
                            "totalEnergyUse": 1249.8857019999998,
                            "totalCost": 5469.99,
                            "commodityCharge": 4868,
                            "deliveryCharge": 500,
                            "otherCharge": 101.99,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1217026,
                            "id": 2565
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-08-10T04:00:00.000Z"),
                            "totalVolume": 1221124,
                            "totalEnergyUse": 1254.0943479999999,
                            "totalCost": 5486.700000000001,
                            "commodityCharge": 4884.400000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 102.30000000000001,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1221124,
                            "id": 2566
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-09-13T04:00:00.000Z"),
                            "totalVolume": 1599609,
                            "totalEnergyUse": 1642.798443,
                            "totalCost": 7029.47,
                            "commodityCharge": 6398.400000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 131.07,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 1599609,
                            "id": 2567
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-10-14T04:00:00.000Z"),
                            "totalVolume": 3284196,
                            "totalEnergyUse": 3372.869292,
                            "totalCost": 13895.490000000002,
                            "commodityCharge": 13136.400000000001,
                            "deliveryCharge": 500,
                            "otherCharge": 259.09000000000003,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 3284196,
                            "id": 2568
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-11-08T05:00:00.000Z"),
                            "totalVolume": 3630551,
                            "totalEnergyUse": 3728.5758769999998,
                            "totalCost": 15307.42,
                            "commodityCharge": 14522,
                            "deliveryCharge": 500,
                            "otherCharge": 285.42,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 3630551,
                            "id": 2569
                        },
                        {
                            "meterId": 50,
                            "facilityId": 10,
                            "accountId": 7,
                            "readDate": new Date("2020-12-08T05:00:00.000Z"),
                            "totalVolume": 5504194,
                            "totalEnergyUse": 5652.807237999999,
                            "totalCost": 22944.210000000003,
                            "commodityCharge": 22016.4,
                            "deliveryCharge": 500,
                            "otherCharge": 427.81,
                            "checked": false,
                            "meterNumber": "BP987",
                            "totalImportConsumption": 5504194,
                            "id": 2570
                        }
                    ],
                    "meterGroup": {
                        "facilityId": 10,
                        "accountId": 7,
                        "groupType": "Energy",
                        "name": "group 2",
                        "visible": true,
                        "id": 13
                    }
                }
            ],
            "predictors": [
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1355
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 107379
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 230
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 53476
                        }
                    ],
                    "id": 190
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1258
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 103408
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 509
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 55460
                        }
                    ],
                    "id": 191
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 873
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 109988
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 533
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 40756
                        }
                    ],
                    "id": 192
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 683
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 90201
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 552
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 65902
                        }
                    ],
                    "id": 193
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 229
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 42
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 122526
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 633
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 57895
                        }
                    ],
                    "id": 194
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 341
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 113003
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 655
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 54057
                        }
                    ],
                    "id": 195
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 427
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 80498
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 499
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 58588
                        }
                    ],
                    "id": 196
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 387
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 88966
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 515
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 53759
                        }
                    ],
                    "id": 197
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 189
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 68
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 88253
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 324
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 57097
                        }
                    ],
                    "id": 198
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 470
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 154983
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 327
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 61240
                        }
                    ],
                    "id": 199
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 949
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 147299
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 633
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 57474
                        }
                    ],
                    "id": 200
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2018-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1064
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 156695
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 388
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 66729
                        }
                    ],
                    "id": 201
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1429
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 140423
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 499
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 54819
                        }
                    ],
                    "id": 202
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1308
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 153781
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 559
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 53723
                        }
                    ],
                    "id": 203
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 977
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 134965
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 403
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 52392
                        }
                    ],
                    "id": 204
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 435
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 124123
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 353
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 47399
                        }
                    ],
                    "id": 205
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 32
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 221
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 103529
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 555
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 38968
                        }
                    ],
                    "id": 206
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 216
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 124321
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 721
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 40831
                        }
                    ],
                    "id": 207
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 403
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 102860
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 258
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 53328
                        }
                    ],
                    "id": 208
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 255
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 96750
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 375
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 45989
                        }
                    ],
                    "id": 209
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 162
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 23
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 92502
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 281
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 54413
                        }
                    ],
                    "id": 210
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 462
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 155825
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 692
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 51630
                        }
                    ],
                    "id": 211
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 900
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 83179
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 524
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 37717
                        }
                    ],
                    "id": 212
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2019-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1179
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 77884
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 511
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 74642
                        }
                    ],
                    "id": 213
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-01-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1243
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 91456
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 649
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 45841
                        }
                    ],
                    "id": 214
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-02-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1139
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 123016
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 699
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 49553
                        }
                    ],
                    "id": 215
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-03-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 706
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 86820
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 665
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 72315
                        }
                    ],
                    "id": 216
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-04-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 451
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 60582
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 358
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 52382
                        }
                    ],
                    "id": 217
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-05-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 93
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 139
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 58868
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 604
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 31303
                        }
                    ],
                    "id": 218
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-06-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 349
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 77113
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 655
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 30601
                        }
                    ],
                    "id": 219
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-07-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 464
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 84729
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 534
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 42406
                        }
                    ],
                    "id": 220
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-08-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 361
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 0
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 121876
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 426
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 60757
                        }
                    ],
                    "id": 221
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-09-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 107
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 97
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 100933
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 529
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 47123
                        }
                    ],
                    "id": 222
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-10-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 13
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 552
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 121526
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 401
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 62567
                        }
                    ],
                    "id": 223
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-11-01T04:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 4
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 665
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 111698
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 525
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 45412
                        }
                    ],
                    "id": 224
                },
                {
                    "facilityId": 10,
                    "accountId": 7,
                    "date": new Date("2020-12-01T05:00:00.000Z"),
                    "predictors": [
                        {
                            "name": "CDD",
                            "id": "5f2cn47h4",
                            "importWizardName": "CDD",
                            "amount": 0
                        },
                        {
                            "name": "HDD",
                            "id": "5anbcdqmc",
                            "importWizardName": "HDD",
                            "amount": 1110
                        },
                        {
                            "name": "Product 1",
                            "id": "hdji68cbe",
                            "importWizardName": "Product 1",
                            "amount": 77831
                        },
                        {
                            "name": "Product 2",
                            "id": "y61u35ozl",
                            "importWizardName": "Product 2",
                            "amount": 415
                        },
                        {
                            "name": "Product 3",
                            "id": "k68qdgx6k",
                            "importWizardName": "Product 3",
                            "amount": 59849
                        }
                    ],
                    "id": 225
                }
            ]
        }
    ]
}