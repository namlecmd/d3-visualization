// js/q7.js — Q7: Xác suất bán hàng theo Nhóm hàng
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900, height = 500, margin = {top:60, right:30, bottom:50, left:200};

const svg = d3.select("#chart-container")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Load CSV
d3.csv("data/data.csv", d3.autoType).then(data => {
  // B1. Lấy tổng số đơn hàng duy nhất
  const totalOrders = new Set(data.map(d => d["Mã đơn hàng"])).size;

  // B2. Gom nhóm theo Mã nhóm hàng
  const rolled = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d["Mã nhóm hàng"],
    d => d["Tên nhóm hàng"]
  );

  // Chuyển thành array
  let salesProb = rolled.map(([ma, sub]) => {
    const [ten, soDon] = sub[0];
    return {
      "Mã nhóm hàng": ma,
      "Tên nhóm hàng": ten,
      "SoDonHang": soDon,
      "XacSuat": soDon / totalOrders,
      "Label_Y": `[${ma}] ${ten}`
    };
  });

  // Sắp xếp giảm dần theo Xác suất
  salesProb.sort((a,b) => d3.descending(a.XacSuat, b.XacSuat));

  // B3. Scale
  const y = d3.scaleBand()
    .domain(salesProb.map(d => d.Label_Y))
    .range([0, innerHeight])
    .padding(0.2);

  const x = d3.scaleLinear()
    .domain([0, d3.max(salesProb, d => d.XacSuat) * 1.2])
    .range([0, innerWidth]);

  const color = d3.scaleOrdinal()
    .domain(salesProb.map(d => d.Label_Y))
    .range(['#16a085','#34495e','#e74c3c','#f1c40f','#525a7c']);

  // B4. Bars
  g.selectAll("rect")
    .data(salesProb)
    .join("rect")
      .attr("y", d => y(d.Label_Y))
      .attr("x", 0)
      .attr("height", y.bandwidth())
      .attr("width", d => x(d.XacSuat))
      .attr("fill", d => color(d.Label_Y))
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`
            <b>${d.Label_Y}</b><br/>
            Số đơn hàng: ${d3.format(",")(d.SoDonHang)}<br/>
            Xác suất: ${(d.XacSuat*100).toFixed(1)}%
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

  // B5. Axes
  const yAxis = d3.axisLeft(y);
  const xAxis = d3.axisBottom(x).tickFormat(d3.format(".0%"));

  g.append("g").call(yAxis);
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);

  // B6. Title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", "#16a085")
    .text("Xác suất bán hàng theo Nhóm hàng");

}).catch(err => {
  console.error("Lỗi load CSV:", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});