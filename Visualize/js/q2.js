// js/q2.js — Q2: Doanh số bán hàng theo Nhóm hàng
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900, height = 600, margin = {top:50, right:40, bottom:40, left:220};

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
  // B1. Tạo trường Nhom_hang
  data.forEach(d => {
    d.Nhom_hang = `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`;
  });

  // B2. Group theo Nhom_hang
  const rolled = d3.rollups(
    data,
    v => ({
      doanhthuM: d3.sum(v, d => d["Thành tiền"]) / 1e6, // triệu
      doanhthu: d3.sum(v, d => d["Thành tiền"]),        // gốc VNĐ
      sl: d3.sum(v, d => d["SL"]),
      ten: v[0]["Tên nhóm hàng"],
      ma: v[0]["Mã nhóm hàng"]
    }),
    d => d.Nhom_hang
  );

  let sales = rolled.map(([Nhom_hang, obj]) => ({Nhom_hang, ...obj}));
  sales.sort((a,b) => d3.descending(a.doanhthuM, b.doanhthuM));

  // B3. Scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(sales, d => d.doanhthuM)]).nice()
    .range([0, innerWidth]);

  const y = d3.scaleBand()
    .domain(sales.map(d => d.Nhom_hang))
    .range([0, innerHeight])
    .padding(0.2);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
  .domain(sales.map(d => d.Nhom_hang));
  // B4. Bars
  g.selectAll("rect")
    .data(sales)
    .join("rect")
      .attr("y", d => y(d.Nhom_hang))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", d => x(d.doanhthuM))
      .attr("fill", d => color(d.Nhom_hang))
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

  // B5. Axis với custom formatter
  const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => {
    if (d >= 1000) {  // từ 1000M trở lên thì chuyển thành B
      return (d/1000).toFixed(1) + "B";
    }
    return d + "M";
  });

  const yAxis = d3.axisLeft(y).tickSize(0);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);

  g.append("g")
    .call(yAxis)
    .selectAll("text")
    .style("font-size", "11px");

  // B6. Title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Doanh số bán hàng theo Nhóm hàng");

}).catch(err => {
  console.error("Lỗi load CSV", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});