// js/q3.js — Q3: Doanh số bán hàng theo Tháng
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 900, height = 500, margin = {top:50, right:30, bottom:60, left:70};

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

d3.csv("data/data.csv", d3.autoType).then(data => {
  // B1. Parse cột Thời gian tạo đơn -> Tháng
  data.forEach(d => {
    let date = d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]);
    if (!date) {
      d.Tháng = "Khác";
    } else {
      const m = date.getMonth() + 1;
      d.Tháng = `T${String(m).padStart(2,"0")}`;
    }
  });

  // B2. Group theo Tháng
  const rolled = d3.rollups(
    data,
    v => ({
      doanhthuM: d3.sum(v, d => d["Thành tiền"]) / 1e6, // triệu
      doanhthu: d3.sum(v, d => d["Thành tiền"]),        // gốc
      sl: d3.sum(v, d => d["SL"])
    }),
    d => d.Tháng
  );

  // B3. Sắp xếp theo thứ tự tháng T01..T12..Khác
  const order = Array.from({length:12}, (_,i) => `T${String(i+1).padStart(2,"0")}`);
  order.push("Khác");

  let sales = rolled.map(([Tháng, obj]) => ({Tháng, ...obj}));
  sales.sort((a,b) => order.indexOf(a.Tháng) - order.indexOf(b.Tháng));

  // B4. Scales
  const x = d3.scaleBand()
    .domain(sales.map(d => d.Tháng))
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(sales, d => d.doanhthuM)]).nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(sales.map(d => d.Tháng));

  // B5. Bars
  g.selectAll("rect")
    .data(sales)
    .join("rect")
      .attr("x", d => x(d.Tháng))
      .attr("y", d => y(d.doanhthuM))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d.doanhthuM))
      .attr("fill", d => color(d.Tháng))
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`
            <b>${d.Tháng}</b><br/>
            Doanh thu: ${d3.format(",.0f")(d.doanhthu)} VNĐ<br/>
            Số lượng: ${d.sl}
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

  // B6. Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => d + "M");

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);

  g.append("g").call(yAxis);

  // B7. Title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Doanh số bán hàng theo Tháng (Triệu VNĐ)");

}).catch(err => {
  console.error("Lỗi load CSV", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});