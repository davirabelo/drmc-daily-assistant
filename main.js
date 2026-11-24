
const {
  app,
  BrowserWindow,
  Notification,
  Tray,
  Menu,
  nativeImage,
  ipcMain
} = require("electron");

const path = require("node:path");

const { getGreeting } = require("./modules/greeting");

const {
  getTodayEvents,
  getTomorrowEvents,
  getEventsInDays,
  getEventsForDate,
  filterEvents
} = require("./modules/calendar");

const {
  getSettings,
  updateSetting,
  updateUserName
} = require("./modules/settings");

const { enableWindowsStartup } = require("./modules/startup");

const {
  getCustomEvents,
  addCustomEvent,
  updateCustomEvent,
  deleteCustomEvent
} = require("./modules/customEvents");

const {
  ensureAlarmSound,
  playAlarmSound,
  stopAlarmSound
} = require("./modules/alarmSound");

const {
  speakGreeting,
  stopGreeting
} = require("./modules/voiceGreeting");

const APP_NAME = "DRMc Daily Assistant";

let tray = null;
let settingsWindow = null;
let isQuitting = false;

let customAlarmInterval = null;

// Evita disparar o mesmo alarme várias vezes durante a execução.
const firedCustomAlarms = new Set();

// Tempo máximo de atraso aceito para um alarme.
const ALARM_TOLERANCE_MS = 2 * 60 * 1000;

// Verificação dos alarmes a cada 15 segundos.
const ALARM_CHECK_INTERVAL_MS = 15 * 1000;

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {

  app.on("second-instance", () => {
    openSettingsWindow();
  });

  app.whenReady().then(() => {

    app.setAppUserModelId("com.drmc.dailyassistant");

    // Prepara o áudio exclusivo dos alarmes DRMc.
    try {
      ensureAlarmSound();
      console.log("Sistema de áudio DRMc preparado.");
    } catch (error) {
      console.error("Erro ao preparar áudio DRMc:", error);
    }

    registerSettingsHandlers();

    // Cria a bandeja do Windows.
    createTray();

    enableWindowsStartup();

    showDailyNotification();

    showSevenDayNotification();

    // ======================================
    // SAUDAÇÃO NEURAL DE INICIALIZAÇÃO
    // ======================================

    const userSettings = getSettings();

    if (
      userSettings.userName &&
      userSettings.userName.trim()
    ) {
      setTimeout(() => {
        speakGreeting(userSettings.userName).catch((error) => {
          console.error(
            "Erro ao reproduzir saudação de inicialização:",
            error
          );
        });
      }, 3000);
    }

    // Inicia o sistema de alarmes personalizados.
    startCustomAlarmScheduler();

    console.log("DRMc Daily Assistant iniciado.");

  });

}

// ======================================
// COMUNICAÇÃO COM A INTERFACE
// ======================================

function registerSettingsHandlers() {

  // Consulta das configurações
  ipcMain.handle("settings:get", () => {
    return getSettings();
  });

  // Atualização das configurações
  ipcMain.handle("settings:update", (_event, key, value) => {

    const success = updateSetting(key, value);

    if (success) {
      updateTrayMenu();
    }

    return success;

  });

  // ======================================
  // CADASTRO E ATUALIZAÇÃO DO USUÁRIO
  // ======================================

  ipcMain.handle(
    "settings:update-user-name",
    async (_event, name) => {

      if (typeof name !== "string") {
        return false;
      }

      const cleanName = name.trim();

      if (
        cleanName.length === 0 ||
        cleanName.length > 40
      ) {
        return false;
      }

      const success = updateUserName(cleanName);

      if (success) {
        console.log(`Perfil atualizado: ${cleanName}`);

        // Reproduz a saudação após o cadastro ou alteração do nome.
        speakGreeting(cleanName).catch((error) => {
          console.error("Erro na saudação:", error);
        });
      }

      return success;
    }
  );

  // ======================================
  // EVENTOS PERSONALIZADOS
  // ======================================

  ipcMain.handle("custom-events:get", () => {
    return getCustomEvents();
  });

  ipcMain.handle("custom-events:add", (_event, data) => {

    const event = addCustomEvent(data);

    refreshCustomAlarms();

    return event;

  });

  ipcMain.handle("custom-events:update", (_event, id, data) => {

    const event = updateCustomEvent(id, data);

    refreshCustomAlarms();

    return event;

  });

  ipcMain.handle("custom-events:delete", (_event, id) => {

    const success = deleteCustomEvent(id);

    refreshCustomAlarms();

    return success;

  });

  // ======================================
  // CONSULTA DOS EVENTOS DO CALENDÁRIO
  // ======================================

  ipcMain.handle("calendar:get-month", (_event, year, month) => {

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      year < 1900 ||
      year > 9999 ||
      month < 0 ||
      month > 11
    ) {
      return [];
    }

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const monthlyEvents = [];

    for (let day = 1; day <= daysInMonth; day++) {

      const date = new Date(year, month, day);

      const dailyEvents = getEventsForDate(date);

      dailyEvents.forEach((event) => {
        monthlyEvents.push({
          ...event,
          isCustom: false
        });
      });

    }

    // Adiciona somente eventos personalizados do mês consultado.
    const customEvents = getCustomEvents();

    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;

    customEvents
      .filter((event) => event.date.startsWith(monthPrefix))
      .forEach((event) => {
        monthlyEvents.push({
          ...event,
          isCustom: true
        });
      });

    return monthlyEvents;

  });

}

