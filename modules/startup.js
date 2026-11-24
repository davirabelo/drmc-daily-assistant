const { app } = require("electron");

function enableWindowsStartup() {
  if (process.platform !== "win32" || !app.isPackaged) return;
  try {
    app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
    console.log("Inicialização automática configurada.");
  } catch (error) {
    console.error("Falha ao configurar a inicialização automática:", error);
  }
}
module.exports = { enableWindowsStartup };
