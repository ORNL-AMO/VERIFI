
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
    distanceFrom: number
}

export interface LocalClimatologicalData {
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

export interface DegreeDay {
    heatingDegreeDays: number,
    coolingDegreeDays: number,
    date: Date,
    stationId: string,
    stationName: string
}

export interface DetailDegreeDay {
    time: Date,
    heatingDegreeDay: number,
    coolingDegreeDay: number,
    dryBulbTemp: number,
    percentOfDay: number,
    heatingDegreeDifference: number,
    coolingDegreeDifference: number
}