// ======================================
// SISTEMA DE ALARMES PERSONALIZADOS
// ======================================

function startCustomAlarmScheduler() {

  if (customAlarmInterval) {
    clearInterval(customAlarmInterval);
  }

  // Verifica imediatamente ao iniciar.
  checkCustomAlarms();

  customAlarmInterval = setInterval(() => {
    checkCustomAlarms();
  }, ALARM_CHECK_INTERVAL_MS);

  console.log("Agendador de alarmes personalizados iniciado.");

}

function refreshCustomAlarms() {

  // Os eventos são consultados novamente a cada verificação.
  // Esta função mantém o ponto de atualização explícito
  // após criar, editar ou excluir um evento.

  checkCustomAlarms();

}

function checkCustomAlarms() {

  let events = [];

  try {
    events = getCustomEvents();
  } catch (error) {
    console.error(
      "Erro ao consultar alarmes personalizados:",
      error
    );

    return;
  }

  const now = Date.now();

  events.forEach((event) => {

    // Eventos sem horário não possuem alarmes.
    if (!event.time || !event.date) {
      return;
    }

    // Eventos antigos sem configuração de alarmes continuam válidos.
    if (!Array.isArray(event.alarms) || event.alarms.length === 0) {
      return;
    }

    const eventDateTime = new Date(
      `${event.date}T${event.time}:00`
    );

    if (Number.isNaN(eventDateTime.getTime())) {
      return;
    }

    event.alarms.forEach((minutesBefore) => {

      if (
        !Number.isInteger(minutesBefore) ||
        minutesBefore < 0
      ) {
        return;
      }

      const alarmDateTime =
        eventDateTime.getTime() -
        minutesBefore * 60 * 1000;

      const alarmKey = [
        event.id,
        event.date,
        event.time,
        minutesBefore
      ].join("_");

      // Já foi disparado nesta execução.
      if (firedCustomAlarms.has(alarmKey)) {
        return;
      }

      const difference = now - alarmDateTime;

      // Ainda não chegou o horário do alarme.
      if (difference < 0) {
        return;
      }

      // Não dispara alarmes muito atrasados.
      if (difference > ALARM_TOLERANCE_MS) {
        firedCustomAlarms.add(alarmKey);
        return;
      }

      // Marca antes de disparar para evitar duplicidade.
      firedCustomAlarms.add(alarmKey);

      showCustomAlarmNotification(
        event,
        minutesBefore
      );

    });

  });

}

function showCustomAlarmNotification(event, minutesBefore) {

  const alarmDescription = getAlarmDescription(minutesBefore);

  const title = minutesBefore === 0
    ? `Está na hora: ${event.name}`
    : `Lembrete: ${event.name}`;

  const body = minutesBefore === 0
    ? `Seu compromisso está começando agora. ${event.time}`
    : `Seu compromisso começa em ${alarmDescription}. Horário: ${event.time}`;

  console.log("\n========== ALARME PERSONALIZADO ==========");
  console.log("Evento:", event.name);
  console.log("Data:", event.date);
  console.log("Horário:", event.time);
  console.log("Antecedência:", alarmDescription);
  console.log("==========================================\n");

  // Reproduz o som exclusivo do DRMc mesmo se a notificação visual
  // não estiver disponível no Windows.
  playAlarmSound();

  if (!Notification.isSupported()) {
    console.warn("Notificações não disponíveis neste sistema.");
    return;
  }

  const notification = new Notification({

    title: `${title} — ${APP_NAME}`,

    body: event.description
      ? `${body}\n${event.description}`
      : body,

    // O áudio é reproduzido separadamente pelo módulo DRMc.
    silent: true

  });

  notification.on("click", () => {
    openSettingsWindow();
  });

  notification.show();

}

