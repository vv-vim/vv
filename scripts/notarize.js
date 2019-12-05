require('dotenv').config();

const { blue } = require('chalk');
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  console.log(`  ${blue('•')} notarizing      ${blue('appBundleId')}=${process.env.APPID} \
${blue('appPath')}=${appOutDir}/${appName}.app ${blue('appleId')}=${process.env.APPLEID}`);

  return await notarize({
    appBundleId: process.env.APPID,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
  });
};
