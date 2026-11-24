
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

const settingsPath = path.join(
  app.getPath("userData"),
  "settings.json"
);

const defaultSettings = {
  tomorrowReminder: true,
  holidayReminders: true,
  professionalReminders: true,
  weekReminder: true,
  voiceGreetingEnabled: true,
  userName: ""
};

const booleanSettings = [
  "tomorrowReminder",
  "holidayReminders",
  "professionalReminders",
  "weekReminder",
  "voiceGreetingEnabled"
];

function getSettings() {
  try {
    if (!fs.existsSync(settingsPath)) {
      saveSettings(defaultSettings);
      return { ...defaultSettings };
    }

    const saved = JSON.parse(
      fs.readFileSync(settingsPath, "utf8")
    );

    return {
      ...defaultSettings,
      ...saved
    };

  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(settingsPath), {
      recursive: true
    });

    let currentSettings = {};

    if (fs.existsSync(settingsPath)) {
      try {
        currentSettings = JSON.parse(
          fs.readFileSync(settingsPath, "utf8")
        );
      } catch (error) {
        console.error(
          "Erro ao recuperar configurações anteriores:",
          error
        );
      }
    }

    const updatedSettings = {
      ...defaultSettings,
      ...currentSettings,
      ...settings
    };

    fs.writeFileSync(
      settingsPath,
      JSON.stringify(updatedSettings, null, 2),
      "utf8"
    );

    return true;

  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return false;
  }
}

function updateSetting(key, value) {
  if (!booleanSettings.includes(key)) {
    console.error("Configuração desconhecida:", key);
    return false;
  }

  const settings = getSettings();

  settings[key] = Boolean(value);

  return saveSettings(settings);
}

function updateUserName(name) {
  if (typeof name !== "string") {
    console.error("Nome inválido.");
    return false;
  }

  const cleanName = name.trim();

  if (!cleanName) {
    console.error("O nome não pode ficar vazio.");
    return false;
  }

  if (cleanName.length > 40) {
    console.error("O nome deve ter no máximo 40 caracteres.");
    return false;
  }

  const settings = getSettings();

  settings.userName = cleanName;

  return saveSettings(settings);
}

module.exports = {
  getSettings,
  saveSettings,
  updateSetting,
  updateUserName
};
