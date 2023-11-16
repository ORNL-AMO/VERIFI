export interface GlobalWarmingPotential {
    value: number,
    label: string,
    display: string,
    gwp: number,
    blend?: string
};

export const GlobalWarmingPotentials: Array<GlobalWarmingPotential> = [
    {
        value: 1,
        label: 'HFC-23',
        display: 'HFC-23',
        gwp: 14800
    },
    {
        value: 2,
        label: 'HFC-32',
        display: 'HFC-32',
        gwp: 675
    },
    {
        value: 3,
        label: 'HFC-41',
        display: 'HFC-41',
        gwp: 92
    },
    {
        value: 4,
        label: 'HFC-125',
        display: 'HFC-125',
        gwp: 3500
    },
    {
        value: 5,
        label: 'HFC-134',
        display: 'HFC-134',
        gwp: 1100
    },
    {
        value: 6,
        label: 'HFC-134a',
        display: 'HFC-134a',
        gwp: 1430
    },
    {
        value: 7,
        label: 'HFC-143',
        display: 'HFC-143',
        gwp: 353
    },
    {
        value: 8,
        label: 'HFC-143a',
        display: 'HFC-143a',
        gwp: 4470
    },
    {
        value: 9,
        label: 'HFC-152',
        display: 'HFC-152',
        gwp: 53
    },
    {
        value: 10,
        label: 'HFC-152a',
        display: 'HFC-152a',
        gwp: 124
    },
    {
        value: 11,
        label: 'HFC-161',
        display: 'HFC-161',
        gwp: 12
    },
    {
        value: 12,
        label: 'HFC-227ea',
        display: 'HFC-227ea',
        gwp: 3220
    },
    {
        value: 13,
        label: 'HFC-236cb',
        display: 'HFC-236cb',
        gwp: 1340
    },
    {
        value: 14,
        label: 'HFC-236ea',
        display: 'HFC-236ea',
        gwp: 1370
    },
    {
        value: 15,
        label: 'HFC-236fa',
        display: 'HFC-236fa',
        gwp: 9810
    },
    {
        value: 16,
        label: 'HFC-245ca',
        display: 'HFC-245ca',
        gwp: 693
    },
    {
        value: 17,
        label: 'HFC-245fa',
        display: 'HFC-245fa',
        gwp: 1030
    },
    {
        value: 18,
        label: 'HFC-365mfc',
        display: 'HFC-365mfc',
        gwp: 794
    },
    {
        value: 19,
        label: 'HFC-43-10mee',
        display: 'HFC-43-10mee',
        gwp: 1640
    },
    {
        value: 20,
        label: 'SF6',
        display: 'SF<sub>6</sub>',
        gwp: 22800
    },
    {
        value: 21,
        label: 'NF3',
        display: 'NF<sub>3</sub>',
        gwp: 17200
    },
    {
        value: 22,
        label: 'CF4',
        display: 'CF<sub>4</sub>',
        gwp: 7390
    },
    {
        value: 23,
        label: 'C2F6',
        display: 'C<sub>2</sub>F<sub>6</sub>',
        gwp: 12200
    },
    {
        value: 24,
        label: 'C3F8',
        display: 'C<sub>3</sub>F<sub>8</sub>',
        gwp: 8830
    },
    {
        value: 25,
        label: 'c-C4F8',
        display: 'c-C<sub>4</sub>F<sub>8</sub>',
        gwp: 3500
    },
    {
        value: 26,
        label: 'C4F10',
        display: 'C<sub>4</sub>F<sub>10</sub>',
        gwp: 8860
    },
    {
        value: 27,
        label: 'C5F12',
        display: 'C<sub>5</sub>F<sub>12</sub>',
        gwp: 9160
    },
    {
        value: 28,
        label: 'C6F14',
        display: 'C<sub>6</sub>F<sub>14</sub>',
        gwp: 9300
    },
    {
        value: 29,
        label: 'C10F18',
        display: 'C<sub>10</sub>F<sub>18</sub>',
        //>7500?
        gwp: 7500
    },
    {
        value: 30,
        label: 'R-401A',
        display: 'R-401A',
        blend: '53% HCFC-22 , 34% HCFC-124 , 13% HFC-152a',
        gwp: 16
    },
    {
        value: 31,
        label: 'R-401B',
        display: 'R-401B',
        blend: '61% HCFC-22 , 28% HCFC-124 , 11% HFC-152a',
        gwp: 14
    },
    {
        value: 32,
        label: 'R-401C',
        display: 'R-401C',
        blend: '33% HCFC-22 , 52% HCFC-124 , 15% HFC-152a',
        gwp: 19
    },
    {
        value: 33,
        label: 'R-402A',
        display: 'R-402A',
        blend: '38% HCFC-22 , 6% HFC-125 , 2% propane',
        gwp: 2100
    },
    {
        value: 34,
        label: 'R-402B',
        display: 'R-402B',
        blend: '6% HCFC-22 , 38% HFC-125 , 2% propane',
        gwp: 1330
    },
    {
        value: 35,
        label: 'R-404A',
        display: 'R-404A',
        blend: '44% HFC-125 , 4% HFC-134a , 52% HFC 143a',
        gwp: 3922
    },
    {
        value: 36,
        label: 'R-406A',
        display: 'R-406A',
        blend: '55% HCFC-22 , 41% HCFC-142b , 4% isobutane',
        gwp: 0
    },
    {
        value: 37,
        label: 'R-407A',
        display: 'R-407A',
        blend: '20% HFC-32 , 40% HFC-125 , 40% HFC-134a',
        gwp: 2107
    },
    {
        value: 38,
        label: 'R-407B',
        display: 'R-407B',
        blend: '10% HFC-32 , 70% HFC-125 , 20% HFC-134a',
        gwp: 2804
    },
    {
        value: 39,
        label: 'R-407C',
        display: 'R-407C',
        blend: '23% HFC-32 , 25% HFC-125 , 52% HFC-134a',
        gwp: 1774
    },
    {
        value: 40,
        label: 'R-407D',
        display: 'R-407D',
        blend: '15% HFC-32 , 15% HFC-125 , 70% HFC-134a',
        gwp: 1627
    },
    {
        value: 41,
        label: 'R-407E',
        display: 'R-407E',
        blend: '25% HFC-32 , 15% HFC-125 , 60% HFC-134a',
        gwp: 1552
    },
    {
        value: 42,
        label: 'R-408A',
        display: 'R-408A',
        blend: '47% HCFC-22 , 7% HFC-125 , 46% HFC 143a',
        gwp: 2301
    },
    {
        value: 43,
        label: 'R-409A',
        display: 'R-409A',
        blend: '60% HCFC-22 , 25% HCFC-124 , 15% HCFC-142b',
        gwp: 0
    },
    {
        value: 44,
        label: 'R-410A',
        display: 'R-410A',
        blend: '50% HFC-32 , 50% HFC-125',
        gwp: 2088
    },
    {
        value: 45,
        label: 'R-411A',
        display: 'R-411A',
        blend: '87.5% HCFC-22 , 11 HFC-152a , 1.5% propylene',
        gwp: 14
    },
    {
        value: 46,
        label: 'R-411B',
        display: 'R-411B',
        blend: '94% HCFC-22 , 3% HFC-152a , 3% propylene',
        gwp: 4
    },
    {
        value: 47,
        label: 'R-413A',
        display: 'R-413A',
        blend: '88% HFC-134a , 9% PFC-218 , 3% isobutane',
        gwp: 2053
    },
    {
        value: 48,
        label: 'R-414A',
        display: 'R-414A',
        blend: '51% HCFC-22 , 28.5% HCFC-124 , 16.5% HCFC-142b',
        gwp: 0
    },
    {
        value: 49,
        label: 'R-414B',
        display: 'R-414B',
        blend: '5% HCFC-22 , 39% HCFC-124 , 9.5% HCFC-142b',
        gwp: 0
    },
    {
        value: 50,
        label: 'R-417A',
        display: 'R-417A',
        blend: '46.6% HFC-125 , 5% HFC-134a , 3.4% butane',
        gwp: 2346
    },
    {
        value: 51,
        label: 'R-422A',
        display: 'R-422A',
        blend: '85.1% HFC-125 , 11.5% HFC-134a , 3.4% isobutane',
        gwp: 2346
    },
    {
        value: 52,
        label: 'R-422D',
        display: 'R-422D',
        blend: '65.1% HFC-125 , 31.5% HFC-134a , 3.4% isobutane',
        gwp: 2729
    },
    {
        value: 53,
        label: 'R-423A',
        display: 'R-423A',
        blend: '47.5% HFC-227ea , 52.5% HFC-134a',
        gwp: 2280
    },
    {
        value: 54,
        label: 'R-424A',
        display: 'R-424A',
        blend: '50.5% HFC-125, 47% HFC-134a, 2.5% butane/pentane',
        gwp: 2440
    },
    {
        value: 55,
        label: 'R-426A',
        display: 'R-426A',
        blend: '5.1% HFC-125, 93% HFC-134a, 1.9% butane/pentane',
        gwp: 1508
    },
    {
        value: 56,
        label: 'R-428A',
        display: 'R-428A',
        blend: '77.5% HFC-125 , 2% HFC-143a , 1.9% isobutane',
        gwp: 3607
    },
    {
        value: 57,
        label: 'R-434A',
        display: 'R-434A',
        blend: '63.2% HFC-125, 16% HFC-134a, 18% HFC-143a, 2.8% isobutane',
        gwp: 3245
    },
    {
        value: 58,
        label: 'R-500',
        display: 'R-500',
        blend: '73.8% CFC-12 , 26.2% HFC-152a , 48.8% HCFC-22',
        gwp: 32
    },
    {
        value: 59,
        label: 'R-502',
        display: 'R-502',
        blend: '48.8% HCFC-22 , 51.2% CFC-115',
        gwp: 0
    },
    {
        value: 60,
        label: 'R-504',
        display: 'R-504',
        blend: '48.2% HFC-32 , 51.8% CFC-115',
        gwp: 325
    },
    {
        value: 61,
        label: 'R-507',
        display: 'R-507',
        blend: '5% HFC-125 , 5% HFC143a',
        gwp: 3985
    },
    {
        value: 62,
        label: 'R-508A',
        display: 'R-508A',
        blend: '39% HFC-23 , 61% PFC-116',
        gwp: 13214
    },
    {
        value: 63,
        label: 'R-508B',
        display: 'R-508B',
        blend: '46% HFC-23 , 54% PFC-116',
        gwp: 13396
    }
]