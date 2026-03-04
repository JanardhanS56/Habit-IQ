export function renderBarChart(ctx, labels, data, label) {
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
        data
      }]
    }
  });
}

export function renderPieChart(ctx, labels, data) {
  return new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data }]
    }
  });
}