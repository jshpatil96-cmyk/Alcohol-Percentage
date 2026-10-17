/*
 * IMPORTANT: Replace SHEET_CSV_URL with the published CSV URL for your Google Sheet.
 * The sheet should have headers such as: Sr No, Brands, ALCOHOL %, Category
 * Category is optional. If omitted, users can still search all brands and filter by "Uncategorized".
 */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFNfgC7XhAgXzOzsKoBpUhcu3VxIr0lELAq8K7QuY2mzXORo0A8BaUWKXYZF7WuG1Rns0wt53ft7d5/pub?gid=0&single=true&output=csv";
const STORAGE_KEY = "wine-finder-brand-data-v1";
const META_KEY = "wine-finder-last-sync-v1";

const SAMPLE_BRANDS = [
  { name: "J'NOON INDIA RED WINE", alcohol: 13.5, category: "Red Wine" },
  { name: "Sette", alcohol: 13.5, category: "Red Wine" },
  { name: "MS Red", alcohol: 12.5, category: "Red Wine" },
  { name: "MS Rose", alcohol: 12.5, category: "Rosé" },
  { name: "MS Merlot", alcohol: 12.5, category: "Red Wine" },
  { name: "J'NOON INDIA WHITE WINE", alcohol: 13.5, category: "White Wine" },
  { name: "JCB NO 47 Sparkling", alcohol: 12, category: "Sparkling" },
  { name: "MS White", alcohol: 12.5, category: "White Wine" },
  { name: "GCB Sparkling", alcohol: 12, category: "Sparkling" }
];

const $ = (id) => document.getElementById(id);
const searchInput = $("searchInput");
const categorySelect = $("categorySelect");
const brandList = $("brandList");
const emptyState = $("emptyState");
const resultCount = $("resultCount");
const statusMessage = $("statusMessage");
const refreshButton = $("refreshButton");
const connectionBadge = $("connectionBadge");
const lastUpdated = $("lastUpdated");
let brands = readSavedBrands() || SAMPLE_BRANDS;
let syncTime = localStorage.getItem(META_KEY) || "";

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();
}

// Handles quoted CSV fields, including commas and escaped double quotes.
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("The sheet appears empty or has no data rows.");

  const headers = rows[0].map(normalizeHeader);
  const nameIndex = headers.findIndex(h => ["brands", "brand", "brand name", "name"].includes(h));
  const alcoholIndex = headers.findIndex(h => ["alcohol %", "alcohol", "alcohol percent", "alcohol percentage", "abv", "abv %"].includes(h));
  const categoryIndex = headers.findIndex(h => ["category", "type", "wine type", "product type"].includes(h));
  if (nameIndex < 0 || alcoholIndex < 0) {
    throw new Error('Could not find brand and alcohol columns. Use headers like "Brands" and "ALCOHOL %".');
  }

  const parsed = rows.slice(1).map(cells => {
    const name = (cells[nameIndex] || "").trim();
    const rawAlcohol = (cells[alcoholIndex] || "").trim().replace(/%/g, "").replace(/,/g, ".");
    const alcohol = Number.parseFloat(rawAlcohol);
    const category = categoryIndex >= 0 ? (cells[categoryIndex] || "").trim() : "";
    return { name, alcohol, category: category || "Uncategorized" };
  }).filter(item => item.name && Number.isFinite(item.alcohol) && item.alcohol >= 0 && item.alcohol <= 100);

  if (!parsed.length) throw new Error("No valid brand rows found. Check the brand names and alcohol percentages.");
  return parsed;
}

function readSavedBrands() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch { return null; }
}

function formatPercent(value) {
  const num = Number(value);
  return `${Number.isInteger(num) ? num.toFixed(2) : num.toFixed(2)}%`;
}

