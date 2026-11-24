
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");
const { randomUUID } = require("node:crypto");

const DATA_DIRECTORY = app.getPath("userData");

const DATA_FILE = path.join(
  DATA_DIRECTORY,
  "custom-events.json"
);

// ======================================
// CONFIGURAÇÃO DOS ALARMES
// ======================================

const AVAILABLE_ALARMS = [
  0,      // No horário do evento
  5,      // 5 minutos antes
  15,     // 15 minutos antes
  30,     // 30 minutos antes
  60,     // 1 hora antes
  1440    // 24 horas antes
];

function normalizeAlarms(alarms) {
  if (!Array.isArray(alarms)) {
    return [];
  }

  return [...new Set(alarms)];
}

// ======================================
// ARMAZENAMENTO
// ======================================

function ensureStorage() {
  if (!fs.existsSync(DATA_DIRECTORY)) {
    fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

function readEvents() {
  ensureStorage();

  try {
    const content = fs.readFileSync(DATA_FILE, "utf8");
    const events = JSON.parse(content);

    return Array.isArray(events) ? events : [];

  } catch (error) {
    console.error("Erro ao ler eventos personalizados:", error);
    throw new Error("Não foi possível carregar os eventos.");
  }
}

function saveEvents(events) {
  ensureStorage();

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(events, null, 2),
    "utf8"
  );
}

// ======================================
// VALIDAÇÃO
// ======================================

function validateEvent(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Dados do evento inválidos.");
  }

  if (
    typeof data.name !== "string" ||
    !data.name.trim()
  ) {
    throw new Error("Informe o nome do evento.");
  }

  if (
    typeof data.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
  ) {
    throw new Error("Informe uma data válida.");
  }

  const [year, month, day] = data.date.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("A data informada não existe.");
  }

  if (data.name.trim().length > 100) {
    throw new Error("O nome deve ter até 100 caracteres.");
  }

  if (
    data.description !== undefined &&
    (
      typeof data.description !== "string" ||
      data.description.length > 500
    )
  ) {
    throw new Error("A descrição deve ter até 500 caracteres.");
  }

  if (
    data.type !== undefined &&
    (
      typeof data.type !== "string" ||
      data.type.length > 50
    )
  ) {
    throw new Error("Categoria inválida.");
  }

  // Horário opcional no formato HH:MM
  if (
    data.time !== undefined &&
    data.time !== null &&
    data.time !== "" &&
    (
      typeof data.time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)
    )
  ) {
    throw new Error("Informe um horário válido.");
  }

  // Validação dos alarmes
  if (data.alarms !== undefined) {
    if (!Array.isArray(data.alarms)) {
      throw new Error("A configuração dos alarmes é inválida.");
    }

    const alarms = normalizeAlarms(data.alarms);

    const invalidAlarm = alarms.some(
      alarm =>
        !Number.isInteger(alarm) ||
        !AVAILABLE_ALARMS.includes(alarm)
    );

    if (invalidAlarm) {
      throw new Error("Um ou mais alarmes selecionados são inválidos.");
    }

    if (alarms.length > 0 && !data.time) {
      throw new Error(
        "Informe o horário do evento para utilizar alarmes."
      );
    }
  }
}

// ======================================
// LISTAR EVENTOS
// ======================================

function getCustomEvents() {
  return readEvents();
}

// ======================================
// ADICIONAR EVENTO
// ======================================

function addCustomEvent(data) {
  validateEvent(data);

  const events = readEvents();

  const now = new Date().toISOString();

  const newEvent = {
    id: randomUUID(),
    name: data.name.trim(),
    date: data.date,
    time: data.time || "",
    alarms: normalizeAlarms(data.alarms),
    type: data.type?.trim() || "Personalizado",
    description: data.description?.trim() || "",
    createdAt: now,
    updatedAt: now
  };

  events.push(newEvent);

  saveEvents(events);

  return newEvent;
}

// ======================================
// EDITAR EVENTO
// ======================================

function updateCustomEvent(id, data) {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Identificador inválido.");
  }

  validateEvent(data);

  const events = readEvents();

  const index = events.findIndex(
    event => event.id === id
  );

  if (index === -1) {
    throw new Error("Evento personalizado não encontrado.");
  }

  const existingEvent = events[index];

  const alarms = data.alarms !== undefined
    ? normalizeAlarms(data.alarms)
    : normalizeAlarms(existingEvent.alarms);

  if (alarms.length > 0 && !(data.time || "")) {
    throw new Error(
      "Informe o horário do evento para utilizar alarmes."
    );
  }

  events[index] = {
    ...existingEvent,
    name: data.name.trim(),
    date: data.date,
    time: data.time || "",
    alarms,
    type: data.type?.trim() || "Personalizado",
    description: data.description?.trim() || "",
    updatedAt: new Date().toISOString()
  };

  saveEvents(events);

  return events[index];
}

// ======================================
// EXCLUIR EVENTO
// ======================================

function deleteCustomEvent(id) {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Identificador inválido.");
  }

  const events = readEvents();

  const filteredEvents = events.filter(
    event => event.id !== id
  );

  if (filteredEvents.length === events.length) {
    throw new Error("Evento personalizado não encontrado.");
  }

  saveEvents(filteredEvents);

  return true;
}

// ======================================
// EXPORTAÇÕES
// ======================================

module.exports = {
  getCustomEvents,
  addCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  AVAILABLE_ALARMS
};
