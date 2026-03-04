export function renderHeatmap(containerId, dataMap) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  Object.keys(dataMap).forEach(date => {
    const div = document.createElement("div");
    const intensity = Math.min(dataMap[date] / 120, 1);
    div.className = "heat-cell";
    div.style.backgroundColor = `rgba(0,0,255,${intensity})`;
    container.appendChild(div);
  });
}
