import electron from 'electron';
const { app, BrowserWindow, ipcMain, systemPreferences } = electron;
import path from 'path';


const isDev = !app.isPackaged;
app.setName('MOZ-3 Anime Studio');

function createWindow() {
    const win = new BrowserWindow({
        title: 'MOZ-3 Anime Studio',
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Security best practice
            webSecurity: true // Local files won't be able to access local resources blindly if false
        },
        autoHideMenuBar: true, // Hide the default menu bar
        icon: path.join(import.meta.dirname, '../public/logo.png')
    });

    if (isDev) {
        // In development mode, point to the Vite dev server
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // In production, point to the built index.html
        win.loadFile(path.join(import.meta.dirname, '../dist/index.html'));
    }
}

app.whenReady().then(async () => {
    // Request microphone permission on macOS if needed
    if (process.platform === 'darwin') {
        try {
            await systemPreferences.askForMediaAccess('microphone');
        } catch (e) {
            console.log("Failed to ask for microphone access", e);
        }
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
