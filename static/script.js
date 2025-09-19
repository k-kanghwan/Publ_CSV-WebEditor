let currentTabs = {};

async function fetchFiles() {
  const res = await fetch("/files");
  const files = await res.json();
  const select = document.getElementById("fileSelect");
  select.innerHTML = "";
  files.forEach((f) => {
    const option = document.createElement("option");
    option.value = f;
    option.textContent = f;
    select.appendChild(option);
  });
}

async function loadFiles() {
  const selected = Array.from(
    document.getElementById("fileSelect").selectedOptions
  ).map((o) => o.value);
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  currentTabs = {};

  for (const filename of selected) {
    const res = await fetch(`/load/${filename}`);
    const data = await res.json();

    const tab = document.createElement("div");
    tab.className = "tab";
    tab.innerHTML = `
      <h3>${filename}</h3>
      <input type="text" placeholder="검색..." class="searchBox">
      <button class="addRowBtn">행 추가</button>
      <button class="delRowBtn">선택 행 삭제</button>
      <button class="addColBtn">열 추가</button>
      <button class="delColBtn">열 삭제</button>
      <button class="saveBtn">저장</button>
      <table class="csvTable"></table>
    `;
    tabs.appendChild(tab);

    const table = tab.querySelector(".csvTable");
    renderTable(data, table);

    // 이벤트 연결
    tab.querySelector(".addRowBtn").onclick = () => addRow(table);
    tab.querySelector(".delRowBtn").onclick = () => delRow(table);
    tab.querySelector(".addColBtn").onclick = () => addColumn(table);
    tab.querySelector(".delColBtn").onclick = () => delColumn(table);
    tab.querySelector(".saveBtn").onclick = () => saveFile(filename, table);
    tab.querySelector(".searchBox").oninput = (e) =>
      filterTable(table, e.target.value);

    currentTabs[filename] = table;
  }
}

function renderTable(data, table) {
  table.innerHTML = "";
  if (data.length === 0) return;

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = "<th></th>"; // checkbox column
  Object.keys(data[0]).forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  data.forEach((row) => {
    const tr = document.createElement("tr");
    const check = document.createElement("td");
    check.innerHTML = `<input type="checkbox">`;
    tr.appendChild(check);

    Object.values(row).forEach((val) => {
      const td = document.createElement("td");
      td.contentEditable = "true";
      td.textContent = val;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

function addRow(table) {
  const headers = Array.from(table.rows[0].cells)
    .slice(1)
    .map((th) => th.textContent);
  const tr = document.createElement("tr");
  const check = document.createElement("td");
  check.innerHTML = `<input type="checkbox">`;
  tr.appendChild(check);

  headers.forEach(() => {
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.textContent = "";
    tr.appendChild(td);
  });
  table.appendChild(tr);
}

function delRow(table) {
  Array.from(table.rows)
    .slice(1)
    .forEach((row) => {
      const chk = row.querySelector("input[type=checkbox]");
      if (chk && chk.checked) {
        row.remove();
      }
    });
}

function addColumn(table) {
  const colName = prompt("새 열 이름을 입력하세요:");
  if (!colName) return;

  const th = document.createElement("th");
  th.textContent = colName;
  table.rows[0].appendChild(th);

  Array.from(table.rows)
    .slice(1)
    .forEach((row) => {
      const td = document.createElement("td");
      td.contentEditable = "true";
      td.textContent = "";
      row.appendChild(td);
    });
}

function delColumn(table) {
  const colIndex = prompt("삭제할 열 번호 (1부터 시작):");
  const idx = parseInt(colIndex);
  if (isNaN(idx) || idx < 1) return;

  Array.from(table.rows).forEach((row) => {
    if (row.cells[idx]) row.deleteCell(idx);
  });
}

function filterTable(table, keyword) {
  Array.from(table.rows)
    .slice(1)
    .forEach((row) => {
      const text = Array.from(row.cells)
        .map((td) => td.textContent)
        .join(" ");
      row.style.display = text.includes(keyword) ? "" : "none";
    });
}

async function saveFile(filename, table) {
  const headers = Array.from(table.rows[0].cells)
    .slice(1)
    .map((th) => th.textContent);
  const data = Array.from(table.rows)
    .slice(1)
    .map((row) => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row.cells[i + 1]?.textContent || "";
      });
      return obj;
    });

  await fetch(`/save/${filename}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  alert(`${filename} 저장 완료`);
}

document.getElementById("loadBtn").addEventListener("click", loadFiles);
fetchFiles();