function safeText(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

function updateConnectionBadge() {
  connectionBadge.textContent = navigator.onLine ? "Online" : "Offline mode";
  connectionBadge.className = `status-pill ${navigator.onLine ? "online" : "offline"}`;
}

function updateCategoryOptions() {
  const current = categorySelect.value || "all";
  const categories = [...new Set(brands.map(b => b.category || "Uncategorized"))].sort((a, b) => a.localeCompare(b));
  categorySelect.innerHTML = '<option value="all">All categories</option>' + categories.map(c => `<option value="${safeText(c)}">${safeText(c)}</option>`).join("");
  categorySelect.value = categories.includes(current) ? current : "all";
}

function renderBrands() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const category = categorySelect.value;
  const filtered = brands.filter(brand => {
    const matchesQuery = brand.name.toLocaleLowerCase().includes(query);
    const matchesCategory = category === "all" || (brand.category || "Uncategorized") === category;
    return matchesQuery && matchesCategory;
  }).sort((a, b) => a.name.localeCompare(b.name));

  resultCount.textContent = String(filtered.length);
  brandList.innerHTML = filtered.map(brand => `
    <article class="brand-card">
      <div class="brand-symbol" aria-hidden="true">${safeText(initials(brand.name))}</div>
      <div class="brand-details"><h3 class="brand-name">${safeText(brand.name)}</h3><p class="brand-category">${safeText(brand.category || "Uncategorized")}</p></div>
      <div class="abv"><strong>${formatPercent(brand.alcohol)}</strong><span>ALCOHOL</span></div>
    </article>`).join("");
  emptyState.hidden = filtered.length > 0;
  brandList.hidden = filtered.length === 0;
}

function updateLastUpdated() {
  lastUpdated.textContent = syncTime ? `Last synced: ${new Date(syncTime).toLocaleString()}` : "Showing starter examples — connect your sheet to sync live data";
}

async function refreshData({ silent = false } = {}) {
  if (!navigator.onLine) {
    statusMessage.textContent = "You're offline. Showing the last saved data on this device.";
    updateConnectionBadge();
    return;
  }
  if (!SHEET_CSV_URL.startsWith("https://docs.google.com/")) {
    statusMessage.textContent = "Starter examples are loaded. Add your published Google Sheets CSV URL in app.js, then tap Refresh data.";
    return;
  }
  refreshButton.disabled = true;
  refreshButton.innerHTML = '<span aria-hidden="true">↻</span> Refreshing…';
  if (!silent) statusMessage.textContent = "Connecting to Google Sheets…";
  try {
    const url = new URL(SHEET_CSV_URL);
    url.searchParams.set("_refresh", String(Date.now()));
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    const csvText = await response.text();
    if (contentType.includes("text/html") || /<html[\s>]/i.test(csvText.slice(0, 500))) {
      throw new Error("Google returned a web page instead of CSV. Check that the sheet is published to the web as CSV.");
    }
    const parsed = parseCSV(csvText);
    brands = parsed;
    syncTime = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(brands));
      localStorage.setItem(META_KEY, syncTime);
    } catch {
      statusMessage.textContent = "Data refreshed, but this browser could not save the offline copy. Check device storage settings.";
    }
    updateCategoryOptions();
    renderBrands();
    updateLastUpdated();
    if (navigator.onLine) statusMessage.textContent = `Updated successfully from Google Sheets: ${brands.length} brands.`;
  } catch (error) {
    statusMessage.textContent = `Refresh failed: ${error.message} Showing saved data if available.`;
  } finally {
    refreshButton.disabled = false;
    refreshButton.innerHTML = '<span aria-hidden="true">↻</span> Refresh data';
    updateConnectionBadge();
  }
}

searchInput.addEventListener("input", renderBrands);
categorySelect.addEventListener("change", renderBrands);
refreshButton.addEventListener("click", () => refreshData());
window.addEventListener("online", () => { updateConnectionBadge(); statusMessage.textContent = "Connection restored. Tap Refresh data to get the latest sheet."; });
window.addEventListener("offline", () => { updateConnectionBadge(); statusMessage.textContent = "Offline: using the saved copy of your data."; });

updateConnectionBadge();
updateCategoryOptions();
renderBrands();
updateLastUpdated();
if (syncTime) statusMessage.textContent = "Loaded your last saved data. Refresh when online to check for updates.";
else statusMessage.textContent = "Starter examples are shown until you connect your Google Sheet.";
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
if (SHEET_CSV_URL.startsWith("https://docs.google.com/")) refreshData({ silent: true });
