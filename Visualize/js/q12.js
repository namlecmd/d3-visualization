// js/q12.js — Q12: Phân phối mức chi trả của khách hàng
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Setup (responsive like q11)
const container = d3.select("#chart-container");
container.html("");

const width = container.node().clientWidth || 900;
const height = (window.innerHeight || 800) - 100;
const margin = { top: 50, right: 40, bottom: 60, left: 80 };

const svg = container.append("svg")
  .attr("width", "100%")
  .attr("height", height);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Format tick
function formatTicks(value) {
  if (value >= 1e6) return (value/1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 1e3) return (value/1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return value;
}

// Load data
d3.csv("data/data.csv", d3.autoType).then(data => {
  // Tổng mức chi trả của mỗi KH
  const df_Muc_chi_tra = d3.rollups(
    data,
    v => d3.sum(v, d => d["Thành tiền"]),
    d => d["Mã khách hàng"]
  ).map(([maKH, muc]) => ({ maKH, muc }));

  const values = df_Muc_chi_tra.map(d => d.muc);

  // Phân tích
  const totalCustomers = values.length;
  const avgSpending = d3.mean(values);
  const medianSpending = d3.median(values);
  const maxSpending = d3.max(values);
  const minSpending = d3.min(values);
  const mostCommonSpending = d3.mode(values);
  const highSpendingThreshold = d3.quantile(values.sort(d3.ascending), 0.9);
  const highSpendingCustomers = values.filter(v => v >= highSpendingThreshold).length;
  const highSpendingRate = highSpendingCustomers / totalCustomers * 100;

  console.log(`
  - Tổng số khách hàng: ${totalCustomers}
  - Mức chi trả trung bình: ${d3.format(",.0f")(avgSpending)} VND
  - Mức chi trả trung vị: ${d3.format(",.0f")(medianSpending)} VND
  - Mức chi trả cao nhất: ${d3.format(",.0f")(maxSpending)} VND
  - Mức chi trả thấp nhất: ${d3.format(",.0f")(minSpending)} VND
  - Mức chi trả phổ biến nhất: ${d3.format(",.0f")(mostCommonSpending)} VND
  - Top 10% KH chi tiêu ≥ ${d3.format(",.0f")(highSpendingThreshold)} VND
    → ${highSpendingCustomers} KH (${highSpendingRate.toFixed(2)}%)
  `);

  // Hàm vẽ histogram
  function drawHistogram(dataArray, x0, chartWidth, title, bins = 50) {
    const binsData = d3.bin().thresholds(bins)(dataArray);

    const x = d3.scaleLinear()
      .domain([0, d3.max(dataArray)]).nice()
      .range([0, chartWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(binsData, d => d.length)]).nice()
      .range([innerHeight - 50, 0]);

    const chart = g.append("g").attr("transform", `translate(${x0},0)`);

    chart.selectAll("rect")
      .data(binsData)
      .join("rect")
      .attr("x", d => x(d.x0))
      .attr("y", d => y(d.length))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => y(0) - y(d.length))
      .attr("fill", "#1f77b4")
      .attr("opacity", 0.6)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5);

    // Trục
    chart.append("g")
      .attr("transform", `translate(0,${y(0)})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(formatTicks));

    chart.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat(formatTicks));

    // Không hiển thị tiêu đề phụ cho biểu đồ (chỉ giữ tiêu đề tổng thể)
  }

  // Hiển thị 1 chart duy nhất (toàn bộ dữ liệu)
  const chartWidth = innerWidth;
  drawHistogram(values, 0, chartWidth, "Phân phối mức chi trả (toàn bộ)", 88);

  // Tiêu đề tổng thể
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("Q12 - Phân phối mức chi trả của khách hàng");
});