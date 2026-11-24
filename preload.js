
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("DRMc", {

  // ======================================
  // CONFIGURAÇÕES
  // ======================================

  getSettings: () =>
    ipcRenderer.invoke("settings:get"),

  updateSetting: (key, value) =>
    ipcRenderer.invoke("settings:update", key, value),

  updateUserName: (name) =>
    ipcRenderer.invoke("settings:update-user-name", name),

  // ======================================
  // CALENDÁRIO
  // ======================================

  getCalendarMonth: (year, month) =>
    ipcRenderer.invoke("calendar:get-month", year, month),

  // ======================================
  // EVENTOS PERSONALIZADOS
  // ======================================

  getCustomEvents: () =>
    ipcRenderer.invoke("custom-events:get"),

  addCustomEvent: (data) =>
    ipcRenderer.invoke("custom-events:add", data),

  updateCustomEvent: (id, data) =>
    ipcRenderer.invoke("custom-events:update", id, data),

  deleteCustomEvent: (id) =>
    ipcRenderer.invoke("custom-events:delete", id)

});
