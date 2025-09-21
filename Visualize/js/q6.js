// js/q6.js — Q6: Doanh số bán hàng theo Khung giờ
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 950, height = 500, margin = {top:60, right:30, bottom:100, left:80};

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
  // B1. Parse datetime & tạo Giờ / Khung giờ
  data.forEach(d => {
    let date = parseDate(d["Thời gian tạo đơn"]);
    d._date = date;
    d.Gio = date ? date.getHours() : null;
    d["Khung giờ"] = d.Gio !== null ? `${String(d.Gio).padStart(2,"0")}:00 - ${String(d.Gio).padStart(2,"0")}:59` : "Khác";
  });

  // B2. Gom nhóm theo Giờ
  const rolled = d3.rollups(
    data,
    v => {
      const doanhthu = d3.sum(v, d => d["Thành tiền"]);
      const sl = d3.sum(v, d => d["SL"]);
      return {
        doanhthu,
        sl,
        "Doanh thu TB": doanhthu / 365,
        "SL TB": sl / 365
      };
    },
    d => d.Gio,
    d => d["Khung giờ"]
  );

  let hourly = rolled.map(([Gio, sub]) => {
    const [KhungGio, obj] = sub[0]; // mỗi giờ chỉ có 1 khung
    return {Gio, "Khung giờ": KhungGio, ...obj};
  });

  // B3. Sort theo giờ (0→23)
  hourly.sort((a,b) => a.Gio - b.Gio);

  // B4. Scales
  const x = d3.scaleBand()
    .domain(hourly.map(d => d["Khung giờ"]))
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(hourly, d => d["Doanh thu TB"])]).nice()
    .range([innerHeight, 0]);

    const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(hourly.map(d => d["Khung giờ"]));

  // B5. Vẽ cột
  g.selectAll("rect")
    .data(hourly)
    .join("rect")
      .attr("x", d => x(d["Khung giờ"]))
      .attr("y", d => y(d["Doanh thu TB"]))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d["Doanh thu TB"]))
      .attr("fill", d => color(d["Khung giờ"]))
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`
            <b>${d["Khung giờ"]}</b><br/>
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
    .call(xAxis)
    .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

  g.append("g").call(yAxis);

  // B7. Title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", margin.top/2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Doanh số bán hàng theo Khung giờ");

}).catch(err => {
  console.error("Lỗi load CSV", err);
  g.append("text").text("Không load được data.csv").style("fill","red");
});