
const calendar = require("../data/calendario.json");

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);

  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function secondSunday(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const firstSunday = 1 + ((7 - firstDay.getDay()) % 7);

  return new Date(year, month - 1, firstSunday + 7);
}

function blackFriday(year) {
  const first = new Date(year, 10, 1);
  const firstFriday = 1 + ((5 - first.getDay() + 7) % 7);

  return new Date(year, 10, firstFriday + 21);
}

function getMovableDates(year) {
  const easter = calculateEaster(year);

  return [
    {
      date: formatISO(addDays(easter, -48)),
      name: "Carnaval — segunda-feira",
      type: "Ponto facultativo"
    },
    {
      date: formatISO(addDays(easter, -47)),
      name: "Carnaval — terça-feira",
      type: "Ponto facultativo"
    },
    {
      date: formatISO(addDays(easter, -46)),
      name: "Quarta-feira de Cinzas",
      type: "Ponto facultativo"
    },
    {
      date: formatISO(addDays(easter, -2)),
      name: "Paixão de Cristo",
      type: "Feriado religioso — confirmar legislação local"
    },
    {
      date: formatISO(easter),
      name: "Páscoa",
      type: "Data religiosa"
    },
    {
      date: formatISO(secondSunday(year, 5)),
      name: "Dia das Mães",
      type: "Comemorativa"
    },
    {
      date: formatISO(addDays(easter, 60)),
      name: "Corpus Christi",
      type: "Ponto facultativo federal; pode ser feriado local"
    },
    {
      date: formatISO(secondSunday(year, 8)),
      name: "Dia dos Pais",
      type: "Comemorativa"
    },
    {
      date: formatISO(blackFriday(year)),
      name: "Black Friday",
      type: "Data comercial"
    }
  ];
}

function getCalendarForYear(year) {
  const fixedEvents = calendar.filter((item) => {
    if (item.date.length === 10) {
      return item.date.startsWith(`${year}-`);
    }

    return !item.year || item.year === year;
  });

  const movableEvents = getMovableDates(year);

  const unique = new Map();

  [...fixedEvents, ...movableEvents].forEach((event) => {
    unique.set(`${event.date}|${event.name}`, event);
  });

  return [...unique.values()];
}

function getEventsForDate(date = new Date()) {
  const isoDate = formatISO(date);
  const monthDay = isoDate.slice(5);

  return getCalendarForYear(date.getFullYear()).filter((event) => {
    if (event.date.length === 10) {
      return event.date === isoDate;
    }

    return event.date === monthDay;
  });
}

function getTodayEvents(date = new Date()) {
  return getEventsForDate(date);
}

function getTomorrowEvents(date = new Date()) {
  return getEventsForDate(addDays(date, 1));
}

// Consulta acontecimentos exatamente N dias à frente.
function getEventsInDays(date = new Date(), days = 7) {
  return getEventsForDate(addDays(date, days));
}

// Identifica feriados e pontos facultativos.
function isHolidayEvent(event) {
  return /feriado|ponto facultativo/i.test(event.type);
}

// Identifica datas de profissões.
function isProfessionalEvent(event) {
  const professionalTerms = [
    "médico",
    "enfermagem",
    "enfermeiro",
    "farmacêutico",
    "bombeiro",
    "professor",
    "pedagogo",
    "advogado",
    "administrador",
    "psicólogo",
    "nutricionista",
    "assistente social",
    "fisioterapeuta",
    "terapeuta ocupacional",
    "dentista",
    "fonoaudiólogo",
    "engenheiro",
    "bibliotecário",
    "químico",
    "físico",
    "motorista",
    "secretária",
    "servidor público",
    "diretor escolar",
    "orientador educacional",
    "profissional de informática",
    "agricultor",
    "marinheiro"
  ];

  const name = event.name.toLowerCase();

  return professionalTerms.some((term) =>
    name.includes(term)
  );
}

// Aplica as preferências sem esconder outras comemorações.
function filterEvents(events, settings) {
  return events.filter((event) => {
    if (!settings.holidayReminders && isHolidayEvent(event)) {
      return false;
    }

    if (!settings.professionalReminders && isProfessionalEvent(event)) {
      return false;
    }

    return true;
  });
}

function getTodaySummary(date = new Date()) {
  return getTodayEvents(date)
    .map((event) => `${event.name} — ${event.type}`)
    .join(" | ");
}

module.exports = {
  getTodayEvents,
  getTomorrowEvents,
  getEventsForDate,
  getEventsInDays,
  getCalendarForYear,
  getMovableDates,
  calculateEaster,
  filterEvents,
  isHolidayEvent,
  isProfessionalEvent
};
