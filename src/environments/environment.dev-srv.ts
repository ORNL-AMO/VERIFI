
import packageInfo from '../../package.json';
export const environment = {
  production: true,
  version: packageInfo.version,
  measurUtilitiesApi: 'https://dev.weather.ornl.gov/',
  weatherApi: 'https://lcd.ornl.gov/api'
};
