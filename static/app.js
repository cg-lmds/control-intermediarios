(() => {
  const state = {
    referidores: [],
    filteredReferidores: [],
    vencimientoTypes: [],
    selectedVencimientos: new Set(),
    tasa: null,
    stats: null,
    sortKey: "pago_minimo_usd",
    sortDir: "desc",
    searchQuery: "",
    page: 1,
    pageSize: 25,
    modalReferidor: null,
    modalRows: [],
    seguimientos: [],
    sheetsConfigured: false,
    seguimientosLoaded: false,
  };

  // DOM elements
  const $ = (id) => document.getElementById(id);
  const tabBtnSegmentador = $("tabBtnSegmentador");
  const tabBtnSeguimiento = $("tabBtnSeguimiento");
  const panelSegmentador = $("panelSegmentador");
  const panelSeguimiento = $("panelSeguimiento");

  const sheetsStatusBadge = $("sheetsStatusBadge");
  const seguimientoForm = $("seguimientoForm");
  const segReferidor = $("segReferidor");
  const referidoresDatalist = $("referidoresDatalist");
  const segResponsable = $("segResponsable");
  const segEstado = $("segEstado");
  const segFechaRespuesta = $("segFechaRespuesta");
  const segCantidadClientes = $("segCantidadClientes");
  const segPagoMinimo = $("segPagoMinimo");
  const segObservaciones = $("segObservaciones");
  const btnResetSegForm = $("btnResetSegForm");
  const btnSaveSeguimiento = $("btnSaveSeguimiento");
  const segSpinner = $("segSpinner");
  const searchSeguimiento = $("searchSeguimiento");
  const btnRefreshSeguimientos = $("btnRefreshSeguimientos");
  const seguimientoTbody = $("seguimientoTbody");
  const alertBox = $("alertBox");
  const uploadForm = $("uploadForm");
  const fileOrigen = $("fileOrigen");
  const fileReferidores = $("fileReferidores");
  const dzOrigen = $("dzOrigen");
  const dzReferidores = $("dzReferidores");
  const labelOrigen = $("labelOrigen");
  const labelReferidores = $("labelReferidores");
  const inputTasa = $("inputTasa");
  const btnFetchBcv = $("btnFetchBcv");
  const bcvMeta = $("bcvMeta");
  const btnProcess = $("btnProcess");
  const processSpinner = $("processSpinner");
  const btnClearSession = $("btnClearSession");
  const lastProcessedBadge = $("lastProcessedBadge");

  const resultsSection = $("resultsSection");
  const kpiReferidores = $("kpiReferidores");
  const kpiMatchRate = $("kpiMatchRate");
  const kpiClientes = $("kpiClientes");
  const kpiTotalBase = $("kpiTotalBase");
  const kpiPagoMinimo = $("kpiPagoMinimo");
  const kpiTasaInfo = $("kpiTasaInfo");
  const kpiPagoTotal = $("kpiPagoTotal");

  const chkOnlyDebt = $("chkOnlyDebt");
  const chkOnlyOverdue = $("chkOnlyOverdue");
  const chkIncludeSinRef = $("chkIncludeSinRef");
  const chkIncludeTotalCol = $("chkIncludeTotalCol");
  const vencChips = $("vencChips");

  const btnDownloadZip = $("btnDownloadZip");
  const btnDownloadConsolidado = $("btnDownloadConsolidado");

  const searchReferidor = $("searchReferidor");
  const pageSizeSelect = $("pageSizeSelect");
  const referidoresTbody = $("referidoresTbody");
  const tableCountInfo = $("tableCountInfo");
  const paginationControls = $("paginationControls");

  const detailModal = $("detailModal");
  const modalTitle = $("modalTitle");
  const modalSubtitle = $("modalSubtitle");
  const modalDownloadBtn = $("modalDownloadBtn");
  const modalCloseBtn = $("modalCloseBtn");
  const modalSearch = $("modalSearch");
  const modalTbody = $("modalTbody");

  const fmtUSD = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));
  const fmtInt = (n) => new Intl.NumberFormat("es-VE").format(Number(n || 0));

  function showAlert(message, type = "info") {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove("hidden");
  }

  function hideAlert() {
    alertBox.classList.add("hidden");
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildFilterQuery(extra = {}) {
    const params = new URLSearchParams();
    params.set("only_with_debt", chkOnlyDebt.checked ? "true" : "false");
    params.set("only_overdue", chkOnlyOverdue.checked ? "true" : "false");
    params.set("include_sin_referidor", chkIncludeSinRef.checked ? "true" : "false");
    params.set("include_pago_total", chkIncludeTotalCol.checked ? "true" : "false");
    if (state.selectedVencimientos.size > 0) {
      params.set("vencimientos", Array.from(state.selectedVencimientos).join(","));
    }
    Object.entries(extra).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    return params.toString();
  }

  // Dropzone wiring
  function setupDropzone(zone, input, label) {
    const updateLabel = () => {
      if (input.files && input.files.length > 0) {
        const f = input.files[0];
        const mb = (f.size / (1024 * 1024)).toFixed(2);
        label.textContent = `${f.name} (${mb} MB)`;
        zone.classList.add("has-file");
      } else {
        label.textContent = "Arrastra aquí o haz clic para seleccionar";
        zone.classList.remove("has-file");
      }
    };

    input.addEventListener("change", updateLabel);

    ["dragenter", "dragover"].forEach((evt) => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((evt) => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
      });
    });

    zone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        updateLabel();
      }
    });
  }

  setupDropzone(dzOrigen, fileOrigen, labelOrigen);
  setupDropzone(dzReferidores, fileReferidores, labelReferidores);

  // Fetch BCV Rate
  async function fetchBcvRate(silent = false) {
    btnFetchBcv.disabled = true;
    btnFetchBcv.textContent = "Consultando...";
    try {
      const resp = await fetch("/api/bcv-rate");
      const data = await resp.json();
      if (data.ok && data.rate) {
        inputTasa.value = data.rate;
        bcvMeta.textContent = `Tasa ${data.source}: Bs ${data.rate}${data.updated_at ? ` (${data.updated_at.slice(0, 10)})` : ""}`;
        if (!silent) showAlert(`Tasa BCV cargada: Bs ${data.rate} por USD.`, "success");
      } else if (!silent) {
        bcvMeta.textContent = data.message || "Ingresa la tasa manualmente.";
        showAlert(data.message || "No se pudo obtener la tasa BCV automáticamente.", "info");
      }
    } catch {
      if (!silent) showAlert("No se pudo conectar al servicio BCV. Ingresa la tasa manualmente.", "info");
    } finally {
      btnFetchBcv.disabled = false;
      btnFetchBcv.textContent = "Consultar BCV";
    }
  }

  btnFetchBcv.addEventListener("click", () => fetchBcvRate(false));

  // Render Vencimiento chips
  function renderVencChips(types) {
    state.vencimientoTypes = types || [];
    vencChips.innerHTML = "";
    state.vencimientoTypes.forEach((v) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (state.selectedVencimientos.has(v) ? " active" : "");
      btn.textContent = v;
      btn.addEventListener("click", () => {
        if (state.selectedVencimientos.has(v)) {
          state.selectedVencimientos.delete(v);
          btn.classList.remove("active");
        } else {
          state.selectedVencimientos.add(v);
          btn.classList.add("active");
        }
        refreshSummary();
      });
      vencChips.appendChild(btn);
    });
  }

  // Apply response payload to UI
  function renderDashboard(data, rebuildChips = false) {
    state.tasa = data.tasa;
    state.stats = data.stats;
    state.referidores = data.referidores || [];

    if (rebuildChips) {
      state.selectedVencimientos.clear();
      renderVencChips(data.stats?.vencimiento_types || []);
    }

    const totalBase = data.stats?.total_records || 0;
    const matched = data.stats?.matched_count || 0;
    const matchPct = totalBase > 0 ? ((matched / totalBase) * 100).toFixed(1) : "0.0";

    kpiReferidores.textContent = fmtInt(data.kpis?.total_referidores || 0);
    kpiMatchRate.textContent = `Cruce exitoso: ${matchPct}% (${fmtInt(matched)}/${fmtInt(totalBase)})`;
    kpiClientes.textContent = fmtInt(data.kpis?.total_clientes || 0);
    kpiTotalBase.textContent = `Base total: ${fmtInt(totalBase)} registros`;
    kpiPagoMinimo.textContent = fmtUSD(data.kpis?.pago_minimo_usd || 0);
    kpiTasaInfo.textContent = `Tasa aplicada: Bs ${Number(data.tasa).toFixed(4)}`;
    kpiPagoTotal.textContent = fmtUSD(data.kpis?.pago_total_usd || 0);

    lastProcessedBadge.textContent = `Cargado: ${data.created_at?.replace("T", " ") || "Ahora"}`;
    lastProcessedBadge.classList.remove("hidden");
    btnClearSession.classList.remove("hidden");
    resultsSection.classList.remove("hidden");

    state.page = 1;
    populateReferidoresDatalist();
    applyTableFilterAndRender();
  }

  function populateReferidoresDatalist() {
    referidoresDatalist.innerHTML = "";
    state.referidores.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.referidor;
      referidoresDatalist.appendChild(opt);
    });
  }

  // Upload & Process
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    if (!fileOrigen.files[0] || !fileReferidores.files[0]) {
      showAlert("Debes seleccionar ambos archivos: DATA ORIGEN y REFERIDORES.", "error");
      return;
    }

    const tasaVal = parseFloat(inputTasa.value);
    if (!tasaVal || tasaVal <= 0) {
      showAlert("Ingresa una tasa del día válida (mayor que 0).", "error");
      return;
    }

    const formData = new FormData();
    formData.append("data_origen", fileOrigen.files[0]);
    formData.append("referidores", fileReferidores.files[0]);
    formData.append("tasa", String(tasaVal));

    btnProcess.disabled = true;
    processSpinner.classList.remove("hidden");

    try {
      const resp = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || "No se pudo procesar la información.");
      }

      chkOnlyDebt.checked = false;
      chkOnlyOverdue.checked = false;
      chkIncludeSinRef.checked = true;

      renderDashboard(data, true);
      showAlert(
        `¡Cruce completado! ${fmtInt(data.stats.total_records)} registros segmentados en ${fmtInt(
          data.kpis.total_referidores
        )} referidores.`,
        "success"
      );
    } catch (err) {
      showAlert(err.message || "Error procesando los archivos.", "error");
    } finally {
      btnProcess.disabled = false;
      processSpinner.classList.add("hidden");
    }
  });

  // Refresh summary when filters change
  async function refreshSummary() {
    try {
      const qs = buildFilterQuery();
      const resp = await fetch(`/api/summary?${qs}`);
      const data = await resp.json();
      if (!resp.ok) {
        if (resp.status === 404 || resp.status === 410) {
          resultsSection.classList.add("hidden");
          btnClearSession.classList.add("hidden");
          showAlert(data.detail, "info");
          return;
        }
        throw new Error(data.detail || "Error actualizando filtros.");
      }
      renderDashboard(data, false);
    } catch (err) {
      showAlert(err.message, "error");
    }
  }

  [chkOnlyDebt, chkOnlyOverdue, chkIncludeSinRef].forEach((el) => {
    el.addEventListener("change", refreshSummary);
  });

  // Search, Sort, Paginate DataTable
  function applyTableFilterAndRender() {
    const q = state.searchQuery.trim().toLowerCase();
    let list = state.referidores.filter((r) => !q || r.referidor.toLowerCase().includes(q));

    const { sortKey, sortDir } = state;
    const mult = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string") return va.localeCompare(vb, "es") * mult;
      return (va - vb) * mult;
    });

    state.filteredReferidores = list;
    renderTablePage();
  }

  function renderTablePage() {
    const list = state.filteredReferidores;
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, total);
    const slice = list.slice(start, end);

    referidoresTbody.innerHTML = "";

    if (slice.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align:center; padding: 28px; color: var(--text-muted);">No se encontraron referidores con el criterio actual.</td>`;
      referidoresTbody.appendChild(tr);
    } else {
      slice.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="ref-name">${escapeHtml(row.referidor)}</td>
          <td class="num">${fmtInt(row.total_clientes)}</td>
          <td class="num">${fmtInt(row.clientes_vencidos)}</td>
          <td class="num"><strong>${fmtUSD(row.pago_minimo_usd)}</strong></td>
          <td class="num">${fmtUSD(row.pago_total_usd)}</td>
          <td class="actions-col">
            <div class="row-actions">
              <button type="button" class="btn btn-outline btn-sm btn-preview">Ver</button>
              <button type="button" class="btn btn-seg btn-sm btn-log-seg">Registrar gestión</button>
              <button type="button" class="btn btn-download btn-sm btn-dl-one">Descargar Excel</button>
            </div>
          </td>
        `;

        tr.querySelector(".btn-preview").addEventListener("click", () => openReferidorModal(row.referidor));
        tr.querySelector(".btn-log-seg").addEventListener("click", () => openSeguimientoForRow(row));
        tr.querySelector(".btn-dl-one").addEventListener("click", () => downloadReferidor(row.referidor));
        referidoresTbody.appendChild(tr);
      });
    }

    tableCountInfo.textContent =
      total === 0
        ? "Mostrando 0 referidores"
        : `Mostrando ${fmtInt(start + 1)}–${fmtInt(end)} de ${fmtInt(total)} referidores`;

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    paginationControls.innerHTML = "";
    if (totalPages <= 1) return;

    const addBtn = (label, page, disabled = false, active = false) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "page-btn" + (active ? " active" : "");
      btn.textContent = label;
      btn.disabled = disabled;
      btn.addEventListener("click", () => {
        state.page = page;
        renderTablePage();
      });
      paginationControls.appendChild(btn);
    };

    addBtn("‹ Anterior", state.page - 1, state.page === 1);

    const maxButtons = 5;
    let startP = Math.max(1, state.page - 2);
    let endP = Math.min(totalPages, startP + maxButtons - 1);
    startP = Math.max(1, endP - maxButtons + 1);

    for (let p = startP; p <= endP; p++) {
      addBtn(String(p), p, false, p === state.page);
    }

    addBtn("Siguiente ›", state.page + 1, state.page === totalPages);
  }

  searchReferidor.addEventListener("input", () => {
    state.searchQuery = searchReferidor.value;
    state.page = 1;
    applyTableFilterAndRender();
  });

  pageSizeSelect.addEventListener("change", () => {
    state.pageSize = parseInt(pageSizeSelect.value, 10) || 25;
    state.page = 1;
    renderTablePage();
  });

  document.querySelectorAll("#referidoresTable th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = key === "referidor" ? "asc" : "desc";
      }

      document.querySelectorAll("#referidoresTable th.sortable").forEach((el) => {
        el.classList.remove("active-sort", "asc", "desc");
      });
      th.classList.add("active-sort", state.sortDir);
      applyTableFilterAndRender();
    });
  });

  // Downloads
  function downloadReferidor(referidorName) {
    const qs = buildFilterQuery({ referidor: referidorName });
    window.location.href = `/api/download/referidor?${qs}`;
  }

  btnDownloadZip.addEventListener("click", () => {
    const qs = buildFilterQuery();
    window.location.href = `/api/download/zip?${qs}`;
  });

  btnDownloadConsolidado.addEventListener("click", () => {
    const qs = buildFilterQuery();
    window.location.href = `/api/download/consolidado?${qs}`;
  });

  // Preview Modal
  async function openReferidorModal(referidorName) {
    state.modalReferidor = referidorName;
    modalTitle.textContent = referidorName;
    modalSubtitle.textContent = "Cargando clientes...";
    modalSearch.value = "";
    modalTbody.innerHTML = "";
    detailModal.classList.remove("hidden");

    const showTotal = chkIncludeTotalCol.checked;
    document.querySelectorAll(".modal-col-total").forEach((el) => {
      el.classList.toggle("hidden", !showTotal);
    });

    try {
      const qs = buildFilterQuery({ referidor: referidorName });
      const resp = await fetch(`/api/referidor-detail?${qs}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "No se pudo cargar el detalle.");

      state.modalRows = data.rows || [];
      modalSubtitle.textContent = `${fmtInt(data.total)} clientes · Pago Mínimo: ${fmtUSD(
        data.pago_minimo_usd
      )} · Pago Total: ${fmtUSD(data.pago_total_usd)}`;
      renderModalRows();
    } catch (err) {
      modalSubtitle.textContent = err.message;
    }
  }

  function vencBadgeClass(venc) {
    const v = String(venc || "").toLowerCase();
    if (v === "vigente") return "badge-venc badge-vigente";
    if (v.includes("30") || v.includes("60")) return "badge-venc badge-mora-mid";
    return "badge-venc badge-mora";
  }

  function renderModalRows() {
    const q = modalSearch.value.trim().toLowerCase();
    const showTotal = chkIncludeTotalCol.checked;
    const filtered = state.modalRows.filter((r) => {
      if (!q) return true;
      return (
        r.documento.toLowerCase().includes(q) ||
        r.nombre.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.tipo_vencimiento.toLowerCase().includes(q)
      );
    });

    modalTbody.innerHTML = "";
    const limit = 300;
    filtered.slice(0, limit).forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code>${escapeHtml(r.documento)}</code></td>
        <td>${escapeHtml(r.nombre)}</td>
        <td>${escapeHtml(r.telefono)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td class="num">${fmtUSD(r.pago_minimo_usd)}</td>
        <td class="num modal-col-total ${showTotal ? "" : "hidden"}">${fmtUSD(r.pago_total_usd)}</td>
        <td><span class="${vencBadgeClass(r.tipo_vencimiento)}">${escapeHtml(r.tipo_vencimiento)}</span></td>
        <td>${escapeHtml(r.referidor)}</td>
      `;
      modalTbody.appendChild(tr);
    });

    if (filtered.length > limit) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8" style="text-align:center; color: var(--text-muted); padding: 14px;">Mostrando los primeros ${limit} de ${fmtInt(
        filtered.length
      )} registros. Descarga el Excel para ver el listado completo.</td>`;
      modalTbody.appendChild(tr);
    }
  }

  modalSearch.addEventListener("input", renderModalRows);
  modalDownloadBtn.addEventListener("click", () => {
    if (state.modalReferidor) downloadReferidor(state.modalReferidor);
  });

  function closeModal() {
    detailModal.classList.add("hidden");
  }
  modalCloseBtn.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !detailModal.classList.contains("hidden")) closeModal();
  });

  // Clear ephemeral session
  btnClearSession.addEventListener("click", async () => {
    try {
      await fetch("/api/clear", { method: "POST" });
      resultsSection.classList.add("hidden");
      btnClearSession.classList.add("hidden");
      lastProcessedBadge.classList.add("hidden");
      state.referidores = [];
      showAlert("Los datos temporales han sido eliminados de memoria.", "info");
    } catch {
      showAlert("No se pudo limpiar la sesión.", "error");
    }
  });

  // ==========================================
  // TABS & SEGUIMIENTO DE REFERIDORES (SHEETS)
  // ==========================================

  function switchTab(tabName) {
    const isSeg = tabName === "seguimiento";
    tabBtnSegmentador.classList.toggle("active", !isSeg);
    tabBtnSeguimiento.classList.toggle("active", isSeg);
    panelSegmentador.classList.toggle("hidden", isSeg);
    panelSeguimiento.classList.toggle("hidden", !isSeg);

    if (isSeg && !state.seguimientosLoaded) {
      loadSeguimientos();
    }
  }

  tabBtnSegmentador.addEventListener("click", () => switchTab("segmentador"));
  tabBtnSeguimiento.addEventListener("click", () => switchTab("seguimiento"));

  function openSeguimientoForRow(row) {
    segReferidor.value = row.referidor || "";
    segCantidadClientes.value = row.total_clientes ?? "";
    segPagoMinimo.value = row.pago_minimo_usd != null ? Number(row.pago_minimo_usd).toFixed(2) : "";
    switchTab("seguimiento");
    segResponsable.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Auto-fill clients & min payment when selecting a loaded referidor from datalist
  segReferidor.addEventListener("change", () => {
    const val = segReferidor.value.trim().toLowerCase();
    const match = state.referidores.find((r) => r.referidor.toLowerCase() === val);
    if (match) {
      if (!segCantidadClientes.value) segCantidadClientes.value = match.total_clientes ?? "";
      if (!segPagoMinimo.value) segPagoMinimo.value = Number(match.pago_minimo_usd || 0).toFixed(2);
    }
  });

  async function checkSheetsConfig() {
    try {
      const resp = await fetch("/api/seguimiento/config");
      const data = await resp.json();
      state.sheetsConfigured = Boolean(data.configured);
      if (state.sheetsConfigured) {
        sheetsStatusBadge.textContent = "Conectado a Google Sheets";
        sheetsStatusBadge.className = "badge badge-connected";
      } else {
        sheetsStatusBadge.textContent = "Falta GOOGLE_SHEETS_WEBHOOK_URL";
        sheetsStatusBadge.className = "badge badge-disconnected";
      }
    } catch {
      sheetsStatusBadge.textContent = "Sin conexión";
      sheetsStatusBadge.className = "badge badge-disconnected";
    }
  }

  function estadoBadgeClass(estado) {
    const e = String(estado || "").toLowerCase();
    if (e.includes("cerrado") || e.includes("compromiso") || e.includes("enviado")) {
      return "badge-venc badge-vigente";
    }
    if (e.includes("sin respuesta")) {
      return "badge-venc badge-mora";
    }
    return "badge-venc badge-mora-mid";
  }

  function renderSeguimientosTable() {
    const q = searchSeguimiento.value.trim().toLowerCase();
    const filtered = state.seguimientos.filter((r) => {
      if (!q) return true;
      return (
        String(r.referidor || "").toLowerCase().includes(q) ||
        String(r.responsable || "").toLowerCase().includes(q) ||
        String(r.estado || "").toLowerCase().includes(q) ||
        String(r.observaciones || "").toLowerCase().includes(q)
      );
    });

    seguimientoTbody.innerHTML = "";
    if (filtered.length === 0) {
      seguimientoTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: var(--text-muted);">No hay registros de seguimiento para mostrar.</td></tr>`;
      return;
    }

    filtered.forEach((r) => {
      const tr = document.createElement("tr");
      const cliStr = r.cantidadClientes !== null && r.cantidadClientes !== "" ? fmtInt(r.cantidadClientes) : "—";
      const montoStr = r.pagoMinimoUsd !== null && r.pagoMinimoUsd !== "" ? fmtUSD(r.pagoMinimoUsd) : "—";
      tr.innerHTML = `
        <td style="white-space:nowrap;">${escapeHtml(r.fechaCreacion || "—")}</td>
        <td class="ref-name">${escapeHtml(r.referidor || "—")}</td>
        <td>${escapeHtml(r.responsable || "—")}</td>
        <td><span class="${estadoBadgeClass(r.estado)}">${escapeHtml(r.estado || "—")}</span></td>
        <td style="white-space:nowrap;">${escapeHtml(r.fechaRespuesta || "—")}</td>
        <td class="num">${cliStr}</td>
        <td class="num">${montoStr}</td>
        <td class="obs-cell">${escapeHtml(r.observaciones || "—")}</td>
      `;
      seguimientoTbody.appendChild(tr);
    });
  }

  async function loadSeguimientos() {
    seguimientoTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: var(--text-muted);">Cargando historial desde Google Sheets...</td></tr>`;
    try {
      const resp = await fetch("/api/seguimiento");
      const data = await resp.json();
      if (!resp.ok) {
        seguimientoTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: var(--text-muted);">${escapeHtml(
          data.detail || "No se pudo cargar el historial."
        )}</td></tr>`;
        return;
      }
      state.seguimientos = data.registros || [];
      state.seguimientosLoaded = true;
      renderSeguimientosTable();
    } catch {
      seguimientoTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: var(--text-muted);">Error de conexión al consultar Google Sheets.</td></tr>`;
    }
  }

  searchSeguimiento.addEventListener("input", renderSeguimientosTable);
  btnRefreshSeguimientos.addEventListener("click", loadSeguimientos);

  btnResetSegForm.addEventListener("click", () => {
    seguimientoForm.reset();
  });

  seguimientoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const payload = {
      referidor: segReferidor.value.trim(),
      responsable: segResponsable.value.trim(),
      estado: segEstado.value,
      fecha_respuesta: segFechaRespuesta.value || "",
      cantidad_clientes: segCantidadClientes.value !== "" ? parseInt(segCantidadClientes.value, 10) : null,
      pago_minimo_usd: segPagoMinimo.value !== "" ? parseFloat(segPagoMinimo.value) : null,
      observaciones: segObservaciones.value.trim(),
    };

    if (!payload.referidor || !payload.responsable) {
      showAlert("Referidor y Responsable son campos obligatorios.", "error");
      return;
    }

    btnSaveSeguimiento.disabled = true;
    segSpinner.classList.remove("hidden");

    try {
      const resp = await fetch("/api/seguimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || "No se pudo guardar en Google Sheets.");
      }

      showAlert(`Gestión de "${payload.referidor}" guardada en Google Sheets.`, "success");
      const savedResponsable = payload.responsable;
      seguimientoForm.reset();
      segResponsable.value = savedResponsable;

      if (data.registro) {
        state.seguimientos.unshift(data.registro);
        state.seguimientosLoaded = true;
        renderSeguimientosTable();
      } else {
        loadSeguimientos();
      }
    } catch (err) {
      showAlert(err.message || "Error al guardar el seguimiento.", "error");
    } finally {
      btnSaveSeguimiento.disabled = false;
      segSpinner.classList.add("hidden");
    }
  });

  // Initial boot: check if ephemeral data already exists & try fetching BCV rate
  (async function init() {
    checkSheetsConfig();
    try {
      const resp = await fetch("/api/status");
      const status = await resp.json();
      if (status.has_data) {
        inputTasa.value = status.tasa;
        const sumResp = await fetch("/api/summary");
        if (sumResp.ok) {
          const sumData = await sumResp.json();
          renderDashboard(sumData, true);
        }
      } else {
        fetchBcvRate(true);
      }
    } catch {
      // Ignore boot errors
    }
  })();
})();
