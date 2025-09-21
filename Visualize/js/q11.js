
// js/q11.js — Q11: Phân phối lượt mua hàng của khách hàng
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const container = d3.select("#chart-container");
container.html(""); // ensure container empty

const width = container.node().clientWidth || 900;
const height = (window.innerHeight || 800) - 100;
const margin = { top: 50, right: 40, bottom: 60, left: 80 };

const svg = container.append("svg")
  .attr("width", "100%")
  .attr("height", height);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

d3.csv("data/data.csv", d3.autoType).then(data => {
  // Tính số lượt mua cho mỗi KH
  const df_luot_mua = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d["Mã khách hàng"]
  ).map(([maKH, soLuot]) => ({ maKH, soLuot }));

  // Báo cáo phân tích
  const totalCustomers = df_luot_mua.length;
  const oneTimeBuyers = df_luot_mua.filter(d => d.soLuot === 1).length;
  const repeatBuyers = totalCustomers - oneTimeBuyers;
  const repeatRate = repeatBuyers / totalCustomers * 100;
  const maxPurchases = d3.max(df_luot_mua, d => d.soLuot);
  const mostCommonPurchases = d3.mode(df_luot_mua.map(d => d.soLuot));

  console.log(`
  Tổng số khách hàng: ${totalCustomers}
  Khách hàng mua 1 lần: ${oneTimeBuyers} (${(oneTimeBuyers/totalCustomers*100).toFixed(2)}%)
  Khách hàng mua lặp lại: ${repeatBuyers} (${repeatRate.toFixed(2)}%)
  Lượt mua lớn nhất: ${maxPurchases}
  Lượt mua phổ biến nhất: ${mostCommonPurchases}
  `);

  // Hai dataset: tất cả KH và KH có ≥ 2 lượt mua
  const allData = df_luot_mua.map(d => d.soLuot);
  const repeatData = df_luot_mua.filter(d => d.soLuot >= 2).map(d => d.soLuot);

  // Hàm vẽ histogram
  function drawHistogram(dataArray, x0, chartWidth, title) {
    // Binning (dùng thresholds linh hoạt)
    const bins = d3.bin().thresholds(Math.max(10, Math.min(50, d3.max(dataArray) || 10)))(dataArray);

    // Loại bỏ bin đại diện cho khoảng [0,1) — không hiển thị cột 0
    const binsToUse = bins.filter(b => b.x0 >= 1);

    const maxVal = Math.max(1, Math.max(...dataArray));
    // Nếu không có giá trị >=1, vẫn thiết lập domain bắt đầu từ 1
    const x = d3.scaleLinear()
      .domain([1, maxVal])
      .range([0, chartWidth]);

    // sử dụng toàn bộ chiều cao innerHeight cho histogram
    const chartHeight = innerHeight - 40;
    const y = d3.scaleLinear()
      .domain([0, d3.max(binsToUse, d => d.length) || 1]).nice()
      .range([chartHeight, 0]);

    const chart = g.append("g").attr("transform", `translate(${x0},0)`);

    chart.selectAll("rect")
      .data(binsToUse)
      .join("rect")
      .attr("x", d => x(d.x0))
      .attr("y", d => y(d.length))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => y(0) - y(d.length))
      .attr("fill", "#1f77b4")
      .attr("opacity", 0.6)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5);

  // Trục X: show every integer from 1..maxVal (không hiển thị 0)
  const minTick = binsToUse.length ? Math.ceil(binsToUse[0].x0) : 1;
  const maxTick = Math.ceil(maxVal);
  const xTicks = d3.range(minTick, maxTick + 1);
    chart.append("g")
      .attr("transform", `translate(0,${y(0)})`)
      .call(d3.axisBottom(x).tickValues(xTicks).tickFormat(d3.format("d")).tickSizeOuter(0));

    // Trục Y: số lượng (integer format)
    chart.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")));

    // Không hiển thị tiêu đề phụ cho biểu đồ (chỉ giữ tiêu đề tổng thể)
  }

  // Hiển thị chỉ 1 biểu đồ (Phân phối lượt mua - tất cả khách hàng)
  const chartWidth = innerWidth;

  drawHistogram(allData, 0, chartWidth, "Phân phối lượt mua (tất cả KH)");

  // Tiêu đề tổng thể
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("Phân phối lượt mua hàng ");
});
