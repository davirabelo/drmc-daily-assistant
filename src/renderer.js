
// ==========================================
// CONFIGURAÇÕES
// ==========================================

const settingIds = [
  "voiceGreetingEnabled",
  "tomorrowReminder",
  "holidayReminders",
  "professionalReminders",
  "weekReminder"
];

const saveStatus = document.getElementById("saveStatus");

// ==========================================
// PERFIL E CADASTRO DO USUÁRIO
// ==========================================

const profileSetupOverlay = document.getElementById("profileSetupOverlay");
const profileSetupForm = document.getElementById("profileSetupForm");
const firstRunName = document.getElementById("firstRunName");
const profileSetupStatus = document.getElementById("profileSetupStatus");
const saveProfileSetupBtn = document.getElementById("saveProfileSetupBtn");

const profileNameForm = document.getElementById("profileNameForm");
const profileNameInput = document.getElementById("profileNameInput");
const profileNameStatus = document.getElementById("profileNameStatus");
const saveProfileNameBtn = document.getElementById("saveProfileNameBtn");

let currentUserName = "";

function showProfileStatus(element, message, error = false) {
  if (!element) return;

  element.textContent = message;
  element.classList.toggle("error", error);
}

function setUserNameInterface(name) {
  currentUserName = typeof name === "string" ? name.trim() : "";

  if (profileNameInput) {
    profileNameInput.value = currentUserName;
  }
}

function showProfileSetup() {
  if (!profileSetupOverlay) return;

  profileSetupOverlay.hidden = false;

  if (firstRunName) {
    firstRunName.value = "";
    setTimeout(() => firstRunName.focus(), 100);
  }
}

function hideProfileSetup() {
  if (profileSetupOverlay) {
    profileSetupOverlay.hidden = true;
  }
}

async function saveUserProfile(name, source) {
  const cleanName = String(name || "").trim();

  if (!cleanName) {
    throw new Error("Digite seu nome para continuar.");
  }

  if (cleanName.length > 40) {
    throw new Error("O nome deve ter no máximo 40 caracteres.");
  }

  if (!window.DRMc || typeof window.DRMc.updateUserName !== "function") {
    throw new Error(
      "A integração do cadastro ainda não foi habilitada no aplicativo."
    );
  }

  const saved = await window.DRMc.updateUserName(cleanName);

  if (!saved) {
    throw new Error("Não foi possível salvar seu nome.");
  }

  setUserNameInterface(cleanName);

  if (source === "setup") {
    hideProfileSetup();

    showProfileStatus(
      profileNameStatus,
      "Nome cadastrado com sucesso."
    );
  } else {
    showProfileStatus(
      profileNameStatus,
      "Nome atualizado com sucesso."
    );
  }

  showStatus(`Perfil atualizado. Olá, ${cleanName}!`);

  return true;
}

async function handleProfileSetupSubmit(event) {
  event.preventDefault();

  const name = firstRunName ? firstRunName.value : "";

  try {
    if (saveProfileSetupBtn) {
      saveProfileSetupBtn.disabled = true;
      saveProfileSetupBtn.textContent = "Salvando...";
    }

    showProfileStatus(profileSetupStatus, "");

    await saveUserProfile(name, "setup");

  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);

    showProfileStatus(
      profileSetupStatus,
      error.message || "Não foi possível salvar seu nome.",
      true
    );

  } finally {
    if (saveProfileSetupBtn) {
      saveProfileSetupBtn.disabled = false;
      saveProfileSetupBtn.textContent = "Continuar";
    }
  }
}

async function handleProfileNameSubmit(event) {
  event.preventDefault();

  const name = profileNameInput ? profileNameInput.value : "";

  try {
    if (saveProfileNameBtn) {
      saveProfileNameBtn.disabled = true;
      saveProfileNameBtn.textContent = "Salvando...";
    }

    showProfileStatus(profileNameStatus, "");

    await saveUserProfile(name, "settings");

  } catch (error) {
    console.error("Erro ao atualizar nome:", error);

    showProfileStatus(
      profileNameStatus,
      error.message || "Não foi possível atualizar seu nome.",
      true
    );

  } finally {
    if (saveProfileNameBtn) {
      saveProfileNameBtn.disabled = false;
      saveProfileNameBtn.textContent = "Salvar nome";
    }
  }
}

if (profileSetupForm) {
  profileSetupForm.addEventListener(
    "submit",
    handleProfileSetupSubmit
  );
}

