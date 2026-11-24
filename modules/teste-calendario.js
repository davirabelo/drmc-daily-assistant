
const {
  getMovableDates,
  calculateEaster
} = require("./calendar");

const year = 2027;

console.log("\n================================");
console.log("DRMc DAILY ASSISTANT");
console.log("TESTE DO CALENDÁRIO");
console.log("================================\n");

console.log("Páscoa:", calculateEaster(year).toLocaleDateString("pt-BR"));

console.log(`\nDATAS MÓVEIS DE ${year}:\n`);

getMovableDates(year).forEach((event) => {
  const [y, m, d] = event.date.split("-");

  console.log(
    `${d}/${m}/${y} | ${event.name} | ${event.type}`
  );
});

console.log("\nTeste concluído!");