function getAlarmDescription(minutes) {

  if (minutes === 0) {
    return "no horário do evento";
  }

  if (minutes === 1440) {
    return "24 horas";
  }

  if (minutes === 60) {
    return "1 hora";
  }

  if (minutes < 60) {
    return `${minutes} minutos`;
  }

  return `${minutes} minutos`;

}

// ======================================
// JANELA DE CONFIGURAÇÕES
// ======================================

function openSettingsWindow() {

  if (settingsWindow && !settingsWindow.isDestroyed()) {

    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }

    settingsWindow.show();
    settingsWindow.focus();

    return;

  }

  settingsWindow = new BrowserWindow({

    width: 850,
    height: 760,

    minWidth: 600,
    minHeight: 600,

    title: APP_NAME,

    // ÍCONE PERSONALIZADO DA JANELA
    icon: path.join(
      __dirname,
      "assets",
      "drmc-app-icon.ico"
    ),

    backgroundColor: "#10151d",

    autoHideMenuBar: true,

    webPreferences: {

      preload: path.join(__dirname, "preload.js"),

      contextIsolation: true,

      nodeIntegration: false

    }

  });

  settingsWindow.loadFile(
    path.join(__dirname, "src", "index.html")
  );

  settingsWindow.on("close", (event) => {

    if (!isQuitting) {

      event.preventDefault();

      settingsWindow.hide();

    }

  });

  settingsWindow.on("closed", () => {

    settingsWindow = null;

  });

}

// ======================================
// FORMATAÇÃO
// ======================================

function formatDate(date) {

  return new Intl.DateTimeFormat("pt-BR", {

    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"

  }).format(date);

}

function formatShortDate(date) {

  return new Intl.DateTimeFormat("pt-BR", {

    weekday: "short",
    day: "2-digit",
    month: "short"

  }).format(date);

}

function formatEventNames(events) {

  return events
    .map(event => event.name)
    .join(", ");

}

function limitText(text, maxLength = 180) {

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";

}

// ======================================
// NOTIFICAÇÃO PRINCIPAL
// ======================================

function showDailyNotification() {

  if (!Notification.isSupported()) {

    console.warn("Notificações não disponíveis.");

    return;

  }

  const settings = getSettings();

  const now = new Date();

  const tomorrow = new Date(now);

  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = filterEvents(
    getTodayEvents(now),
    settings
  );

  const tomorrowEvents = filterEvents(
    getTomorrowEvents(now),
    settings
  );

  const greeting = getGreeting(now);

  const todayText = todayEvents.length > 0
    ? formatEventNames(todayEvents)
    : "Nenhuma data especial hoje";

  let body = `${formatShortDate(now)} | Hoje: ${todayText}`;

  if (settings.tomorrowReminder && tomorrowEvents.length > 0) {

    body += ` | Amanhã (${formatShortDate(tomorrow)}): `;

    body += formatEventNames(tomorrowEvents);

  }

  body = limitText(body);

  console.log("\n========== NOTIFICAÇÃO ==========");

  console.log("Data:", formatDate(now));

  console.log("Hoje:", todayEvents);

  console.log("Amanhã:", tomorrowEvents);

  console.log("Configurações:", settings);

  console.log("Mensagem:", body);

  console.log("=================================\n");

  new Notification({

    title: `${greeting} — ${APP_NAME}`,

    body,

    silent: false

  }).show();

}

// ======================================
// NOTIFICAÇÃO DE 7 DIAS
// ======================================

function showSevenDayNotification() {

  if (!Notification.isSupported()) {
    return;
  }

  const settings = getSettings();

  if (!settings.weekReminder) {
    return;
  }

  const now = new Date();

  const events = filterEvents(
    getEventsInDays(now, 7),
    settings
  );

  if (events.length === 0) {
    return;
  }

  const futureDate = new Date(now);

  futureDate.setDate(futureDate.getDate() + 7);

  new Notification({

    title: `Lembrete de 7 dias — ${APP_NAME}`,

    body: limitText(
      `${formatShortDate(futureDate)}: ${formatEventNames(events)}`
    ),

    silent: false

  }).show();

}

// ======================================
// CONSULTA DE AMANHÃ
// ======================================

function showTomorrowNotification() {

  if (!Notification.isSupported()) {
    return;
  }

  const settings = getSettings();

  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  const events = filterEvents(
    getTomorrowEvents(new Date()),
    settings
  );

  const message = events.length > 0
    ? formatEventNames(events)
    : "Nenhuma data especial cadastrada.";

  new Notification({

    title: `Calendário de amanhã — ${APP_NAME}`,

    body: limitText(
      `${formatShortDate(tomorrow)}: ${message}`
    ),

    silent: false

  }).show();

}

// ======================================
// CONSULTA DOS PRÓXIMOS 7 DIAS
// ======================================

