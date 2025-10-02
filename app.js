
// SafeBite HACCP PWA
const $ = (sel) => document.querySelector(sel);

const DEFAULTS = {
  name: "Colombia Vida",
  address: "",
  staff: "",
  thresholds: { fridge: 4, freezer: -18, hot: 60, oilLow: 170, oilHigh: 180 },
};

const KEYS = {
  settings: "safebite_settings_v1",
  data: "safebite_data_v1",
};

if (typeof window !== "undefined") {
  window.APP_KEYS = KEYS;
}

// State
let settings = loadSettings();
let data = loadData();

let domReady = document.readyState !== "loading";

// Init UI
document.addEventListener("DOMContentLoaded", () => {
  domReady = true;

  renderSettingsUI();

  applyDefaultStaff(true);

  // Nav tabs
  document.querySelectorAll("nav button").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Defaults for datetimes
  setNow("#open-dt");
  setNow("#close-dt");
  setNow("#temp-dt");
  setNow("#clean-dt");
  setNow("#allerg-dt");
  setNow("#corr-dt");

  // Event listeners (save/reset)
  $("#set-save").addEventListener("click", saveSettings);
  $("#set-reset").addEventListener("click", resetAll);

  $("#open-save").addEventListener("click", saveOpening);
  $("#open-clear").addEventListener("click", () => clearForm(["#open-staff","#open-dt","#open-notes","#open-hands","#open-surfaces","#open-stock","#open-probe"]));

  $("#close-save").addEventListener("click", saveClosing);
  $("#close-clear").addEventListener("click", () => clearForm(["#close-staff","#close-dt","#close-notes","#close-chill","#close-clean","#close-trash","#close-pest"]));

  $("#temp-save").addEventListener("click", saveTemp);
  $("#temp-clear").addEventListener("click", () => clearForm(["#temp-staff","#temp-dt","#temp-location","#temp-value","#temp-notes"]));

  $("#clean-save").addEventListener("click", saveClean);
  $("#clean-clear").addEventListener("click", () => clearForm(["#clean-staff","#clean-dt","#clean-area","#clean-method","#clean-notes"]));

  $("#allerg-save").addEventListener("click", saveAllerg);
  $("#allerg-clear").addEventListener("click", () => clearForm(["#allerg-staff","#allerg-dt","#allerg-product","#allerg-action","#allerg-notes"]));

  $("#corr-save").addEventListener("click", saveCorr);
  $("#corr-clear").addEventListener("click", () => clearForm(["#corr-staff","#corr-dt","#corr-situation","#corr-action","#corr-result"]));

  // Export buttons
  $("#exp-open").addEventListener("click", () => downloadCSV("opening", data.opening));
  $("#exp-close").addEventListener("click", () => downloadCSV("closing", data.closing));
  $("#exp-temps").addEventListener("click", () => downloadCSV("temperatures", data.temperatures));
  $("#exp-clean").addEventListener("click", () => downloadCSV("cleaning", data.cleaning));
  $("#exp-allerg").addEventListener("click", () => downloadCSV("allergens", data.allergens));
  $("#exp-corr").addEventListener("click", () => downloadCSV("corrective", data.corrective));
  $("#exp-email").addEventListener("click", emailDayReport);
  $("#exp-print").addEventListener("click", printDayReport);

  // Initial renders
  renderTables();
  renderDashboard();
});

