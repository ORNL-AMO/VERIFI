import { ConvertValue } from "../calculations/conversions/convertValue";

export interface GlobalWarmingPotential {
    value: number,
    label: string,
    display: string,
    gwp_ar4: number,
    gwp_ar5: number,
    gwp_ar6: number,
    blend?: string
};

export const GlobalWarmingPotentials: Array<GlobalWarmingPotential> = [
    {
        value: 102,
        label: 'CH4 - non-fossil',
        display: 'CH&#8324; - non-fossil',
        gwp_ar4: 25,
        gwp_ar5: 28,
        gwp_ar6: 27
    },
    {
        value: 101,
        label: 'CO2',
        display: 'CO&#8322;',
        gwp_ar4: 1,
        gwp_ar5: 1,
        gwp_ar6: 1
    },
    {
        value: 102,
        label: 'CH4 - fossil',
        display: 'CH&#8324; - fossil',
        gwp_ar4: 25,
        gwp_ar5: 30,
        gwp_ar6: 29.8
    },
    {
        value: 103,
        label: 'N2O',
        display: 'N&#8322;O',
        gwp_ar4: 298,
        gwp_ar5: 265,
        gwp_ar6: 273
    },
    {
        value: 1,
        label: 'HFC-23',
        display: 'HFC-23',
        gwp_ar4: 14800,
        gwp_ar5: 12400,
        gwp_ar6: 14600
    },
    {
        value: 2,
        label: 'HFC-32',
        display: 'HFC-32',
        gwp_ar4: 675,
        gwp_ar5: 677,
        gwp_ar6: 771
    },
    {
        value: 3,
        label: 'HFC-41',
        display: 'HFC-41',
        gwp_ar4: 92,
        gwp_ar5: 116,
        gwp_ar6: 135
    },
    {
        value: 4,
        label: 'HFC-125',
        display: 'HFC-125',
        gwp_ar4: 3500,
        gwp_ar5: 3170,
        gwp_ar6: 3740
    },
    {
        value: 5,
        label: 'HFC-134',
        display: 'HFC-134',
        gwp_ar4: 1100,
        gwp_ar5: 1120,
        gwp_ar6: 1300
    },
    {
        value: 6,
        label: 'HFC-134a',
        display: 'HFC-134a',
        gwp_ar4: 1430,
        gwp_ar5: 1300,
        gwp_ar6: 1530
    },
    {
        value: 7,
        label: 'HFC-143',
        display: 'HFC-143',
        gwp_ar4: 353,
        gwp_ar5: 328,
        gwp_ar6: 364
    },
    {
        value: 8,
        label: 'HFC-143a',
        display: 'HFC-143a',
        gwp_ar4: 4470,
        gwp_ar5: 4800,
        gwp_ar6: 5810
    },
    {
        value: 9,
        label: 'HFC-152',
        display: 'HFC-152',
        gwp_ar4: 53,
        gwp_ar5: 16,
        gwp_ar6: 21.5
    },
    {
        value: 10,
        label: 'HFC-152a',
        display: 'HFC-152a',
        gwp_ar4: 124,
        gwp_ar5: 138,
        gwp_ar6: 164
    },
    {
        value: 11,
        label: 'HFC-161',
        display: 'HFC-161',
        gwp_ar4: 12,
        gwp_ar5: 4,
        gwp_ar6: 4.68
    },
    {
        value: 12,
        label: 'HFC-227ea',
        display: 'HFC-227ea',
        gwp_ar4: 3220,
        gwp_ar5: 3350,
        gwp_ar6: 3600
    },
    {
        value: 13,
        label: 'HFC-236cb',
        display: 'HFC-236cb',
        gwp_ar4: 1340,
        gwp_ar5: 1210,
        gwp_ar6: 1350
    },
    {
        value: 14,
        label: 'HFC-236ea',
        display: 'HFC-236ea',
        gwp_ar4: 1370,
        gwp_ar5: 1330,
        gwp_ar6: 1500
    },
    {
        value: 15,
        label: 'HFC-236fa',
        display: 'HFC-236fa',
        gwp_ar4: 9810,
        gwp_ar5: 8060,
        gwp_ar6: 8690
    },
    {
        value: 16,
        label: 'HFC-245ca',
        display: 'HFC-245ca',
        gwp_ar4: 693,
        gwp_ar5: 716,
        gwp_ar6: 787
    },
    {
        value: 17,
        label: 'HFC-245fa',
        display: 'HFC-245fa',
        gwp_ar4: 1030,
        gwp_ar5: 858,
        gwp_ar6: 962
    },
    {
        value: 18,
        label: 'HFC-365mfc',
        display: 'HFC-365mfc',
        gwp_ar4: 794,
        gwp_ar5: 804,
        gwp_ar6: 914
    },
    {
        value: 19,
        label: 'HFC-43-10mee',
        display: 'HFC-43-10mee',
        gwp_ar4: 1640,
        gwp_ar5: 1650,
        gwp_ar6: 1600
    },
    {
        value: 20,
        label: 'SF6',
        display: 'SF&#x2086;',
        gwp_ar4: 22800,
        gwp_ar5: 23500,
        gwp_ar6: 24300
    },
    {
        value: 21,
        label: 'NF3',
        display: 'NF&#8323;',
        gwp_ar4: 17200,
        gwp_ar5: 16100,
        gwp_ar6: 17400
    },
    {
        value: 22,
        label: 'CF4',
        display: 'CF&#x2084;',
        gwp_ar4: 7390,
        gwp_ar5: 6630,
        gwp_ar6: 7380
    },
    {
        value: 23,
        label: 'C2F6',
        display: 'C&#x2082;F&#x2086;',
        gwp_ar4: 12200,
        gwp_ar5: 11100,
        gwp_ar6: 12400
    },
    {
        value: 24,
        label: 'C3F8',
        display: 'C&#8323;F&#x2088;',
        gwp_ar4: 8830,
        gwp_ar5: 8900,
        gwp_ar6: 9290
    },
    //TODO: CHECK!
    {
        value: 25,
        label: 'c-C4F8',
        display: 'c-C&#x2084;F&#x2088;',
        gwp_ar4: 3500,
        gwp_ar5: 3500,
        gwp_ar6: 3500
    },
    {
        value: 26,
        label: 'C4F10',
        display: 'C&#x2084;F&#8321;&#8320;',
        gwp_ar4: 8860,
        gwp_ar5: 9200,
        gwp_ar6: 10000
    },
    {
        value: 27,
        label: 'C5F12',
        display: 'C&#8325;F&#8321;&#8322;',
        gwp_ar4: 9160,
        gwp_ar5: 8550,
        gwp_ar6: 9220
    },
    {
        value: 28,
        label: 'C6F14',
        display: 'C&#x2086;F&#8321;&#8324;',
        gwp_ar4: 9300,
        gwp_ar5: 7910,
        gwp_ar6: 8620
    },
    {
        value: 29,
        label: 'C10F18',
        display: 'C&#8321;&#8320;F&#8321;&#8328;',
        //>7500?
        gwp_ar4: 7500,
        gwp_ar5: 7190,
        gwp_ar6: 7480
    },
    //TODO: Check blends GWP values
    {
        value: 30,
        label: 'R-401A',
        display: 'R-401A',
        blend: '53% HCFC-22 , 34% HCFC-124 , 13% HFC-152a',
        gwp_ar4: 16,
        gwp_ar5: 16,
        gwp_ar6: 16
    },
    {
        value: 31,
        label: 'R-401B',
        display: 'R-401B',
        blend: '61% HCFC-22 , 28% HCFC-124 , 11% HFC-152a',
        gwp_ar4: 14,
        gwp_ar5: 14,
        gwp_ar6: 14
    },
    {
        value: 32,
        label: 'R-401C',
        display: 'R-401C',
        blend: '33% HCFC-22 , 52% HCFC-124 , 15% HFC-152a',
        gwp_ar4: 19,
        gwp_ar5: 19,
        gwp_ar6: 19
    },
    {
        value: 33,
        label: 'R-402A',
        display: 'R-402A',
        blend: '38% HCFC-22 , 6% HFC-125 , 2% propane',
        gwp_ar4: 2100,
        gwp_ar5: 2100,
        gwp_ar6: 2100
    },
    {
        value: 34,
        label: 'R-402B',
        display: 'R-402B',
        blend: '6% HCFC-22 , 38% HFC-125 , 2% propane',
        gwp_ar4: 1330,
        gwp_ar5: 1330,
        gwp_ar6: 1330
    },
    {
        value: 35,
        label: 'R-404A',
        display: 'R-404A',
        blend: '44% HFC-125 , 4% HFC-134a , 52% HFC 143a',
        gwp_ar4: 3922,
        gwp_ar5: 3922,
        gwp_ar6: 3922
    },
    {
        value: 36,
        label: 'R-406A',
        display: 'R-406A',
        blend: '55% HCFC-22 , 41% HCFC-142b , 4% isobutane',
        gwp_ar4: 0,
        gwp_ar5: 0,
        gwp_ar6: 0
    },
    {
        value: 37,
        label: 'R-407A',
        display: 'R-407A',
        blend: '20% HFC-32 , 40% HFC-125 , 40% HFC-134a',
        gwp_ar4: 2107,
        gwp_ar5: 2107,
        gwp_ar6: 2107
    },
    {
        value: 38,
        label: 'R-407B',
        display: 'R-407B',
        blend: '10% HFC-32 , 70% HFC-125 , 20% HFC-134a',
        gwp_ar4: 2804,
        gwp_ar5: 2804,
        gwp_ar6: 2804
    },
    {
        value: 39,
        label: 'R-407C',
        display: 'R-407C',
        blend: '23% HFC-32 , 25% HFC-125 , 52% HFC-134a',
        gwp_ar4: 1774,
        gwp_ar5: 1774,
        gwp_ar6: 1774
    },
    {
        value: 40,
        label: 'R-407D',
        display: 'R-407D',
        blend: '15% HFC-32 , 15% HFC-125 , 70% HFC-134a',
        gwp_ar4: 1627,
        gwp_ar5: 1627,
        gwp_ar6: 1627
    },
    {
        value: 41,
        label: 'R-407E',
        display: 'R-407E',
        blend: '25% HFC-32 , 15% HFC-125 , 60% HFC-134a',
        gwp_ar4: 1552,
        gwp_ar5: 1552,
        gwp_ar6: 1552
    },
    {
        value: 42,
        label: 'R-408A',
        display: 'R-408A',
        blend: '47% HCFC-22 , 7% HFC-125 , 46% HFC 143a',
        gwp_ar4: 2301,
        gwp_ar5: 2301,
        gwp_ar6: 2301
    },
    {
        value: 43,
        label: 'R-409A',
        display: 'R-409A',
        blend: '60% HCFC-22 , 25% HCFC-124 , 15% HCFC-142b',
        gwp_ar4: 0,
        gwp_ar5: 0,
        gwp_ar6: 0
    },
    {
        value: 44,
        label: 'R-410A',
        display: 'R-410A',
        blend: '50% HFC-32 , 50% HFC-125',
        gwp_ar4: 2088,
        gwp_ar5: 2088,
        gwp_ar6: 2088
    },
    {
        value: 45,
        label: 'R-411A',
        display: 'R-411A',
        blend: '87.5% HCFC-22 , 11 HFC-152a , 1.5% propylene',
        gwp_ar4: 14,
        gwp_ar5: 14,
        gwp_ar6: 14
    },
    {
        value: 46,
        label: 'R-411B',
        display: 'R-411B',
        blend: '94% HCFC-22 , 3% HFC-152a , 3% propylene',
        gwp_ar4: 4,
        gwp_ar5: 4,
        gwp_ar6: 4
    },
    {
        value: 47,
        label: 'R-413A',
        display: 'R-413A',
        blend: '88% HFC-134a , 9% PFC-218 , 3% isobutane',
        gwp_ar4: 2053,
        gwp_ar5: 2053,
        gwp_ar6: 2053
    },
    {
        value: 48,
        label: 'R-414A',
        display: 'R-414A',
        blend: '51% HCFC-22 , 28.5% HCFC-124 , 16.5% HCFC-142b',
        gwp_ar4: 0,
        gwp_ar5: 0,
        gwp_ar6: 0
    },
    {
        value: 49,
        label: 'R-414B',
        display: 'R-414B',
        blend: '5% HCFC-22 , 39% HCFC-124 , 9.5% HCFC-142b',
        gwp_ar4: 0,
        gwp_ar5: 0,
        gwp_ar6: 0
    },
    {
        value: 50,
        label: 'R-417A',
        display: 'R-417A',
        blend: '46.6% HFC-125 , 5% HFC-134a , 3.4% butane',
        gwp_ar4: 2346,
        gwp_ar5: 2346,
        gwp_ar6: 2346
    },
    {
        value: 51,
        label: 'R-422A',
        display: 'R-422A',
        blend: '85.1% HFC-125 , 11.5% HFC-134a , 3.4% isobutane',
        gwp_ar4: 2346,
        gwp_ar5: 2346,
        gwp_ar6: 2346
    },
    {
        value: 52,
        label: 'R-422D',
        display: 'R-422D',
        blend: '65.1% HFC-125 , 31.5% HFC-134a , 3.4% isobutane',
        gwp_ar4: 2729,
        gwp_ar5: 2729,
        gwp_ar6: 2729
    },
    {
        value: 53,
        label: 'R-423A',
        display: 'R-423A',
        blend: '47.5% HFC-227ea , 52.5% HFC-134a',
        gwp_ar4: 2280,
        gwp_ar5: 2280,
        gwp_ar6: 2280
    },
    {
        value: 54,
        label: 'R-424A',
        display: 'R-424A',
        blend: '50.5% HFC-125, 47% HFC-134a, 2.5% butane/pentane',
        gwp_ar4: 2440,
        gwp_ar5: 2440,
        gwp_ar6: 2440
    },
    {
        value: 55,
        label: 'R-426A',
        display: 'R-426A',
        blend: '5.1% HFC-125, 93% HFC-134a, 1.9% butane/pentane',
        gwp_ar4: 1508,
        gwp_ar5: 1508,
        gwp_ar6: 1508
    },
    {
        value: 56,
        label: 'R-428A',
        display: 'R-428A',
        blend: '77.5% HFC-125 , 2% HFC-143a , 1.9% isobutane',
        gwp_ar4: 3607,
        gwp_ar5: 3607,
        gwp_ar6: 3607
    },
    {
        value: 57,
        label: 'R-434A',
        display: 'R-434A',
        blend: '63.2% HFC-125, 16% HFC-134a, 18% HFC-143a, 2.8% isobutane',
        gwp_ar4: 3245,
        gwp_ar5: 3245,
        gwp_ar6: 3245
    },
    {
        value: 58,
        label: 'R-500',
        display: 'R-500',
        blend: '73.8% CFC-12 , 26.2% HFC-152a , 48.8% HCFC-22',
        gwp_ar4: 32,
        gwp_ar5: 32,
        gwp_ar6: 32
    },
    {
        value: 59,
        label: 'R-502',
        display: 'R-502',
        blend: '48.8% HCFC-22 , 51.2% CFC-115',
        gwp_ar4: 0,
        gwp_ar5: 0,
        gwp_ar6: 0
    },
    {
        value: 60,
        label: 'R-504',
        display: 'R-504',
        blend: '48.2% HFC-32 , 51.8% CFC-115',
        gwp_ar4: 325,
        gwp_ar5: 325,
        gwp_ar6: 325
    },
    {
        value: 61,
        label: 'R-507',
        display: 'R-507',
        blend: '5% HFC-125 , 5% HFC143a',
        gwp_ar4: 3985,
        gwp_ar5: 3985,
        gwp_ar6: 3985
    },
    {
        value: 62,
        label: 'R-508A',
        display: 'R-508A',
        blend: '39% HFC-23 , 61% PFC-116',
        gwp_ar4: 13214,
        gwp_ar5: 13214,
        gwp_ar6: 13214
    },
    {
        value: 63,
        label: 'R-508B',
        display: 'R-508B',
        blend: '46% HFC-23 , 54% PFC-116',
        gwp_ar4: 13396,
        gwp_ar5: 13396,
        gwp_ar6: 13396
    }
]