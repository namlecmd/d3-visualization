// js/q5.js — Q5: Doanh số trung bình theo Ngày trong tháng
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 950, height = 500, margin = {top:60, right:30, bottom:100, left:80};

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

const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");

d3.csv("data/data.csv", d3.autoType).then(data => {
  // B1. Parse ngày và lấy số ngày trong tháng
  data.forEach(d => {
    let date = parseDate(d["Thời gian tạo đơn"]);
    d._date = date;
    d.Ngay = date ? date.getDate() : null; // 1..31
  });

  // B2. Gom nhóm theo ngày
  const rolled = d3.rollups(
    data,
    v => ({
      doanhthu: d3.sum(v, d => d["Thành tiền"]),
      sl: d3.sum(v, d => d["SL"])
    }),
    d => d.Ngay
  );

  let daily = rolled.map(([Ngay, obj]) => ({
    Ngay,
    "Ngày Label": `Ngày ${String(Ngay).padStart(2,"0")}`,
    "Doanh thu TB": obj.doanhthu / 12, // chia cho 12 tháng
    "SL TB": obj.sl / 12
  }));

  // B3. Sắp xếp theo ngày (1→31)
  daily.sort((a,b) => a.Ngay - b.Ngay);

  // B4. Tìm best & worst
  const best = d3.max(daily, d => d["Doanh thu TB"]);
  const worst = d3.min(daily, d => d["Doanh thu TB"]);

  // B5. Scales
  const x = d3.scaleBand()
    .domain(daily.map(d => d["Ngày Label"]))
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(daily, d => d["Doanh thu TB"])]).nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(daily.map(d => d["Ngày Label"]));

  // B6. Vẽ cột
  g.selectAll("rect")
    .data(daily)
    .join("rect")
      .attr("x", d => x(d["Ngày Label"]))
      .attr("y", d => y(d["Doanh thu TB"]))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d["Doanh thu TB"]))
      .attr("fill", d => 
        d["Doanh thu TB"] === best ? "#2ca02c" :      // xanh lá = best
        d["Doanh thu TB"] === worst ? "#d62728" :     // đỏ = worst
        color(d["Ngày Label"])
      )
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`
            <b>${d["Ngày Label"]}</b><br/>
            Doanh thu TB: ${d3.format(",.0f")(d["Doanh thu TB"])} VNĐ<br/>
            SL TB: ${d3.format(",.0f")(d["SL TB"])}
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

  // B7. Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => (d/1e6) + "M");

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

  g.append("g").call(yAxis);

  // B8. Title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Doanh số trung bình theo Ngày trong tháng");

}).catch(err => {
  console.error("Lỗi load CSV", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});