
export interface WeatherStation {
    name: string,
    country: string,
    state: string,
    lat: string,
    lon: string,
    begin: Date,
    end: Date,
    USAF: string,
    WBAN: string,
    ID: string,
    distanceFrom: number,
    ratingPercent: number
}

export interface LocalClimatologicalData {
    stationId: string,
    STATION: string,
    DATE: Date,
    LATITUDE: string,
    LONGITUDE: string,
    ELEVATION: string,
    NAME: string,
    REPORT_TYPE: string,
    SOURCE: string,
    HourlyAltimeterSetting: number,
    HourlyDewPointTemperature: number,
    HourlyDryBulbTemperature: number,
    HourlyPrecipitation: number,
    HourlyPresentWeatherType: string,
    HourlyPressureChange: number,
    HourlyPressureTendency: number,
    HourlyRelativeHumidity: number,
    HourlySkyConditions: number,
    HourlySeaLevelPressure: number,
    HourlyStationPressure: number,
    HourlyVisibility: number,
    HourlyWetBulbTemperature: number,
    HourlyWindDirection: number,
    HourlyWindGustSpeed: number,
    HourlyWindSpeed: number
}

// export interface DegreeDay {
//     heatingDegreeDays: number,
//     coolingDegreeDays: number,
//     date: Date,
//     stationId: string,
//     stationName: string,
//     hasErrors: boolean
// }

export interface DetailDegreeDay {
    time: Date,
    heatingDegreeDay: number,
    coolingDegreeDay: number,
    dryBulbTemp: number,
    wetBulbTemp: number,
    dewPointTemp: number,
    percentOfDay: number,
    heatingDegreeDifference: number,
    coolingDegreeDifference: number,
    lagDryBulbTemp: number,
    stationId: string,
    stationName: string,
    gapInData: boolean,
    relativeHumidity: number,
    weightedRelativeHumidity: number,
    weightedDryBulbTemp: number,
    weightedWetBulbTemp: number,
    weightedDewPointTemp: number,
    precipitation: number,
    minutesBetween: number
}

export type WeatherDataSelection = 'degreeDays' | 'CDD' | 'HDD' | 'relativeHumidity' | 'dryBulbTemp' | 'wetBulbTemp' | 'dewPointTemp' | 'precipitation';

export interface WeatherDataSelectionOption {
    selection: WeatherDataSelection,
    label: string
}

export const WeatherDataSelectionOptions: Array<WeatherDataSelectionOption> = [
    {
        selection: 'degreeDays',
        label: 'Both Degree Days'
    },
    {
        selection: 'CDD',
        label: 'Cooling Degree Days'
    },
    {
        selection: 'HDD',
        label: 'Heating Degree Days'
    },
    {
        selection: 'relativeHumidity',
        label: 'Relative Humidty'
    },
    {
        selection: 'dryBulbTemp',
        label: 'Dry Bulb Temp.'
    },
    {
        selection: 'wetBulbTemp',
        label: 'Wet Bulb Temp.'
    },
    {
        selection: 'dewPointTemp',
        label: 'Dew Point Temp.'
    },
    {
        selection: 'precipitation',
        label: 'Precipitation'
    }
]
