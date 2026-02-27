const os = require('os');
const originalUserInfo = os.userInfo;

os.userInfo = function (options) {
    const info = originalUserInfo(options);
    // Override the username to be ASCII-only
    info.username = 'motaro';
    return info;
};

// Now load the Vercel CLI
require('vercel/dist/index.js');
