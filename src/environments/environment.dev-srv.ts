
import packageInfo from '../../package.json';
export const environment = {
  analyticsEnabled: false,
  production: true,
  version: packageInfo.version,
  measurUtilitiesApi: 'https://dev.ir-utilities.ornl.gov/',
  weatherApi: 'https://lcd.ornl.gov/api',
  useHash: false
};
