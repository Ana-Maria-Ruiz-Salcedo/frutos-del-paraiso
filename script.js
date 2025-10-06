/* script.js - carrito con miniaturas de productos */
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5ZpG2UqL8h_RZMxz44H_OaNZ38W-l9RCB_iqpb0bNOU42yHprW0i8A4g2c3mYZSoQJNd_0IxScpWC/pub?output=csv";
const WHATSAPP_NUMBER = '573005970933'; // sin + ni espacios

let cart = [];
let total = 0;
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("productos-container")) loadProductsFromSheet();
  loadCartFromStorage();
  updateCart();
});

/* Cargar CSV y convertir a objetos */
async function loadProductsFromSheet() {
  try {
    const url = CSV_URL + `&nocache=${new Date().getTime()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo descargar la hoja: ' + res.status);
    const csv = await res.text();
    const products = csvToObjects(csv);
    allProducts = products;
    renderProducts(products);
  } catch (err) {
    console.error(err);
    const container = document.querySelector('.productos-container');
    if (container) container.innerHTML = `<p>Error al cargar productos. (${err.message})</p>`;
  }
}

/* CSV → objetos */
function csvToObjects(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const headers = parseCsvLine(lines.shift()).map(h => h.trim());
  return lines.map(line => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '');
    return obj;
  });
}

function parseCsvLine(line) {
  const res = [];
  let cur = '', inQuotes = false;
  for (let ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { res.push(cur); cur = ''; }
    else cur += ch;
  }
  res.push(cur);
  return res;
}

/* Render de productos */
function renderProducts(products) {
  const container = document.querySelector('.productos-container');
  if (!container) return;
  container.innerHTML = '';

  products.forEach((p) => {
    if (!p.name || (p.available || '').trim().toLowerCase() !== 'yes') return;
    const imgSrc = p.image_url || 'img/fondo-yogurt.jpg';
    const price = parseFloat(p.price) || 0;
    const priceText = price ? `$${price}` : '';
    const desc = p.description || '';
    
    const html = `
      <div class="producto">
        <img src="${imgSrc}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null; this.src='img/fondo-yogurt.jpg';">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(desc)}</p>
        <span>${escapeHtml(priceText)}</span>
        <div style="margin-top:10px;">
          <button onclick="addToCart('${escapeHtml(p.name)}', ${price})">🛒 Añadir</button>
        </div>
        <div id="msg-${p.name.replace(/\s+/g, '_')}" style="margin-top:5px; color:green; font-weight:bold;"></div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  });
}

/* Evitar inyección */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* -------- CARRITO -------- */
function addToCart(name, price, qty = 1) {
  const product = allProducts.find(p => p.name === name);
  const image = product && product.image_url ? product.image_url : 'img/fondo-yogurt.jpg';

  const existing = cart.find(item => item.name === name);
  let totalQty;
  if (existing) {
    existing.qty += qty;
    totalQty = existing.qty;
  } else {
    cart.push({ name, price, qty, image });
    totalQty = qty;
  }

  total += price * qty;
  updateCart();
  saveCartToStorage();

  const msgDiv = document.getElementById(`msg-${name.replace(/\s+/g, '_')}`);
  if (msgDiv) {
    msgDiv.textContent = `✅ ${name} añadido al carrito (x${totalQty})`;
    setTimeout(() => (msgDiv.textContent = ''), 2000);
  }
}

function removeFromCart(index) {
  total -= cart[index].price * cart[index].qty;
  cart.splice(index, 1);
  updateCart();
  saveCartToStorage();
}

function changeCartQty(index, delta) {
  const item = cart[index];
  item.qty += delta;
  if (item.qty < 1) item.qty = 1;
  total = cart.reduce((sum, p) => sum + p.price * p.qty, 0);
  updateCart();
  saveCartToStorage();
}

/* Actualizar carrito */
function updateCart() {
  const cartList = document.getElementById("cart-list");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");

  if (cartList) {
    cartList.innerHTML = "";
    cart.forEach((item, i) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.gap = "10px";
      li.style.marginBottom = "10px";

      li.innerHTML = `
        <img src="${item.image}" alt="${item.name}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
        <div style="flex:1;">
          <strong>${item.name}</strong><br>
          <div style="margin:5px 0;">
            <button onclick="changeCartQty(${i}, -1)">➖</button>
            <span style="margin:0 8px;">${item.qty}</span>
            <button onclick="changeCartQty(${i}, 1)">➕</button>
          </div>
        </div>
        <span style="min-width:70px;">$${item.price * item.qty}</span>
        <button style="background:red; color:white; border:none; padding:3px 6px; border-radius:5px; cursor:pointer;"
          onclick="removeFromCart(${i})">❌</button>
      `;
      cartList.appendChild(li);
    });
  }

  if (cartCount) cartCount.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
  if (cartTotal) cartTotal.textContent = `Total: $${total}`;
  updateFloatingCartCount();
}

/* Guardar y cargar carrito */
function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const stored = localStorage.getItem('cart');
  if (stored) {
    cart = JSON.parse(stored);
    total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }
}

/* Checkout */
function checkout() {
  if (!cart.length) return alert("Tu carrito está vacío");

  const pedido = cart.map(p => `${p.name} x${p.qty} - $${p.price * p.qty}`).join("\n");
  const mensaje = encodeURIComponent(`Hola, quiero hacer este pedido:\n${pedido}\n\nTotal: $${total}`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`, "_blank");
}

/* Botón flotante */
function updateFloatingCartCount() {
  const floatCount = document.getElementById("cart-float-count");
  if (floatCount) floatCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}
