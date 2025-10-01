let currentTabs = {};
let allFiles = [];
let selectedFiles = new Set();
let currentGlobalQuery = "";

async function fetchFiles() {
  const res = await fetch("/files");
  allFiles = await res.json();
  renderFileOptions(allFiles);
}

function renderFileOptions(files) {
  const select = document.getElementById("fileSelect");
  select.innerHTML = "";
  files.forEach((f) => {
    const option = document.createElement("option");
    option.value = f;
    option.textContent = f;
    option.selected = selectedFiles.has(f);
    select.appendChild(option);
  });
}

async function loadFiles() {
  const selectEl = document.getElementById("fileSelect");
  const selectedRaw = selectedFiles.size
    ? Array.from(selectedFiles)
    : Array.from(selectEl.selectedOptions).map((o) => o.value);

  // Ensure deterministic sequential order
  const selected = selectedRaw.slice().sort((a, b) => a.localeCompare(b));

  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  currentTabs = {};

  // Simple progress info (ephemeral)
  let progressEl = document.getElementById("loadProgress");
  if (!progressEl) {
    progressEl = document.createElement("div");
    progressEl.id = "loadProgress";
    progressEl.style.marginTop = "10px";
    progressEl.style.fontSize = "12px";
    document.body.insertBefore(progressEl, tabs);
  }

  for (let i = 0; i < selected.length; i++) {
    const filename = selected[i];
    progressEl.textContent = `Loading (${i + 1}/${
      selected.length
    }) : ${filename}`;
    try {
      const res = await fetch(`/load/${encodeURIComponent(filename)}`);
      const data = await res.json();

      const tab = document.createElement("div");
      tab.className = "tab";
      tab.dataset.filename = filename;
      tab.innerHTML = `
        <div class="tab-header">
          <span class="filename" title="더블클릭하여 이름 변경">${filename}</span>
          <span class="rename-hint" style="font-size:11px;color:#888;">(더블클릭 수정 / Enter 저장 / Esc 취소)</span>
        </div>
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

      if (currentGlobalQuery) {
        const mc = filterTable(table, currentGlobalQuery);
        // Hide tab if no matches under global search
        tab.style.display = mc > 0 ? "" : "none";
      }

      tab.querySelector(".addRowBtn").onclick = () => addRow(table);
      tab.querySelector(".delRowBtn").onclick = () => delRow(table);
      tab.querySelector(".addColBtn").onclick = () => addColumn(table);
      tab.querySelector(".delColBtn").onclick = () => delColumn(table);
      tab.querySelector(".saveBtn").onclick = () => {
        const currentName = tab.dataset.filename || filename;
        saveFile(currentName, table);
      };
      tab.querySelector(".searchBox").oninput = (e) =>
        filterTable(table, e.target.value);

      currentTabs[filename] = table;

      // Inline rename logic
      const nameEl = tab.querySelector(".filename");
      if (nameEl) {
        nameEl.addEventListener("dblclick", () => beginRename(nameEl, tab));
      }
    } catch (err) {
      console.error("Failed to load", filename, err);
    }
  }

  progressEl.textContent = `Loaded ${selected.length} file(s).`;
  setTimeout(() => {
    if (progressEl && progressEl.parentElement) {
      progressEl.parentElement.removeChild(progressEl);
    }
  }, 2000);
}

async function setDataDirectory() {
  const newDir = prompt("새 데이터 디렉토리를 입력하세요:");
  if (!newDir) return;

  const res = await fetch("/set_data_dir", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ directory: newDir }),
  });
  const data = await res.json();
  if (data.status === "success") {
    alert(`데이터 디렉토리가 변경되었습니다: ${data.data_dir}`);
  } else {
    alert(`오류: ${data.error}`);
  }
  // 페이지 새로고침
  if (data.status === "success") {
    window.location.href = "/";
  }
}

function renderTable(data, table) {
  table.innerHTML = "";
  if (data.length === 0) return;

  const cols = Object.keys(data[0]);

  // colgroup for width control
  const colgroup = document.createElement("colgroup");
  const colCheck = document.createElement("col");
  colCheck.style.width = "36px";
  colgroup.appendChild(colCheck);
  cols.forEach(() => {
    const c = document.createElement("col");
    c.style.width = "auto";
    colgroup.appendChild(c);
  });
  table.appendChild(colgroup);

  // thead with resizer handles
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const firstTh = document.createElement("th");
  headerRow.appendChild(firstTh);
  cols.forEach((col, index) => {
    const th = document.createElement("th");
    th.textContent = col;
    th.dataset.colIndex = String(index + 1);
    const handle = document.createElement("div");
    handle.className = "col-resizer";
    th.appendChild(handle);
    th.addEventListener("dblclick", () => autoFitColumn(table, index + 1));
    handle.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      autoFitColumn(table, index + 1);
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement("tbody");
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
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  enableColumnResizing(table);
}

function addRow(table) {
  const headerCells = Array.from((table.tHead || table).rows[0].cells);
  const headers = headerCells.slice(1).map((th) => th.textContent);
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
  (table.tBodies[0] || table).appendChild(tr);
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

  // colgroup sync
  const colgroup = table.querySelector("colgroup");
  if (colgroup) {
    const c = document.createElement("col");
    c.style.width = "auto";
    colgroup.appendChild(c);
  }

  // header with resizer
  const headerRow = table.tHead?.rows[0] || table.rows[0];
  const index = headerRow.cells.length; // new index at end
  const th = document.createElement("th");
  th.textContent = colName;
  const handle = document.createElement("div");
  handle.className = "col-resizer";
  th.appendChild(handle);
  th.addEventListener("dblclick", () => autoFitColumn(table, index));
  handle.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    autoFitColumn(table, index);
  });
  headerRow.appendChild(th);

  // body cells
  const bodyRows = table.tBodies[0]
    ? Array.from(table.tBodies[0].rows)
    : Array.from(table.rows).slice(1);
  bodyRows.forEach((row) => {
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.textContent = "";
    row.appendChild(td);
  });

  enableColumnResizing(table);
}

function delColumn(table) {
  const colIndex = prompt("삭제할 열 번호 (1부터 시작):");
  const idx = parseInt(colIndex);
  if (isNaN(idx) || idx < 1) return;

  // colgroup sync
  const colgroup = table.querySelector("colgroup");
  if (colgroup && colgroup.children[idx]) {
    colgroup.removeChild(colgroup.children[idx]);
  }

  // header cell
  if (table.tHead && table.tHead.rows[0].cells[idx]) {
    table.tHead.rows[0].deleteCell(idx);
  }
  // body cells
  const rows = table.tBodies[0]
    ? Array.from(table.tBodies[0].rows)
    : Array.from(table.rows).slice(1);
  rows.forEach((row) => {
    if (row.cells[idx]) row.deleteCell(idx);
  });
}

function enableColumnResizing(table) {
  const colgroup = table.querySelector("colgroup");
  if (!colgroup) return;
  const headerRow = table.tHead?.rows[0] || table.rows[0];
  const handles = headerRow.querySelectorAll(".col-resizer");

  handles.forEach((handle) => {
    const th = handle.parentElement;
    const colIndex = Array.from(headerRow.children).indexOf(th);
    const colEl = colgroup.children[colIndex];
    if (!colEl) return;

    let startX = 0;
    let startWidth = 0;

    function onMouseDown(e) {
      startX = e.clientX;
      startWidth = th.getBoundingClientRect().width;
      document.body.classList.add("resizing");
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    }

    function onMouseMove(e) {
      const dx = e.clientX - startX;
      const newWidth = Math.max(40, startWidth + dx);
      colEl.style.width = newWidth + "px";
    }

    function onMouseUp() {
      document.body.classList.remove("resizing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    handle.onmousedown = null;
    handle.addEventListener("mousedown", onMouseDown);
  });
}

function autoFitColumn(table, colIndex) {
  // colIndex includes the checkbox column at 0; ignore 0
  if (colIndex === 0) return;
  const colgroup = table.querySelector("colgroup");
  const headerRow = table.tHead?.rows[0] || table.rows[0];
  const headerCell = headerRow.cells[colIndex];
  if (!colgroup || !headerCell) return;
  const colEl = colgroup.children[colIndex];
  if (!colEl) return;

  const rows = table.tBodies[0]
    ? Array.from(table.tBodies[0].rows)
    : Array.from(table.rows).slice(1);
  const sampleCell = rows[0]?.cells[colIndex] || headerCell;
  const style = window.getComputedStyle(sampleCell);

  const measurer = document.createElement("span");
  measurer.style.position = "absolute";
  measurer.style.visibility = "hidden";
  measurer.style.whiteSpace = "pre";
  measurer.style.fontFamily = style.fontFamily;
  measurer.style.fontSize = style.fontSize;
  measurer.style.fontWeight = style.fontWeight;
  measurer.style.letterSpacing = style.letterSpacing;
  document.body.appendChild(measurer);

  let max = 0;
  const cells = [
    headerCell,
    ...rows.map((r) => r.cells[colIndex]).filter(Boolean),
  ];
  cells.forEach((cell) => {
    const text = cell.textContent || "";
    measurer.textContent = text;
    max = Math.max(max, measurer.getBoundingClientRect().width);
  });

  const padding =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 0;
  const extra = 24; // handle + breathing room
  const target = Math.max(40, Math.min(800, Math.ceil(max + padding + extra)));
  colEl.style.width = target + "px";

  document.body.removeChild(measurer);
}

function filterTable(table, keyword) {
  const q = (keyword || "").trim().toLowerCase();
  let matchCount = 0;

  const rows = Array.from(table.rows).slice(1);
  rows.forEach((row) => {
    if (!q) {
      row.style.display = "";
      return;
    }
    const text = Array.from(row.cells)
      .map((td) => td.textContent)
      .join(" ")
      .toLowerCase();
    const isMatch = text.includes(q);
    if (isMatch) matchCount++;
    row.style.display = isMatch ? "" : "none";
  });

  const tabEl = table.closest(".tab");
  if (tabEl) {
    if (q && matchCount > 0) {
      tabEl.classList.add("tab-highlight");
    } else {
      tabEl.classList.remove("tab-highlight");
    }
  }
  return matchCount;
}

function filterAllTables(keyword) {
  currentGlobalQuery = keyword || "";
  const q = currentGlobalQuery.trim().toLowerCase();
  Object.values(currentTabs).forEach((table) => {
    const mc = filterTable(table, currentGlobalQuery);
    const tabEl = table.closest(".tab");
    if (!tabEl) return;
    if (!q) {
      tabEl.style.display = ""; // reset visibility when query cleared
    } else {
      tabEl.style.display = mc > 0 ? "" : "none";
    }
  });
}

// ===== Filename Inline Rename =====
function lockUIForRename(activeTab) {
  document.body.classList.add("rename-lock");
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("renaming-active"));
  if (activeTab) activeTab.classList.add("renaming-active");
}

function unlockUIForRename() {
  document.body.classList.remove("rename-lock");
  document
    .querySelectorAll(".tab.renaming-active")
    .forEach((t) => t.classList.remove("renaming-active"));
}

function beginRename(nameEl, tabEl) {
  if (nameEl.dataset.editing === "1") return;
  nameEl.dataset.editing = "1";
  const original = tabEl.dataset.filename || nameEl.textContent.trim();
  const input = document.createElement("input");
  input.type = "text";
  input.value = original;
  // Match the visual size of the original filename (h3-like)
  const cs = window.getComputedStyle(nameEl);
  input.style.fontSize = cs.fontSize;
  input.style.fontWeight = cs.fontWeight || "bold";
  input.style.width = Math.max(120, original.length * 8) + "px";
  nameEl.replaceWith(input);
  lockUIForRename(tabEl);
  input.focus();
  input.select();

  let finished = false; // guard to avoid double commit (Enter + blur)

  function cleanup() {
    input.removeEventListener("keydown", onKeyDown);
    input.removeEventListener("blur", onBlurCommit);
  }

  function restore() {
    input.replaceWith(nameEl);
    nameEl.dataset.editing = "0";
    unlockUIForRename();
  }

  function cancel() {
    if (finished) return;
    finished = true;
    cleanup();
    restore();
  }

  async function commit() {
    if (finished) return;
    let newName = input.value.trim();
    if (!newName) {
      cancel();
      return;
    }
    if (!newName.toLowerCase().endsWith(".csv")) newName += ".csv";
    if (newName === original) {
      cancel();
      return;
    }
    try {
      const res = await fetch("/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old: original, new: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "이름 변경 실패");
        cancel();
        return;
      }
      finished = true;
      // Update mappings
      delete currentTabs[original];
      currentTabs[newName] = tabEl.querySelector(".csvTable");
      if (selectedFiles.has(original)) {
        selectedFiles.delete(original);
        selectedFiles.add(newName);
      }
      tabEl.dataset.filename = newName;
      nameEl.textContent = newName;
      restore();
      cleanup();
      fetchFiles();
    } catch (e) {
      console.error(e);
      alert("이름 변경 오류");
      cancel();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }
  function onBlurCommit() {
    commit();
  }

  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("blur", onBlurCommit);
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
document
  .getElementById("setDirBtn")
  .addEventListener("click", setDataDirectory);

// file search + selection persistence
// Advanced file search: supports AND (space) and OR (|)
function matchesFileQuery(filename, queryRaw) {
  const name = (filename || "").toLowerCase();
  const q = (queryRaw || "").toLowerCase();
  // Split by OR first. Each group is AND-ed by spaces
  const orGroups = q
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  if (orGroups.length === 0) return true;

  return orGroups.some((group) => {
    const andTerms = group
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Group matches only if every term is found
    return andTerms.every((term) => name.includes(term));
  });
}

document.getElementById("fileSearch").addEventListener("input", (e) => {
  const q = e.target.value || "";
  const filtered = q.trim()
    ? allFiles.filter((f) => matchesFileQuery(f, q))
    : allFiles;
  renderFileOptions(filtered);
});

document.getElementById("fileSelect").addEventListener("change", (e) => {
  const select = e.target;
  const visibleValues = Array.from(select.options).map((o) => o.value);
  const visibleSelected = new Set(
    Array.from(select.selectedOptions).map((o) => o.value)
  );
  visibleValues.forEach((v) => {
    if (visibleSelected.has(v)) {
      selectedFiles.add(v);
    } else {
      selectedFiles.delete(v);
    }
  });
});

fetchFiles();

// global search across all loaded tabs
const globalSearch = document.getElementById("globalSearch");
if (globalSearch) {
  globalSearch.addEventListener("input", (e) => {
    filterAllTables(e.target.value);
  });
}

const globalSearchClear = document.getElementById("globalSearchClear");
if (globalSearchClear && globalSearch) {
  globalSearchClear.addEventListener("click", () => {
    globalSearch.value = "";
    filterAllTables("");
    globalSearch.focus();
  });
}

// Excel download functionality
function downloadExcel() {
  const tablesData = [];

  Object.entries(currentTabs).forEach(([filename, table]) => {
    // Check if table exists and has rows
    if (!table || !table.rows || table.rows.length === 0) {
      console.warn(`Table for ${filename} is empty or invalid`);
      return;
    }

    const tabEl = table.closest(".tab");

    // Skip hidden tabs (filtered out by global search)
    if (tabEl && tabEl.style.display === "none") {
      return;
    }

    // Get headers from first row, skip checkbox column
    const headerRow = table.rows[0];
    if (!headerRow || !headerRow.cells) {
      console.warn(`Header row for ${filename} is missing`);
      return;
    }

    const headers = Array.from(headerRow.cells)
      .slice(1) // Skip checkbox column
      .map((th) => th.textContent || "");

    // Get visible data rows
    const allRows = Array.from(table.rows).slice(1); // Skip header row
    const visibleRows = allRows.filter((row) => row.style.display !== "none");

    const data = visibleRows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        const cell = row.cells[index + 1]; // +1 to skip checkbox column
        obj[header] = cell ? cell.textContent || "" : "";
      });
      return obj;
    });

    if (data.length > 0) {
      tablesData.push({
        filename: filename,
        data: data,
      });
    }
  });

  if (tablesData.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  fetch("/download_excel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tables: tablesData,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("다운로드 실패");
      }
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "csv_editor_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch((error) => {
      console.error("Excel download error:", error);
      alert("Excel 다운로드 중 오류가 발생했습니다.");
    });
}

// Attach download functionality to button
const downloadBtn = document.getElementById("downloadExcelBtn");
if (downloadBtn) {
  downloadBtn.addEventListener("click", downloadExcel);
}
