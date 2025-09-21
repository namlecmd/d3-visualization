// js/q8.js — Q8: Xác suất bán hàng theo Nhóm hàng (theo Tháng)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900, height = 500, margin = {top:60, right:30, bottom:100, left:60};

const svg = d3.select("#chart-container")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Load CSV
d3.csv("data/data.csv", d3.autoType).then(data => {
  // Parse tháng từ cột thời gian
  const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");
  data.forEach(d => {
    const dt = parseDate(d["Thời gian tạo đơn"]);
    if (dt) d.Thang = dt.getMonth() + 1;
    d.Label_Y = `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`;
  });

  // Tổng số đơn hàng mỗi tháng
  const totalMonthly = d3.rollup(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d.Thang
  );

  // Số đơn hàng mỗi nhóm trong tháng
  const groupMonthly = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d.Thang,
    d => d.Label_Y
  );

  // Chuẩn hóa thành mảng để vẽ
  let df_prob = [];
  groupMonthly.forEach(([thang, arr]) => {
    const total = totalMonthly.get(thang) || 1;
    arr.forEach(([label, soDon]) => {
      df_prob.push({
        Thang: thang,
        Label_Y: label,
        TyTrongTheoThang: soDon / total
      });
    });
  });

  // Group theo nhóm hàng để vẽ nhiều line
  const nested = d3.groups(df_prob, d => d.Label_Y);

  // Scale
  const x = d3.scaleLinear().domain([1, 12]).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(df_prob, d => d.TyTrongTheoThang)]).nice().range([innerHeight, 0]);
  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(nested.map(d => d[0]));

  // Line generator
  const line = d3.line()
    .x(d => x(d.Thang))
    .y(d => y(d.TyTrongTheoThang));

  // Draw lines
  g.selectAll(".line")
    .data(nested)
    .join("path")
      .attr("fill", "none")
      .attr("stroke", d => color(d[0]))
      .attr("stroke-width", 2)
      .attr("d", d => line(d[1]));

  // Markers
  g.selectAll(".circle")
    .data(df_prob)
    .join("circle")
      .attr("cx", d => x(d.Thang))
      .attr("cy", d => y(d.TyTrongTheoThang))
      .attr("r", 3)
      .attr("fill", d => color(d.Label_Y))
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`
            <b>${d.Label_Y}</b><br/>
            Tháng: T${String(d.Thang).padStart(2,"0")}<br/>
            Tỷ trọng: ${(d.TyTrongTheoThang*100).toFixed(1)}%
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

  // Axes
  const xAxis = d3.axisBottom(x).ticks(12).tickFormat(d => `T${String(d).padStart(2,"0")}`);
  const yAxis = d3.axisLeft(y).tickFormat(d3.format(".0%"));

  g.append("g").attr("transform", `translate(0,${innerHeight})`).call(xAxis);
  g.append("g").call(yAxis);

  // Title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Xác suất bán hàng theo Nhóm hàng");

  // Legend dưới cùng
  const legend = svg.append("g")
    .attr("transform", `translate(${width/2},${height-40})`)
    .attr("text-anchor", "middle");

  const labels = nested.map(d => d[0]);
  const legendItem = legend.selectAll(".legend-item")
    .data(labels)
    .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d,i) => `translate(${(i - labels.length/2) * 120},0)`);

  legendItem.append("circle")
    .attr("r", 6)
    .attr("fill", d => color(d));

  legendItem.append("text")
    .attr("x", 10)
    .attr("y", 4)
    .text(d => d)
    .style("font-size", "12px");
  
}).catch(err => {
  console.error("Lỗi load CSV:", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});