if (profileNameForm) {
  profileNameForm.addEventListener(
    "submit",
    handleProfileNameSubmit
  );
}

// ==========================================
// ELEMENTOS DOS EVENTOS PERSONALIZADOS
// ==========================================

const addCustomEventBtn = document.getElementById("addCustomEventBtn");
const customEventFormContainer = document.getElementById("customEventFormContainer");
const customEventForm = document.getElementById("customEventForm");
const customEventId = document.getElementById("customEventId");
const customEventName = document.getElementById("customEventName");
const customEventDate = document.getElementById("customEventDate");
const customEventTime = document.getElementById("customEventTime");
const customEventType = document.getElementById("customEventType");
const customEventDescription = document.getElementById("customEventDescription");
const customEventFormTitle = document.getElementById("customEventFormTitle");
const customEventFormStatus = document.getElementById("customEventFormStatus");
const saveCustomEventBtn = document.getElementById("saveCustomEventBtn");
const cancelCustomEventBtn = document.getElementById("cancelCustomEventBtn");
const customEventsList = document.getElementById("customEventsList");
const customEventsCount = document.getElementById("customEventsCount");

// Elementos dos alarmes
const customAlarmCheckboxes = Array.from(
  document.querySelectorAll('input[name="customEventAlarm"]')
);

const customAlarmInfo = document.getElementById("customAlarmInfo");

// ==========================================
// STATUS DAS CONFIGURAÇÕES
// ==========================================

function showStatus(message, error = false) {
  if (!saveStatus) return;

  saveStatus.textContent = message;
  saveStatus.classList.toggle("error", error);
}

// ==========================================
// CARREGAMENTO DAS CONFIGURAÇÕES
// ==========================================

async function loadSettings() {
  try {
    const settings = await window.DRMc.getSettings();

    // Carrega o nome cadastrado.
    setUserNameInterface(settings.userName || "");

    // Exibe o cadastro somente se ainda não houver nome.
    if (!currentUserName) {
      showProfileSetup();
    } else {
      hideProfileSetup();
    }

    settingIds.forEach((id) => {
      const input = document.getElementById(id);

      if (input) {
        input.checked = Boolean(settings[id]);
      }
    });

    showStatus("Suas preferências são salvas automaticamente.");

  } catch (error) {
    console.error("Erro ao carregar preferências:", error);

    showStatus(
      "Não foi possível carregar as preferências.",
      true
    );
  }
}

// ==========================================
// SALVAMENTO DAS CONFIGURAÇÕES
// ==========================================

async function handleSettingChange(event) {
  const input = event.target;
  const previousValue = !input.checked;

  try {
    input.disabled = true;

    const saved = await window.DRMc.updateSetting(
      input.id,
      input.checked
    );

    if (!saved) {
      throw new Error("Não foi possível salvar a configuração.");
    }

    showStatus("Preferência salva com sucesso.");

  } catch (error) {
    console.error("Erro ao salvar preferência:", error);

    input.checked = previousValue;

    showStatus(
      "Erro ao salvar. Tente novamente.",
      true
    );

  } finally {
    input.disabled = false;
  }
}

// ==========================================
// INICIALIZAÇÃO DOS INTERRUPTORES
// ==========================================

settingIds.forEach((id) => {
  const input = document.getElementById(id);

  if (input) {
    input.addEventListener("change", handleSettingChange);
  }
});

// ==========================================
// CALENDÁRIO
// ==========================================

const calendarGrid = document.getElementById("calendarGrid");
const calendarMonth = document.getElementById("calendarMonth");
const calendarYear = document.getElementById("calendarYear");
const previousMonthButton = document.getElementById("previousMonth");
const nextMonthButton = document.getElementById("nextMonth");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const calendarEvents = document.getElementById("calendarEvents");

const today = new Date();

let displayedYear = today.getFullYear();
let displayedMonth = today.getMonth();

let selectedDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

