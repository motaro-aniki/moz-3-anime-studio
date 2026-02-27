import localforage from 'localforage';

localforage.config({
    name: 'AntigravityLink',
    storeName: 'app_data'
});

// Convert blob URL to Base64 String
const blobUrlToBase64 = async (blobUrl) => {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error("Error converting blob URL to Base64:", err);
        return null;
    }
};

// Traverse expression parts and convert blobs to base64
const serializeExpressions = async (expressions) => {
    const serialized = JSON.parse(JSON.stringify(expressions));
    const promises = [];

    for (let exp of serialized) {
        // Handling base image (if any)
        if (exp.parts.base && exp.parts.base.startsWith('blob:')) {
            promises.push(
                blobUrlToBase64(exp.parts.base).then(b64 => { exp.parts.base = b64; })
            );
        }

        // Handling eyes
        ['closed', 'half', 'open'].forEach(eyeState => {
            if (exp.parts.eyes[eyeState] && exp.parts.eyes[eyeState].startsWith('blob:')) {
                promises.push(
                    blobUrlToBase64(exp.parts.eyes[eyeState]).then(b64 => { exp.parts.eyes[eyeState] = b64; })
                );
            }
        });

        // Handling mouths
        for (let i = 0; i < 5; i++) {
            const key = `mouth${i}`;
            if (exp.parts.mouth[key] && exp.parts.mouth[key].startsWith('blob:')) {
                promises.push(
                    blobUrlToBase64(exp.parts.mouth[key]).then(b64 => { exp.parts.mouth[key] = b64; })
                );
            }
        }
    }

    await Promise.all(promises);
    return serialized;
};

export const saveAppData = async (data) => {
    try {
        const { expressions, globalSettings, calibratedNormal } = data;
        const serializedExpressions = await serializeExpressions(expressions);

        await localforage.setItem('appData', {
            expressions: serializedExpressions,
            globalSettings,
            calibratedNormal
        });
        console.log('App data saved successfully.');
    } catch (err) {
        console.error('Error saving app data:', err);
        window.alert('‼️ セーブ失敗 ‼️\n容量オーバーか、ブラウザのセキュリティ制限により保存できませんでした。\n' + err.message);
        throw err;
    }
};

export const loadAppData = async () => {
    try {
        const data = await localforage.getItem('appData');
        return data; // Returns { expressions, globalSettings, calibratedNormal } or null
    } catch (err) {
        console.error('Error loading app data:', err);
        return null;
    }
};