// Helpers
function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem(KEYS.settings) || "null");
    if (!s) return structuredClone(DEFAULTS);
    // merge defaults
    return { ...structuredClone(DEFAULTS), ...s, thresholds: { ...DEFAULTS.thresholds, ...(s.thresholds||{}) } };
  }catch(e){ return structuredClone(DEFAULTS); }
}
function saveSettings(){
  settings.name = $("#set-name").value.trim();
  settings.address = $("#set-address").value.trim();
  settings.staff = $("#set-staff").value.trim();
  settings.thresholds.fridge = parseFloat($("#set-fridge").value) || DEFAULTS.thresholds.fridge;
  settings.thresholds.freezer = parseFloat($("#set-freezer").value) || DEFAULTS.thresholds.freezer;
  settings.thresholds.hot = parseFloat($("#set-hot").value) || DEFAULTS.thresholds.hot;
  settings.thresholds.oilLow = parseFloat($("#set-oil-low").value) || DEFAULTS.thresholds.oilLow;
  settings.thresholds.oilHigh = parseFloat($("#set-oil-high").value) || DEFAULTS.thresholds.oilHigh;
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  renderSettingsUI();
  applyDefaultStaff();
  alert("Instellingen opgeslagen.");
}
function resetAll(){
  if (!confirm("Weet je zeker dat je ALLE gegevens en instellingen wilt wissen?")) return;
  localStorage.removeItem(KEYS.settings);
  localStorage.removeItem(KEYS.data);
  settings = structuredClone(DEFAULTS);
  data = defaultData();
  location.reload();
}
function defaultData(){
  return { opening:[], closing:[], temperatures:[], cleaning:[], allergens:[], corrective:[] };
}
function loadData(){
  try{
    const d = JSON.parse(localStorage.getItem(KEYS.data) || "null");
    if (!d) return defaultData();
    // ensure keys
    return { ...defaultData(), ...d };
  }catch(e){ return defaultData(); }
}
function persist(){
  localStorage.setItem(KEYS.data, JSON.stringify(data));
}
function setNow(sel){
  const el = $(sel);
  if (!el) return;
  const now = new Date();
  const tzoffset = now.getTimezoneOffset() * 60000;
  el.value = new Date(now - tzoffset).toISOString().slice(0,16);
}
function clearForm(ids){
  ids.forEach(id=>{
    const el = $(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });
}
function updateBusinessSub(){
  $("#businessSub").innerHTML = `${settings.name || "Bedrijf"} • <span id="todayLabel">${new Date().toLocaleDateString()}</span>`;
}

function renderSettingsUI(){
  const assignments = [
    ["#set-name", settings.name || ""],
    ["#set-address", settings.address || ""],
    ["#set-staff", settings.staff || ""],
    ["#set-fridge", settings.thresholds.fridge],
    ["#set-freezer", settings.thresholds.freezer],
    ["#set-hot", settings.thresholds.hot],
    ["#set-oil-low", settings.thresholds.oilLow],
    ["#set-oil-high", settings.thresholds.oilHigh],
  ];
  assignments.forEach(([selector, value]) => {
    const el = $(selector);
    if (el) el.value = value;
  });

  $("#th-fridge").textContent = settings.thresholds.fridge;
  $("#th-freezer").textContent = settings.thresholds.freezer;
  $("#th-hot").textContent = settings.thresholds.hot;
  $("#th-oil-low").textContent = settings.thresholds.oilLow;
  $("#th-oil-high").textContent = settings.thresholds.oilHigh;

  updateBusinessSub();
}

function applyDefaultStaff(force = false){
  if (!settings.staff) return;
  ["#open-staff","#close-staff","#temp-staff","#clean-staff","#allerg-staff","#corr-staff"].forEach(id=>{
    const el = $(id);
    if (!el) return;
    if (force || !el.value) el.value = settings.staff;
  });
}

let detachAuthListener = null;

async function handleAuthSync(payload){
  const session = payload?.session;
  if (!session?.user || !window.auth?.syncProfile) return;
  try {
    await window.auth.syncProfile(settings);
    settings = loadSettings();
    if (domReady) {
      renderSettingsUI();
      applyDefaultStaff();
      renderDashboard();
    }
  }catch(err){
    console.error("Failed to sync Supabase profile", err);
  }
}

function initAuthIntegration(){
  if (!window.auth?.events || typeof window.auth.syncProfile !== "function") return;
  if (detachAuthListener) return;
  detachAuthListener = window.auth.events.on("change", handleAuthSync);
  window.auth.getSession()
    .then(session => {
      if (session?.user) handleAuthSync({ event: "init", session });
    })
    .catch(err => console.error("Unable to fetch initial auth session", err));
}

if (typeof window !== "undefined") {
  if (window.auth?.events) {
    initAuthIntegration();
  } else {
    window.addEventListener("supabase-auth-ready", () => initAuthIntegration(), { once: true });
  }
}

// Save handlers
function saveOpening(){
  const entry = {
    dt: $("#open-dt").value,
    staff: $("#open-staff").value.trim(),
    hands: $("#open-hands").checked,
    surfaces: $("#open-surfaces").checked,
    stock: $("#open-stock").checked,
    probe: $("#open-probe").checked,
    notes: $("#open-notes").value.trim()
  };
  data.opening.push(entry);
  persist();
  renderOpen();
  renderDashboard();
  alert("Openingscheck opgeslagen.");
}
function saveClosing(){
  const entry = {
    dt: $("#close-dt").value,
    staff: $("#close-staff").value.trim(),
    chill: $("#close-chill").checked,
    clean: $("#close-clean").checked,
    trash: $("#close-trash").checked,
    pest: $("#close-pest").checked,
    notes: $("#close-notes").value.trim()
  };
  data.closing.push(entry);
  persist();
  renderClose();
  renderDashboard();
  alert("Sluitingscheck opgeslagen.");
}
function saveTemp(){
  const entry = {
    dt: $("#temp-dt").value,
    staff: $("#temp-staff").value.trim(),
    location: $("#temp-location").value,
    value: parseFloat($("#temp-value").value),
    notes: $("#temp-notes").value.trim()
  };
  entry.pass = evaluateTemp(entry);
  data.temperatures.push(entry);
  persist();
  renderTemps();
  renderDashboard();
  alert("Temperatuur opgeslagen.");
}
function saveClean(){
  const entry = {
    dt: $("#clean-dt").value,
    staff: $("#clean-staff").value.trim(),
    area: $("#clean-area").value,
    method: $("#clean-method").value.trim(),
    notes: $("#clean-notes").value.trim()
  };
  data.cleaning.push(entry);
  persist();
  renderClean();
  renderDashboard();
  alert("Schoonmaak opgeslagen.");
}
function saveAllerg(){
  const entry = {
    dt: $("#allerg-dt").value,
    staff: $("#allerg-staff").value.trim(),
    product: $("#allerg-product").value.trim(),
    action: $("#allerg-action").value,
    notes: $("#allerg-notes").value.trim()
  };
  data.allergens.push(entry);
  persist();
  renderAllerg();
  renderDashboard();
  alert("Allergenen‑actie opgeslagen.");
}
function saveCorr(){
  const entry = {
    dt: $("#corr-dt").value,
    staff: $("#corr-staff").value.trim(),
    situation: $("#corr-situation").value.trim(),
    action: $("#corr-action").value.trim(),
    result: $("#corr-result").value.trim()
  };
  data.corrective.push(entry);
  persist();
  renderCorr();
  renderDashboard();
  alert("Correctieve actie opgeslagen.");
}

// Renderers
function renderTables(){
  renderOpen(); renderClose(); renderTemps(); renderClean(); renderAllerg(); renderCorr();
}
function renderOpen(){
  const el = $("#open-table");
  el.innerHTML = tableHeader(["Datum/tijd","Medewerker","Handen","Oppervl.","Voorraad","Probe","Notitie"]) + 
    data.opening.map(e => tr([
      fmtDT(e.dt),e.staff, badge(e.hands), badge(e.surfaces), badge(e.stock), badge(e.probe), escape(e.notes)
    ])).join("");
}
function renderClose(){
  const el = $("#close-table");
  el.innerHTML = tableHeader(["Datum/tijd","Medewerker","Koelen","Schoon","Afval","Plaagvrij","Notitie"]) + 
    data.closing.map(e => tr([
      fmtDT(e.dt),e.staff, badge(e.chill), badge(e.clean), badge(e.trash), badge(e.pest), escape(e.notes)
    ])).join("");
}
function renderTemps(){
  const el = $("#temp-table");
  el.innerHTML = tableHeader(["Datum/tijd","Medewerker","Locatie","°C","Status","Notitie"]) + 
    data.temperatures.map(e => tr([
      fmtDT(e.dt),e.staff,e.location, (isFinite(e.value)? e.value.toFixed(1):""), statusBadge(e.pass), escape(e.notes)
    ])).join("");
}
function renderClean(){
  const el = $("#clean-table");
  el.innerHTML = tableHeader(["Datum/tijd","Medewerker","Zone","Methode","Notitie"]) + 
    data.cleaning.map(e => tr([
      fmtDT(e.dt),e.staff,e.area,escape(e.method),escape(e.notes)
    ])).join("");
}
function renderAllerg(){
  const el = $("#allerg-table");
  el.innerHTML = tableHeader(["Datum/tijd","Medewerker","Product/batch","Actie","Notitie"]) + 
    data.allergens.map(e => tr([
      fmtDT(e.dt),e.staff,escape(e.product),e.action,escape(e.notes)
    ])).join("");
}
function renderCorr(){
  const el = $("#corr-table");
  el.innerHTML = tableHeader(["Datum/tijd","Medewerker","Situatie","Actie","Resultaat"]) + 
    data.corrective.map(e => tr([
      fmtDT(e.dt),e.staff,escape(e.situation),escape(e.action),escape(e.result)
    ])).join("");
}
function renderDashboard(){
  // Opening: last record today?
  const todayStr = new Date().toISOString().slice(0,10);
  const openToday = data.opening.filter(e => (e.dt||"").slice(0,10) === todayStr);
  $("#dash-open").innerHTML = openToday.length
    ? `<span class="badge ok">✔ ${openToday.length} ingevuld</span>`
    : `<span class="badge fail">✖ niets ingevuld</span>`;

  // Temps
  const tempsToday = data.temperatures.filter(e => (e.dt||"").slice(0,10) === todayStr);
  const fails = tempsToday.filter(e => e.pass===false).length;
  $("#dash-temps").innerHTML = tempsToday.length
    ? (fails>0 ? `<span class="badge fail">${fails} buiten drempel</span>` : `<span class="badge ok">✔ alles binnen drempel</span>`)
    : `<span class="badge fail">✖ niets ingevuld</span>`;

  // Cleaning
  const cleanToday = data.cleaning.filter(e => (e.dt||"").slice(0,10) === todayStr);
  $("#dash-clean").innerHTML = cleanToday.length
    ? `<span class="badge ok">✔ ${cleanToday.length} taken</span>`
    : `<span class="badge fail">✖ niets ingevuld</span>`;
}

// Utilities
function tableHeader(cols){ return `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>`; }
function tr(cols){ return `<tr>${cols.map(c=>`<td>${c}</td>`).join("")}</tr>`; }
function badge(v){ return `<span class="badge ${v?'ok':'fail'}">${v?'OK':'Niet OK'}</span>`; }
function statusBadge(pass){ 
  if (pass === true) return `<span class="badge ok">Binnen drempel</span>`;
  if (pass === false) return `<span class="badge fail">Buiten drempel</span>`;
  return `<span class="badge">n.v.t.</span>`;
}
function fmtDT(dt){
  try{
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleString();
  }catch(e){ return dt || ""; }
}
function escape(s){ return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function evaluateTemp(entry){
  const t = settings.thresholds;
  if (!isFinite(entry.value)) return null;
  const v = entry.value;
  const loc = entry.location.toLowerCase();
  if (loc.includes("koelkast")) return v <= t.fridge;
  if (loc.includes("vriezer")) return v <= t.freezer;
  if (loc.includes("warme")) return v >= t.hot;
  if (loc.includes("bakolie")) return v >= t.oilLow && v <= t.oilHigh;
  return null;
}

// CSV Export
function downloadCSV(name, rows){
  if (!rows || rows.length===0) { alert("Geen data om te exporteren."); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(rows.map(r => headers.map(h => csvEscape(r[h])).join(",")))
    .join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `safebite_${name}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function csvEscape(v){
  if (v===undefined || v===null) return "";
  let s = String(v).replace(/"/g,'""');
  if (/[",\n]/.test(s)) s = `"${s}"`;
  return s;
}

// Day report helpers
function getTodaySections(){
  const todayKey = new Date().toISOString().slice(0,10);
  return {
    dateKey: todayKey,
    sections: [
      ["Openingscheck", data.opening.filter(e => (e.dt||"").slice(0,10)===todayKey)],
      ["Temperaturen", data.temperatures.filter(e => (e.dt||"").slice(0,10)===todayKey)],
      ["Schoonmaak", data.cleaning.filter(e => (e.dt||"").slice(0,10)===todayKey)],
      ["Allergenen", data.allergens.filter(e => (e.dt||"").slice(0,10)===todayKey)],
      ["Correctieve acties", data.corrective.filter(e => (e.dt||"").slice(0,10)===todayKey)],
      ["Sluitingscheck", data.closing.filter(e => (e.dt||"").slice(0,10)===todayKey)]
    ]
  };
}

function formatSummaryValue(value){
  if (typeof value === "boolean") return value ? "ja" : "nee";
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function buildDaySummary(sections){
  const lines = [];
  lines.push(`Dagrapport – ${settings.name || "Bedrijf"} – ${new Date().toLocaleDateString()}`);
  if (settings.address) lines.push(`Adres: ${settings.address}`);
  lines.push(`Drempels: Koel ≤${settings.thresholds.fridge}°C | Vries ≤${settings.thresholds.freezer}°C | Warm ≥${settings.thresholds.hot}°C | Olie ${settings.thresholds.oilLow}–${settings.thresholds.oilHigh}°C`);
  lines.push("");

  for (const [title, rows] of sections){
    lines.push(title);
    if (!rows.length){
      lines.push("- Geen gegevens");
    } else {
      rows.forEach(row => {
        const parts = Object.entries(row)
          .map(([key, val]) => `${key}: ${formatSummaryValue(val)}`)
          .filter(Boolean);
        lines.push(`- ${parts.join("; ")}`);
      });
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

async function emailDayReport(){
  const { sections } = getTodaySections();
  const summary = buildDaySummary(sections);
  const file = new File([summary], "safebite_dagrapport.txt", { type: "text/plain" });

  const canShareFiles = typeof navigator?.canShare === "function" && navigator.canShare({ files: [file] });
  if (navigator?.share && canShareFiles){
    try {
      await navigator.share({
        title: "Dagrapport",
        text: summary,
        files: [file]
      });
      return;
    } catch (err) {
      console.warn("Delen van dagrapport mislukt, val terug op e-mail.", err);
    }
  }

  alert("Navigator.share niet beschikbaar of ondersteunt geen bestanden; we openen een e-mail zonder bijlage (bijlagen niet ondersteund).");
  const mailto = `mailto:?subject=Dagrapport&body=${encodeURIComponent(summary)}`;
  window.location.href = mailto;
}

// Print day report
function printDayReport(){
  const { sections } = getTodaySections();
  const win = window.open("", "_blank");
  const style = `
    <style>
      body{font-family:system-ui,Segoe UI,Roboto;font-size:12px;color:#111}
      h1{font-size:18px;margin:0 0 6px 0}
      h2{font-size:14px;margin:12px 0 6px 0;border-bottom:1px solid #000}
      table{width:100%;border-collapse:collapse;margin:6px 0}
      th,td{border:1px solid #000;padding:4px;font-size:11px;text-align:left}
      .small{font-size:10px;color:#555}
    </style>
  `;
  const head = `
    <h1>Dagrapport – ${settings.name || "Bedrijf"} – ${new Date().toLocaleDateString()}</h1>
    <div class="small">${settings.address || ""}</div>
    <div class="small">Drempels: Koel ≤${settings.thresholds.fridge}°C | Vries ≤${settings.thresholds.freezer}°C | Warm ≥${settings.thresholds.hot}°C | Olie ${settings.thresholds.oilLow}–${settings.thresholds.oilHigh}°C</div>
  `;
  let body = "";
  for (const [title, rows] of sections){
    body += `<h2>${title}</h2>`;
    if (!rows.length){ body += `<div class="small">Geen gegevens</div>`; continue; }
    const headers = Object.keys(rows[0]);
    body += `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>`;
    for (const r of rows){
      body += `<tr>${headers.map(h=>`<td>${escape(String(r[h]??""))}</td>`).join("")}</tr>`;
    }
    body += `</tbody></table>`;
  }
  win.document.write(`<html><head><title>Dagrapport</title>${style}</head><body>${head}${body}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

// Tabs
function switchTab(tab){
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.tab===tab));
  document.querySelectorAll("section[id^='tab-']").forEach(s => s.style.display = "none");
  const sec = document.getElementById(`tab-${tab}`);
  if (sec) sec.style.display = "block";
  window.scrollTo({top:0,behavior:"smooth"});
}

// ---- END ----