let monthEvents = [];
let customEvents = [];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDate(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatDateLabel(date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatShortDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// ==========================================
// ORGANIZAÇÃO DOS EVENTOS
// ==========================================

function getEventsForSelectedDate(date) {
  const selectedKey = formatDateKey(date);

  return monthEvents.filter((event) => {
    if (!event || !event.date) return false;

    const eventDate = String(event.date);

    // Data completa: YYYY-MM-DD
    if (eventDate.length === 10) {
      return eventDate === selectedKey;
    }

    // Data recorrente: MM-DD
    if (eventDate.length === 5) {
      const monthDay = selectedKey.slice(5);

      if (eventDate !== monthDay) {
        return false;
      }

      if (event.year && Number(event.year) !== date.getFullYear()) {
        return false;
      }

      return true;
    }

    return false;
  });
}

// ==========================================
// STATUS DO FORMULÁRIO
// ==========================================

function showCustomEventFormStatus(message, error = false) {
  if (!customEventFormStatus) return;

  customEventFormStatus.textContent = message;
  customEventFormStatus.classList.toggle("error", error);
}

// ==========================================
// ALARMES DOS EVENTOS PERSONALIZADOS
// ==========================================

function getSelectedCustomAlarms() {
  return customAlarmCheckboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => Number(checkbox.value));
}

function setSelectedCustomAlarms(alarms = []) {
  const selectedAlarms = Array.isArray(alarms)
    ? alarms.map(Number)
    : [];

  customAlarmCheckboxes.forEach((checkbox) => {
    checkbox.checked = selectedAlarms.includes(Number(checkbox.value));
  });

  updateCustomAlarmInfo();
}

function updateCustomAlarmInfo() {
  if (!customAlarmInfo) return;

  const selectedAlarms = getSelectedCustomAlarms();
  const hasTime = Boolean(customEventTime && customEventTime.value);

  if (selectedAlarms.length > 0 && !hasTime) {
    customAlarmInfo.textContent =
      "Informe o horário do evento para utilizar os alarmes.";

    customAlarmInfo.classList.add("error");
    return;
  }

  customAlarmInfo.classList.remove("error");

  if (!hasTime) {
    customAlarmInfo.textContent =
      "Informe um horário para ativar os alarmes.";

    return;
  }

  if (selectedAlarms.length === 0) {
    customAlarmInfo.textContent =
      "Nenhum alarme selecionado. O evento não enviará lembretes.";

    return;
  }

  customAlarmInfo.textContent =
    `${selectedAlarms.length} ${
      selectedAlarms.length === 1
        ? "alarme selecionado"
        : "alarmes selecionados"
    }. Você receberá alertas visuais nos horários escolhidos.`;
}

function clearCustomAlarmSelections() {
  customAlarmCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  updateCustomAlarmInfo();
}

// ==========================================
// ABRIR FORMULÁRIO
// ==========================================

function openCustomEventForm(event = null) {
  if (!customEventFormContainer || !customEventForm) return;

  customEventForm.reset();

  customEventId.value = "";
  customEventFormTitle.textContent = "Novo evento";
  saveCustomEventBtn.textContent = "Salvar evento";

  showCustomEventFormStatus("");

  if (event) {
    // Somente eventos personalizados podem ser editados.
    if (event.isCustom !== true || !event.id) {
      showCustomEventFormStatus(
        "Este evento oficial não pode ser alterado.",
        true
      );

      return;
    }

    customEventId.value = event.id;
    customEventName.value = event.name || "";
    customEventDate.value = event.date || "";

    if (customEventTime) {
      customEventTime.value = event.time || "";
    }

    customEventType.value = event.type || "";
    customEventDescription.value = event.description || "";

    // Recupera os alarmes salvos.
    setSelectedCustomAlarms(event.alarms || []);

    customEventFormTitle.textContent = "Editar evento";
    saveCustomEventBtn.textContent = "Salvar alterações";

  } else {
    customEventDate.value = formatDateKey(selectedDate);

    // Novo evento começa sem alarmes selecionados.
    clearCustomAlarmSelections();
  }

  updateCustomAlarmInfo();

  customEventFormContainer.hidden = false;

  customEventFormContainer.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  customEventName.focus();
}

// ==========================================
// FECHAR E LIMPAR FORMULÁRIO
// ==========================================

function closeCustomEventForm() {
  if (!customEventFormContainer || !customEventForm) return;

  customEventForm.reset();
  customEventId.value = "";

  clearCustomAlarmSelections();

  customEventFormContainer.hidden = true;

  showCustomEventFormStatus("");
}

// ==========================================
// CARREGAR EVENTOS PERSONALIZADOS
// ==========================================

async function loadCustomEvents() {
  if (!customEventsList) return;

  try {
    const events = await window.DRMc.getCustomEvents();

    customEvents = Array.isArray(events) ? events : [];

    renderCustomEventsList();

  } catch (error) {
    console.error("Erro ao carregar eventos personalizados:", error);

    customEventsList.innerHTML = "";

    customEventsList.appendChild(
      createElement(
        "p",
        "",
        "Não foi possível carregar seus eventos personalizados."
      )
    );
  }
}

// ==========================================
// RENDERIZAR LISTA DE EVENTOS PERSONALIZADOS
// ==========================================

function renderCustomEventsList() {
  if (!customEventsList) return;

  customEventsList.innerHTML = "";

  if (customEventsCount) {
    customEventsCount.textContent =
      `${customEvents.length} ${customEvents.length === 1 ? "EVENTO" : "EVENTOS"}`;
  }

  if (customEvents.length === 0) {
    customEventsList.appendChild(
      createElement(
        "p",
        "",
        "Nenhum evento personalizado cadastrado."
      )
    );

    return;
  }

  const sortedEvents = [...customEvents].sort((a, b) => {
    return a.date.localeCompare(b.date);
  });

  sortedEvents.forEach((event) => {
    const card = createElement("div", "custom-event-card");

    const info = createElement("div", "custom-event-info");

    const title = createElement(
      "h5",
      "",
      event.name || "Evento sem título"
    );

    const date = createElement(
      "p",
      "",
      formatShortDate(event.date)
    );

    info.appendChild(title);
    info.appendChild(date);

    // Exibir horário, quando informado.
    if (event.time) {
      info.appendChild(
        createElement(
          "p",
          "custom-event-time",
          `Horário: ${event.time}`
        )
      );
    }

    if (event.description) {
      info.appendChild(
        createElement("p", "", event.description)
      );
    }

    if (event.type) {
      info.appendChild(
        createElement(
          "span",
          "custom-event-category",
          event.type
        )
      );
    }

    const actions = createElement(
      "div",
      "custom-event-actions"
    );

    const editButton = createElement(
      "button",
      "",
      "Editar"
    );

    editButton.type = "button";

    editButton.addEventListener("click", () => {
      openCustomEventForm({
        ...event,
        isCustom: true
      });
    });

    const deleteButton = createElement(
      "button",
      "delete-event-button",
      "Excluir"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      handleDeleteCustomEvent(event.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    card.appendChild(info);
    card.appendChild(actions);

    customEventsList.appendChild(card);
  });
}

// ==========================================
// CADASTRAR OU EDITAR EVENTO
// ==========================================

async function handleCustomEventSubmit(event) {
  event.preventDefault();

  const id = customEventId.value.trim();

  const data = {
    name: customEventName.value.trim(),
    date: customEventDate.value,
    time: customEventTime ? customEventTime.value : "",
    alarms: getSelectedCustomAlarms(),
    type: customEventType.value.trim(),
    description: customEventDescription.value.trim()
  };

  if (!data.name || !data.date) {
    showCustomEventFormStatus(
      "Preencha o nome e a data do evento.",
      true
    );

    return;
  }

  // Não permite salvar alarmes sem horário.
  if (data.alarms.length > 0 && !data.time) {
    showCustomEventFormStatus(
      "Informe o horário do evento para ativar os alarmes.",
      true
    );

    if (customAlarmInfo) {
      customAlarmInfo.textContent =
        "Informe o horário do evento para utilizar os alarmes.";

      customAlarmInfo.classList.add("error");
    }

    if (customEventTime) {
      customEventTime.focus();
    }

    return;
  }

  const editing = Boolean(id);

  try {
    saveCustomEventBtn.disabled = true;
    cancelCustomEventBtn.disabled = true;

    saveCustomEventBtn.textContent = editing
      ? "Salvando..."
      : "Cadastrando...";

    showCustomEventFormStatus("");

    if (editing) {
      // O identificador é validado novamente no processo principal.
      await window.DRMc.updateCustomEvent(id, data);
    } else {
      await window.DRMc.addCustomEvent(data);
    }

    closeCustomEventForm();

    await refreshCalendarAndEvents();

    showStatus(
      editing
        ? "Evento personalizado atualizado com sucesso."
        : "Evento personalizado cadastrado com sucesso."
    );

  } catch (error) {
    console.error("Erro ao salvar evento:", error);

    showCustomEventFormStatus(
      error.message || "Não foi possível salvar o evento.",
      true
    );

  } finally {
    saveCustomEventBtn.disabled = false;
    cancelCustomEventBtn.disabled = false;

    saveCustomEventBtn.textContent = editing
      ? "Salvar alterações"
      : "Salvar evento";
  }
}

// ==========================================
// EXCLUIR EVENTO PERSONALIZADO
// ==========================================

async function handleDeleteCustomEvent(id) {
  const event = customEvents.find(item => item.id === id);

  if (!event) {
    showStatus("Evento personalizado não encontrado.", true);
    return;
  }

  const confirmed = window.confirm(
    `Deseja realmente excluir o evento "${event.name}"?\n\nEssa ação não poderá ser desfeita.`
  );

  if (!confirmed) return;

  try {
    await window.DRMc.deleteCustomEvent(id);

    if (customEventId.value === id) {
      closeCustomEventForm();
    }

    await refreshCalendarAndEvents();

    showStatus("Evento personalizado excluído com sucesso.");

  } catch (error) {
    console.error("Erro ao excluir evento:", error);

    showStatus(
      error.message || "Não foi possível excluir o evento.",
      true
    );
  }
}

// ==========================================
// RENDERIZAÇÃO DOS EVENTOS DO DIA
// ==========================================

function renderSelectedDateEvents() {
  if (!calendarEvents || !selectedDateLabel) return;

  selectedDateLabel.textContent = formatDateLabel(selectedDate);

  calendarEvents.innerHTML = "";

  const events = getEventsForSelectedDate(selectedDate);

  if (events.length === 0) {
    const emptyMessage = createElement(
      "div",
      "calendar-empty",
      "Nenhum evento cadastrado para esta data."
    );

    calendarEvents.appendChild(emptyMessage);

    return;
  }

  events.forEach((event) => {
    const isCustom = event.isCustom === true;

    const eventItem = createElement(
      "div",
      isCustom
        ? "calendar-event-item custom-event"
        : "calendar-event-item"
    );

    const title = createElement(
      "h4",
      "",
      event.name || "Evento sem título"
    );

    eventItem.appendChild(title);

    // Exibir horário do evento, quando disponível.
    if (event.time) {
      eventItem.appendChild(
        createElement(
          "p",
          "custom-event-time",
          `Horário: ${event.time}`
        )
      );
    }

    if (event.type) {
      eventItem.appendChild(
        createElement("p", "", event.type)
      );
    }

    if (event.description) {
      eventItem.appendChild(
        createElement("p", "", event.description)
      );
    }

    if (isCustom && event.id) {
      const actions = createElement(
        "div",
        "custom-event-actions"
      );

      const editButton = createElement(
        "button",
        "",
        "Editar"
      );

      editButton.type = "button";

      editButton.addEventListener("click", () => {
        openCustomEventForm(event);
      });

      const deleteButton = createElement(
        "button",
        "delete-event-button",
        "Excluir"
      );

      deleteButton.type = "button";

      deleteButton.addEventListener("click", () => {
        handleDeleteCustomEvent(event.id);
      });

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);

      eventItem.appendChild(actions);
    }

    calendarEvents.appendChild(eventItem);
  });
}

// ==========================================
// CRIAÇÃO DOS DIAS DO CALENDÁRIO
// ==========================================

function createCalendarDay(day, date, events) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "calendar-day";

  const dayNumber = document.createElement("span");
  dayNumber.className = "day-number";
  dayNumber.textContent = day;

  button.appendChild(dayNumber);

  const hasEvents = events.length > 0;

  const hasCustomEvents = events.some(
    event => event.isCustom === true
  );

  if (hasEvents) {
    const indicator = document.createElement("span");

    indicator.className = "event-indicator";

    if (hasCustomEvents) {
      indicator.classList.add("custom");
    }

    button.appendChild(indicator);
  }

  if (isSameDate(date, today)) {
    button.classList.add("today");
  }

  if (isSameDate(date, selectedDate)) {
    button.classList.add("selected");
  }

  button.setAttribute(
    "aria-label",
    `${day} de ${date.toLocaleDateString("pt-BR", {
      month: "long"
    })}${hasEvents ? `, ${events.length} evento(s)` : ""}`
  );

  button.addEventListener("click", () => {
    selectedDate = new Date(
      displayedYear,
      displayedMonth,
      day
    );

    renderCalendar();
    renderSelectedDateEvents();
  });

  return button;
}

// ==========================================
// RENDERIZAÇÃO DO CALENDÁRIO
// ==========================================

function renderCalendar() {
  if (!calendarGrid) return;

  calendarGrid.innerHTML = "";

  const firstDay = new Date(
    displayedYear,
    displayedMonth,
    1
  ).getDay();

  const daysInMonth = new Date(
    displayedYear,
    displayedMonth + 1,
    0
  ).getDate();

  if (calendarMonth) {
    calendarMonth.textContent = new Date(
      displayedYear,
      displayedMonth,
      1
    ).toLocaleDateString("pt-BR", {
      month: "long"
    });
  }

  if (calendarYear) {
    calendarYear.textContent = displayedYear;
  }

  // Espaços antes do primeiro dia do mês
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");

    emptyDay.className = "calendar-day empty";

    calendarGrid.appendChild(emptyDay);
  }

  // Dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(
      displayedYear,
      displayedMonth,
      day
    );

    const events = getEventsForSelectedDate(date);

    const dayElement = createCalendarDay(
      day,
      date,
      events
    );

    calendarGrid.appendChild(dayElement);
  }
}

