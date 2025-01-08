
import packageInfo from '../../package.json';
export const environment = {
  production: true,
  version: packageInfo.version,
  measurUtilitiesApi: 'https://weather.ornl.gov/',
  weatherApi: 'https://lcd.ornl.gov/api'
};
