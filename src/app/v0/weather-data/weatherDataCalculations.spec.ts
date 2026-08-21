import { DetailDegreeDay, WeatherDataSelection } from "@data/models/degreeDays";
import { hasWeatherDataWarning } from "./weatherDataCalculations";

describe("hasWeatherDataWarning", () => {
    const weatherPredictorTypes: Array<WeatherDataSelection> = [
        'CDD',
        'HDD',
        'relativeHumidity',
        'dryBulbTemp',
        'wetBulbTemp',
        'dewPointTemp',
        'precipitation'
    ];

    it("flags missing monthly data", () => {
        expect(hasWeatherDataWarning([], 'relativeHumidity')).toBe(true);
    });

    it("flags twelve hour weather data gaps for all weather predictor types", () => {
        const degreeDays = [getDetailDegreeDay({ gapInData: true })];

        weatherPredictorTypes.forEach(weatherPredictorType => {
            expect(hasWeatherDataWarning(degreeDays, weatherPredictorType)).toBe(true);
        });
    });

    it("flags missing relative humidity only for relative humidity predictors", () => {
        const degreeDays = [getDetailDegreeDay({ relativeHumidity: Number.NaN })];

        expect(hasWeatherDataWarning(degreeDays, 'relativeHumidity')).toBe(true);
        expect(hasWeatherDataWarning(degreeDays, 'wetBulbTemp')).toBe(false);
        expect(hasWeatherDataWarning(degreeDays, 'CDD')).toBe(false);
        expect(hasWeatherDataWarning(degreeDays, 'HDD')).toBe(false);
    });

    it("flags missing wet bulb temperature only for wet bulb temperature predictors", () => {
        const degreeDays = [getDetailDegreeDay({ wetBulbTemp: Number.NaN })];

        expect(hasWeatherDataWarning(degreeDays, 'wetBulbTemp')).toBe(true);
        expect(hasWeatherDataWarning(degreeDays, 'relativeHumidity')).toBe(false);
        expect(hasWeatherDataWarning(degreeDays, 'CDD')).toBe(false);
        expect(hasWeatherDataWarning(degreeDays, 'HDD')).toBe(false);
    });

    it("does not flag valid relative humidity or wet bulb temperature data", () => {
        const degreeDays = [
            getDetailDegreeDay({
                relativeHumidity: 47,
                wetBulbTemp: 58
            })
        ];

        expect(hasWeatherDataWarning(degreeDays, 'relativeHumidity')).toBe(false);
        expect(hasWeatherDataWarning(degreeDays, 'wetBulbTemp')).toBe(false);
    });

    it("preserves degree day behavior when non-degree-day source values are missing", () => {
        const degreeDays = [
            getDetailDegreeDay({
                relativeHumidity: Number.NaN,
                wetBulbTemp: Number.NaN
            })
        ];

        expect(hasWeatherDataWarning(degreeDays, 'CDD')).toBe(false);
        expect(hasWeatherDataWarning(degreeDays, 'HDD')).toBe(false);
    });
});

function getDetailDegreeDay(overrides: Partial<DetailDegreeDay> = {}): DetailDegreeDay {
    return {
        time: new Date(2026, 0, 1),
        heatingDegreeDay: 0,
        coolingDegreeDay: 0,
        dryBulbTemp: 65,
        wetBulbTemp: 55,
        dewPointTemp: 45,
        percentOfDay: 1,
        heatingDegreeDifference: 0,
        coolingDegreeDifference: 0,
        lagDryBulbTemp: 65,
        stationId: "station-1",
        stationName: "Station 1",
        gapInData: false,
        relativeHumidity: 50,
        weightedRelativeHumidity: 72000,
        weightedDryBulbTemp: 93600,
        weightedWetBulbTemp: 79200,
        weightedDewPointTemp: 64800,
        precipitation: 0,
        minutesBetween: 1440,
        ...overrides
    };
}
