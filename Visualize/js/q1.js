// js/q1.js — Q1: Doanh số bán hàng theo Mặt hàng
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900, height = 600, margin = {top:50, right:40, bottom:40, left:250};

const svg = d3.select("#chart-container")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

d3.csv("data/data.csv", d3.autoType).then(data => {
  // B1. Tạo trường Mat_hang
  data.forEach(d => {
    d.Mat_hang = `${d["Mã mặt hàng"]} - ${d["Tên mặt hàng"]}`;
  });

  // B2. Group theo Mat_hang
  const rolled = d3.rollups(
    data,
    v => ({
  doanhthuM: d3.sum(v, d => d["Thành tiền"]) / 1e6,
  doanhthu: d3.sum(v, d => d["Thành tiền"]),
  sl: d3.sum(v, d => d["SL"]),
  ten: v[0]["Tên mặt hàng"],
  ma: v[0]["Mã mặt hàng"],
  nhom: v[0]["Mã nhóm hàng"]   // thêm nhóm
  }),
    d => d.Mat_hang
  );

  let sales = rolled.map(([Mat_hang, obj]) => ({Mat_hang, ...obj}));
  sales.sort((a,b) => d3.descending(a.doanhthuM, b.doanhthuM));

  // B3. Scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(sales, d => d.doanhthuM)]).nice()
    .range([0, innerWidth]);

  const y = d3.scaleBand()
    .domain(sales.map(d => d.Mat_hang))
    .range([0, innerHeight])
    .padding(0.2);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(sales.map(d => d.nhom));

  // B4. Bars
  g.selectAll("rect")
    .data(sales)
    .join("rect")
      .attr("y", d => y(d.Mat_hang))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", d => x(d.doanhthuM))
      .attr("fill", d => color(d.nhom))
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`
            <b>${d.ten}</b> (Mã: ${d.ma})<br/>
            Doanh thu: ${d3.format(",.0f")(d.doanhthu)} VNĐ<br/>
            Số lượng: ${d.sl}
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

  // B5. Axes
  const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => d + "M");
  const yAxis = d3.axisLeft(y).tickSize(0);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);

  g.append("g").call(yAxis).selectAll("text").style("font-size", "11px");

  // B6. Title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Doanh số bán hàng theo Mặt hàng (Triệu VNĐ)");

}).catch(err => {
  console.error("Lỗi load CSV", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});