// ==========================================
// CARREGAMENTO DOS EVENTOS DO MÊS
// ==========================================

async function loadCalendarMonth() {
  if (!calendarGrid) return;

  calendarGrid.innerHTML = "";

  const loadingMessage = document.createElement("div");

  loadingMessage.className = "calendar-empty";
  loadingMessage.textContent = "Carregando calendário...";

  calendarGrid.appendChild(loadingMessage);

  try {
    monthEvents = await window.DRMc.getCalendarMonth(
      displayedYear,
      displayedMonth
    );

    if (!Array.isArray(monthEvents)) {
      monthEvents = [];
    }

    renderCalendar();
    renderSelectedDateEvents();

  } catch (error) {
    console.error("Erro ao carregar calendário:", error);

    monthEvents = [];

    calendarGrid.innerHTML = "";

    const errorMessage = document.createElement("div");

    errorMessage.className = "calendar-empty";
    errorMessage.textContent =
      "Não foi possível carregar os eventos do calendário.";

    calendarGrid.appendChild(errorMessage);
  }
}

// ==========================================
// ATUALIZAÇÃO GERAL DO CALENDÁRIO E DA LISTA
// ==========================================

async function refreshCalendarAndEvents() {
  await Promise.all([
    loadCalendarMonth(),
    loadCustomEvents()
  ]);
}

