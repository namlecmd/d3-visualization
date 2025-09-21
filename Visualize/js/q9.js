import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Hàm tiện ích để tự động xuống dòng cho văn bản trong SVG
function wrap(text, width) {
  text.each(function () {
    let text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1, // em
      y = text.attr("y"),
      dy = parseFloat(text.attr("dy")),
      tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

// Kích thước dashboard
const container = d3.select("#chart-container");
container.html(""); // clear trước khi vẽ mới

const width = container.node().clientWidth;
const height = window.innerHeight - 100;
const margin = { top: 60, right: 20, bottom: 40, left: 20 };

// Mapping từ mã nhóm hàng sang tên nhóm hàng đầy đủ
const groupNameMapping = {
    "BOT": "Bột",
    "SET": "Set Trà",
    "THO": "Trà Hoa",
    "TTC": "Trà củ, quả sấy",
    "TMX": "Trà Mix"
    // Bổ sung các nhóm khác nếu cần
};


// Khung SVG chính
const svg = container.append("svg")
  .attr("width", "100%")
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);


d3.csv("data/data.csv", d3.autoType).then(data => {
  // Chuẩn bị dữ liệu xác suất (giữ nguyên)
  const distinctOrdersItems = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d["Mã nhóm hàng"],
    d => d["Tên mặt hàng"]
  ).flatMap(([nhom, arr]) =>
    arr.map(([matHang, soDon]) => ({ Nhom_hang: nhom, Mat_hang: matHang, so_don_hang: soDon }))
  );

  const totalOrdersGroup = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d["Mã nhóm hàng"]
  ).map(([nhom, tong]) => ({ Nhom_hang: nhom, tong_so_don: tong }));

  const dfItemProb = distinctOrdersItems.map(d => {
    const tong = totalOrdersGroup.find(t => t.Nhom_hang === d.Nhom_hang).tong_so_don;
    return { ...d, tong_so_don: tong, xac_suat: d.so_don_hang / tong };
  });

  const groups = Array.from(new Set(dfItemProb.map(d => d.Nhom_hang)));

  // Grid layout: 3 cột
  const numCols = 3;
  const numRows = Math.ceil(groups.length / numCols);
  const cellWidth = (width - margin.left - margin.right) / numCols;
  const cellHeight = (height - margin.top - margin.bottom) / numRows;

  // Lề bên trong mỗi ô của biểu đồ con
  // Tăng lề trái (left) để có không gian cho tên mặt hàng
  const cellMargin = { top: 40, right: 40, bottom: 40, left: 180 };

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  groups.forEach((group, i) => {
    const row = Math.floor(i / numCols);
    const col = i % numCols;
    const x0 = col * cellWidth;
    const y0 = row * cellHeight;

    // Nhóm chính cho mỗi biểu đồ con
    const g = svg.append("g").attr("transform", `translate(${x0},${y0})`);

    const groupData = dfItemProb.filter(d => d.Nhom_hang === group)
      .sort((a, b) => d3.descending(a.xac_suat, b.xac_suat));
    
    // Tính toán lại không gian vẽ thực tế bên trong mỗi ô
    const chartWidth = cellWidth - cellMargin.left - cellMargin.right;
    const chartHeight = cellHeight - cellMargin.top - cellMargin.bottom;

    const x = d3.scaleLinear()
      .domain([0, d3.max(groupData, d => d.xac_suat)])
      .range([0, chartWidth]);

    const y = d3.scaleBand()
      .domain(groupData.map(d => d.Mat_hang))
      .range([0, chartHeight])
      .padding(0.2);

    // Nhóm cho nội dung biểu đồ (trục, thanh bar) để dễ dàng áp dụng lề
    const chartArea = g.append("g")
        .attr("transform", `translate(${cellMargin.left}, ${cellMargin.top})`);

    // Bars
    chartArea.selectAll("rect")
      .data(groupData)
      .join("rect")
      .attr("x", 0)
      .attr("y", d => y(d.Mat_hang))
      .attr("width", d => x(d.xac_suat))
      .attr("height", y.bandwidth())
      .attr("fill", d => color(d.Mat_hang));

    // Label %
    chartArea.selectAll("text.value")
      .data(groupData)
      .join("text")
      .attr("class", "value")
      .attr("x", d => x(d.xac_suat) + 5)
      .attr("y", d => y(d.Mat_hang) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .text(d => (d.xac_suat * 100).toFixed(2) + "%");

    // Y-axis (tên mặt hàng)
    // Gọi hàm wrap để tự động xuống dòng
    g.append("g")
      .attr("transform", `translate(${cellMargin.left}, ${cellMargin.top})`)
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll(".tick text")
        .style("font-size", "10px")
        .call(wrap, cellMargin.left - 10); // cellMargin.left - 10 là chiều rộng tối đa cho text

    // X-axis
    chartArea.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format(".0%")))
      .selectAll("text")
      .style("font-size", "10px");

    // Tiêu đề nhóm - ĐÃ CẬP NHẬT THEO YÊU CẦU
    g.append("text")
      .attr("x", cellMargin.left + chartWidth / 2)
      .attr("y", cellMargin.top - 15) // Đặt tiêu đề phía trên biểu đồ
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(`[${group}] ${groupNameMapping[group] || group}`); // Sử dụng mapping
  });
  
  // Tiêu đề tổng thể
  svg.append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("Xác suất bán hàng của mặt hàng theo nhóm hàng");
});