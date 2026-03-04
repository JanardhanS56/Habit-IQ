export function exportCSV(data) {
  const headers = ["Date","Activity","Category","Minutes","Completed"];
  const rows = data.map(d =>
    [d.date,d.activity,d.category,d.minutes,d.completed].join(",")
  );

  const blob = new Blob([headers.join(",")+"\n"+rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "habit-data.csv";
  a.click();
}