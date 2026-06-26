import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

export function createMainWindow(): BrowserWindow {
  const preloadPath = join(__dirname, '../preload/index.js');
  const rendererHtmlPath = join(__dirname, '../renderer/index.html');
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(rendererHtmlPath);
  }

  return mainWindow;
}