// ==========================================
// NAVEGAÇÃO ENTRE MESES
// ==========================================

if (previousMonthButton) {
  previousMonthButton.addEventListener("click", async () => {
    displayedMonth--;

    if (displayedMonth < 0) {
      displayedMonth = 11;
      displayedYear--;
    }

    selectedDate = new Date(
      displayedYear,
      displayedMonth,
      1
    );

    await loadCalendarMonth();
  });
}

if (nextMonthButton) {
  nextMonthButton.addEventListener("click", async () => {
    displayedMonth++;

    if (displayedMonth > 11) {
      displayedMonth = 0;
      displayedYear++;
    }

    selectedDate = new Date(
      displayedYear,
      displayedMonth,
      1
    );

    await loadCalendarMonth();
  });
}

// ==========================================
// BOTÃO NOVO EVENTO
// ==========================================

if (addCustomEventBtn) {
  addCustomEventBtn.addEventListener("click", () => {
    openCustomEventForm();
  });
}

// ==========================================
// CANCELAR CADASTRO OU EDIÇÃO
// ==========================================

if (cancelCustomEventBtn) {
  cancelCustomEventBtn.addEventListener("click", () => {
    closeCustomEventForm();
  });
}

// ==========================================
// ENVIO DO FORMULÁRIO
// ==========================================

if (customEventForm) {
  customEventForm.addEventListener(
    "submit",
    handleCustomEventSubmit
  );
}

// ==========================================
// ATUALIZAÇÃO DA INTERFACE DOS ALARMES
// ==========================================

if (customEventTime) {
  customEventTime.addEventListener("input", updateCustomAlarmInfo);
  customEventTime.addEventListener("change", updateCustomAlarmInfo);
}

customAlarmCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", updateCustomAlarmInfo);
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function initializeApp() {
  await loadSettings();

  await Promise.all([
    loadCalendarMonth(),
    loadCustomEvents()
  ]);
}

initializeApp();
