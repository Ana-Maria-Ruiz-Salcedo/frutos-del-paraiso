/* script.js - cargar productos desde Google Sheets (CSV) y mostrarlos */
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5ZpG2UqL8h_RZMxz44H_OaNZ38W-l9RCB_iqpb0bNOU42yHprW0i8A4g2c3mYZSoQJNd_0IxScpWC/pub?output=csv";
const WHATSAPP_NUMBER = '573005970933'; // sin + ni espacios

document.addEventListener("DOMContentLoaded", () => {
  loadProductsFromSheet();
});

/* Cargar CSV y convertir a objetos */
async function loadProductsFromSheet() {
  try {
    const url = CSV_URL + `&nocache=${new Date().getTime()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo descargar la hoja: ' + res.status);
    const csv = await res.text();
    const products = csvToObjects(csv);
    renderProducts(products);
  } catch (err) {
    console.error(err);
    const container = document.querySelector('.productos-container');
    if (container) container.innerHTML = `<p>Error al cargar productos. Revisa que la hoja esté publicada. (${err.message})</p>`;
  }
}

/* Convierte CSV en array de objetos (header -> claves) */
function csvToObjects(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines.shift()).map(h => h.trim());
  return lines.map(line => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '';
    });
    return obj;
  });
}

/* Parser simple para una línea CSV */
function parseCsvLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } 
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

/* Render de productos en la página */
function renderProducts(products) {
  const container = document.querySelector('.productos-container');
  if (!container) return;
  container.innerHTML = '';

  products.forEach(p => {
    if (!p.name) return;

    // Filtrar productos no disponibles
    const available = (p.available || '').trim().toLowerCase();
    if (available !== 'yes') return;

    // Imagen principal o fallback si no hay
    const imgSrc = (p.image_url && p.image_url !== '') ? p.image_url : 'img/fondo-yogurt.jpg';
    const priceText = p.price ? `$${p.price}` : '';
    const desc = p.description || '';
    const whatsappMsg = encodeURIComponent(`Hola, vengo de la página Frutos del Paraíso y quiero información del producto: ${p.name}`);
    const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`;

    // HTML del producto con manejo de error en la imagen
    const html = `
      <div class="producto">
        <img src="${imgSrc}" alt="${escapeHtml(p.name)}"
             onerror="this.onerror=null; this.src='img/fondo-yogurt.jpg';">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(desc)}</p>
        <span>${escapeHtml(priceText)}</span>
        <div style="margin-top:10px;">
          <a class="btn-whatsapp" target="_blank" href="${waHref}">📲 Consultar por WhatsApp</a>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  });
}

/* Evitar inyección */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
