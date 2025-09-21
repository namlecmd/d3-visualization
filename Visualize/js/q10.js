import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Khung chính
const container = d3.select("#chart-container");
container.html("");

const width = container.node().clientWidth;
const height = window.innerHeight - 100;
const margin = { top: 60, right: 30, bottom: 40, left: 50 };

// Mapping tên nhóm hàng (bạn mở rộng nếu cần)
const groupNameMapping = {
  "BOT": "Bột",
  "SET": "Set Trà",
  "THO": "Trà Hoa",
  "TTC": "Trà củ, quả sấy",
  "TMX": "Trà Mix"
};

const svg = container.append("svg")
  .attr("width", "100%")
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("data/data.csv", d3.autoType).then(data => {
  // Chuẩn bị dữ liệu: thêm cột Tháng
  data.forEach(d => {
    const date = new Date(d["Thời gian tạo đơn"]);
    d.Tháng = date.getMonth() + 1;
  });

  // Tính tổng số đơn hàng theo nhóm hàng & tháng
  const totalOrdersGroupMonth = d3.rollups(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d["Mã nhóm hàng"],
    d => d.Tháng
  ).flatMap(([nhom, arr]) => arr.map(([thang, tong]) => ({
    Nhom_hang: nhom, Tháng: thang, tong_don: tong
  })));

  // Tính số đơn hàng theo nhóm hàng, tháng, mặt hàng
  // Trả về object chứa tên mặt hàng và số đơn hàng (unique orders)
  const ordersItemMonth = d3.rollups(
    data,
    v => ({ ten: v[0]["Tên mặt hàng"], don_hang: new Set(v.map(d => d["Mã đơn hàng"]) ).size }),
    d => d["Mã nhóm hàng"],
    d => d.Tháng,
    d => d["Mã mặt hàng"]
  ).flatMap(([nhom, arr1]) =>
    arr1.flatMap(([thang, arr2]) =>
      arr2.map(([ma, obj]) => ({ Nhom_hang: nhom, Tháng: thang, Ma_hang: ma, Ten_hang: obj.ten, don_hang: obj.don_hang }))
    )
  );

  // Merge xác suất
  const dfProb = ordersItemMonth.map(d => {
    const tong = totalOrdersGroupMonth.find(t => t.Nhom_hang === d.Nhom_hang && t.Tháng === d.Tháng)?.tong_don || 1;
    return {
      ...d,
      Mat_hang: `[${d.Ma_hang}] ${d.Ten_hang}`,
      xac_suat: d.don_hang / tong
    };
  });

  const groups = Array.from(new Set(dfProb.map(d => d.Nhom_hang)));

  // Grid layout
  const numCols = 3;
  const numRows = Math.ceil(groups.length / numCols);
  const cellWidth = (width - margin.left - margin.right) / numCols;
  const cellHeight = (height - margin.top - margin.bottom) / numRows;

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  groups.forEach((group, i) => {
    const row = Math.floor(i / numCols);
    const col = i % numCols;
    const x0 = col * cellWidth;
    const y0 = row * cellHeight;

    const g = svg.append("g").attr("transform", `translate(${x0},${y0})`);

    const groupData = dfProb.filter(d => d.Nhom_hang === group);
  const items = Array.from(new Set(groupData.map(d => d.Mat_hang)));

  // helper để tạo class an toàn từ Mã mặt hàng
  const safeClassFromMa = ma => `item-${String(ma).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

    const chartWidth = cellWidth - 60;
    const chartHeight = cellHeight - 60;

    const monthsExtent = d3.extent(groupData, d => d.Tháng);
    // fallback nếu không có dữ liệu
    if (monthsExtent[0] == null) monthsExtent[0] = 1;
    if (monthsExtent[1] == null) monthsExtent[1] = 12;
    // nếu chỉ có một tháng, mở rộng domain để scale hoạt động tốt
    if (monthsExtent[0] === monthsExtent[1]) {
      monthsExtent[0] = monthsExtent[0] - 0.5;
      monthsExtent[1] = monthsExtent[1] + 0.5;
    }

    const x = d3.scaleLinear()
      .domain(monthsExtent)
      .range([0, chartWidth]);

    // Y domain: tự động theo dữ liệu của group (0 tới max xác suất) với một chút padding
    const maxProb = d3.max(groupData, d => d.xac_suat) || 0.01;
    const yTop = Math.min(1, maxProb * 1.1); // không vượt quá 100%
    const y = d3.scaleLinear()
      .domain([0, yTop])
      .nice()
      .range([chartHeight, 0]);

    const chartArea = g.append("g").attr("transform", `translate(50,20)`);

    // Vẽ từng mặt hàng
    items.forEach(item => {
      const itemData = groupData.filter(d => d.Mat_hang === item);
      const safeClass = safeClassFromMa(item);

      const line = d3.line()
        .x(d => x(d.Tháng))
        .y(d => y(d.xac_suat));

      chartArea.append("path")
        .datum(itemData)
        .attr("fill", "none")
        .attr("stroke", color(item))
        .attr("stroke-width", 2)
        .attr("class", safeClass + "-line")
        .attr("d", line);

      // Join points without relying on unsafe class selector
      chartArea.selectAll(null)
        .data(itemData)
        .join("circle")
        .attr("class", safeClass)
        .attr("cx", d => x(d.Tháng))
        .attr("cy", d => y(d.xac_suat))
        .attr("r", 2)
        .attr("fill", color(item));
    });

    // Axes
    // X axis: format T01..T12
    chartArea.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d => {
        const m = Math.round(d);
        return `T${String(m).padStart(2, '0')}`;
      }).tickSizeOuter(0))
      .selectAll("text").style("font-size", "9px");

    // Y axis: percent format, ticks adapt to domain
    chartArea.append("g")
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%")))
      .selectAll("text").style("font-size", "9px");

    // Tiêu đề nhỏ
    g.append("text")
      .attr("x", cellWidth / 2)
      .attr("y", 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(`[${group}] ${groupNameMapping[group] || group}`);
  });

  // Tiêu đề tổng thể
  svg.append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("Xác suất mua theo tháng của mặt hàng theo nhóm hàng");
});