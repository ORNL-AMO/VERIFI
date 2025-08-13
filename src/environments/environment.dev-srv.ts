
import packageInfo from '../../package.json';
export const environment = {
  production: true,
  version: packageInfo.version,
  measurUtilitiesApi: 'https://dev.ir-utilities.ornl.gov/',
  weatherApi: 'https://lcd.ornl.gov/api'
};
