// js/q4.js — Q4: Doanh thu trung bình theo Ngày trong tuần
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 850, height = 450, margin = {top:60, right:30, bottom:60, left:80};

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

const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");

d3.csv("data/data.csv", d3.autoType).then(data => {
  data.forEach(d => {
    let date = parseDate(d["Thời gian tạo đơn"]);
    d._date = date;
    d.dayOfWeek = date ? date.getDay() : null; // JS: 0=CN → 6=Thứ 7
    // Map sang Python convention (0=Thứ 2 → 6=CN)
    d.dayOfWeek = d.dayOfWeek === 0 ? 6 : d.dayOfWeek - 1;
  });

  // B2. Gom nhóm theo dayOfWeek
  const rolled = d3.rollups(
    data,
    v => {
      const doanhthu = d3.sum(v, d => d["Thành tiền"]);
      const sl = d3.sum(v, d => d["SL"] ?? 1); // fallback = 1 nếu không có cột SL
      return {doanhthu, sl};
    },
    d => d.dayOfWeek
  );

  // B3. Pad đủ 0..6 (nếu thiếu thì =0)
  const daysVi = ["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","CN"];
  let weekly = d3.range(7).map(i => {
    const found = rolled.find(d => d[0] === i);
    if (found) {
      return {
        "Thứ trong tuần": i,
        "Ngày Label": daysVi[i],
        "Doanh thu TB": found[1].doanhthu / 52,
        "SL TB": found[1].sl / 52
      };
    } else {
      return {
        "Thứ trong tuần": i,
        "Ngày Label": daysVi[i],
        "Doanh thu TB": 0,
        "SL TB": 0
      };
    }
  });

  // B4. Scales
  const x = d3.scaleBand()
    .domain(daysVi)
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(weekly, d => d["Doanh thu TB"])]).nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(daysVi);

  // B5. Bars
  g.selectAll("rect")
    .data(weekly)
    .join("rect")
      .attr("x", d => x(d["Ngày Label"]))
      .attr("y", d => y(d["Doanh thu TB"]))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d["Doanh thu TB"]))
      .attr("fill", d => color(d["Ngày Label"]))
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

  // B6. Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => (d/1e6) + "M");

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
    .text("Doanh thu TRUNG BÌNH theo Ngày trong tuần");

}).catch(err => {
  console.error("Lỗi load CSV", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});