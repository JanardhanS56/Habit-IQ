import { initDB } from "./db.js";
import { renderBarChart } from "./charts.js";

async function init() {
  await initDB();

  const ctx = document.getElementById("dailyChart");
  renderBarChart(ctx, ["Mon","Tue","Wed"], [30,45,60], "Minutes");

  document.getElementById("themeToggle").onclick = () => {
    document.body.classList.toggle("dark");
  };
}

init();