function showUpcomingNotification() {

  if (!Notification.isSupported()) {
    return;
  }

  const settings = getSettings();

  const futureDate = new Date();

  futureDate.setDate(futureDate.getDate() + 7);

  const events = filterEvents(
    getEventsInDays(new Date(), 7),
    settings
  );

  const message = events.length > 0
    ? formatEventNames(events)
    : "Nenhuma data especial encontrada.";

  new Notification({

    title: `Calendário de 7 dias — ${APP_NAME}`,

    body: limitText(
      `${formatShortDate(futureDate)}: ${message}`
    ),

    silent: false

  }).show();

}

// ======================================
// ATUALIZAÇÃO DAS CONFIGURAÇÕES
// ======================================

function toggleSetting(key, value) {

  const success = updateSetting(key, value);

  if (!success) {

    console.error("Erro ao salvar:", key);

    return;

  }

  console.log(
    key,
    value ? "ATIVADO" : "DESATIVADO"
  );

  updateTrayMenu();

}

// ======================================
// MENU DA BANDEJA
// ======================================

function updateTrayMenu() {

  if (!tray) {
    return;
  }

  const settings = getSettings();

  const menu = Menu.buildFromTemplate([

    {
      label: "Abrir configurações",

      click: openSettingsWindow

    },

    {
      type: "separator"
    },

    {
      label: "Mostrar calendário de hoje",

      click: showDailyNotification

    },

    {
      label: "Mostrar informações de amanhã",

      click: showTomorrowNotification

    },

    {
      label: "Mostrar próximos 7 dias",

      click: showUpcomingNotification

    },

    {
      type: "separator"
    },

    {
      label: "Lembrete de amanhã",

      type: "checkbox",

      checked: settings.tomorrowReminder,

      click: (item) => {
        toggleSetting("tomorrowReminder", item.checked);
      }

    },

    {
      label: "Avisos de feriados",

      type: "checkbox",

      checked: settings.holidayReminders,

      click: (item) => {
        toggleSetting("holidayReminders", item.checked);
      }

    },

    {
      label: "Datas profissionais",

      type: "checkbox",

      checked: settings.professionalReminders,

      click: (item) => {
        toggleSetting("professionalReminders", item.checked);
      }

    },

    {
      label: "Avisos com 7 dias de antecedência",

      type: "checkbox",

      checked: settings.weekReminder,

      click: (item) => {
        toggleSetting("weekReminder", item.checked);
      }

    },

    {
      type: "separator"
    },

    {
      label: "Sair",

      click: () => {
        app.quit();
      }

    }

  ]);

  tray.setContextMenu(menu);

}

// ======================================
// ÍCONE PERSONALIZADO DA BANDEJA
// ======================================

async function createTray() {

  const iconPath = path.join(
    __dirname,
    "assets",
    "drmc-app-icon.ico"
  );

  let icon = nativeImage.createFromPath(iconPath);

  // Se o ícone personalizado não carregar, tenta usar
  // o ícone do executável como alternativa.
  if (icon.isEmpty()) {
    console.warn(
      "Ícone DRMc não encontrado ou inválido. Tentando ícone alternativo."
    );

    try {
      icon = await app.getFileIcon(process.execPath, {
        size: "small"
      });
    } catch (error) {
      console.error(
        "Erro ao carregar o ícone alternativo da bandeja:",
        error
      );
    }
  }

  // Não interrompe silenciosamente: registra o erro se nenhuma
  // das opções de ícone estiver disponível.
  if (icon.isEmpty()) {
    console.error(
      "Não foi possível carregar um ícone para a bandeja do DRMc."
    );
    return;
  }

  // Mantém o ícone em tamanho adequado para a bandeja do Windows.
  icon = icon.resize({
    width: 16,
    height: 16
  });

  tray = new Tray(icon);

  tray.setToolTip(APP_NAME);

  updateTrayMenu();

  // Clique esquerdo abre o painel.
  tray.on("click", () => {
    openSettingsWindow();
  });

  // Clique direito abre o menu de opções.
  tray.on("right-click", () => {
    tray.popUpContextMenu();
  });

  console.log("Ícone da bandeja DRMc criado com sucesso.");

}

// ======================================
// EVENTOS DO APLICATIVO
// ======================================

app.on("activate", () => {

  openSettingsWindow();

});

app.on("before-quit", () => {

  isQuitting = true;

  if (customAlarmInterval) {
    clearInterval(customAlarmInterval);
    customAlarmInterval = null;
  }

  // Interrompe qualquer reprodução em andamento ao encerrar o aplicativo.
  stopAlarmSound();
  stopGreeting();

});

app.on("window-all-closed", () => {

  // Continua ativo na bandeja do Windows.

});
