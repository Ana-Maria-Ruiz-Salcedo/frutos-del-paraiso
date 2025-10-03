/* script.js - versión mejorada con cantidad y mensaje añadido */
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5ZpG2UqL8h_RZMxz44H_OaNZ38W-l9RCB_iqpb0bNOU42yHprW0i8A4g2c3mYZSoQJNd_0IxScpWC/pub?output=csv";
const WHATSAPP_NUMBER = '573005970933'; // sin + ni espacios

let cart = [];
let total = 0;

document.addEventListener("DOMContentLoaded", () => {
  // Solo cargar productos si existe el contenedor
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
    renderProducts(products);
  } catch (err) {
    console.error(err);
    const container = document.querySelector('.productos-container');
    if (container) container.innerHTML = `<p>Error al cargar productos. Revisa que la hoja esté publicada. (${err.message})</p>`;
  }
}

/* Convierte CSV en array de objetos */
function csvToObjects(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
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
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } 
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur); cur = '';
    } else cur += ch;
  }
  res.push(cur);
  return res;
}

/* Render de productos en la página */
function renderProducts(products) {
  const container = document.querySelector('.productos-container');
  if (!container) return;
  container.innerHTML = '';

  products.forEach((p, index) => {
    if (!p.name) return;
    const available = (p.available || '').trim().toLowerCase();
    if (available !== 'yes') return;

    const imgSrc = p.image_url ? p.image_url : 'img/fondo-yogurt.jpg';
    const price = p.price ? parseFloat(p.price) : 0;
    const priceText = price ? `$${price}` : '';
    const desc = p.description || '';

    // Si el producto ya está en el carrito, mostrar la cantidad guardada
    let savedQty = 1;
    const existing = cart.find(item => item.name === p.name);
    if (existing) savedQty = existing.qty;

    const html = `
      <div class="producto">
        <img src="${imgSrc}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null; this.src='img/fondo-yogurt.jpg';">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(desc)}</p>
        <span>${escapeHtml(priceText)}</span>
        <div style="margin-top:10px;">
          <button onclick="changeQty('qty-${index}', -1)">➖</button>
          <input type="number" id="qty-${index}" value="${savedQty}" min="1" style="width:50px; text-align:center;">
          <button onclick="changeQty('qty-${index}', 1)">➕</button>
          <button onclick="addToCart('${escapeHtml(p.name)}', ${price}, 'qty-${index}')">🛒 Añadir</button>
        </div>
        <div id="msg-${index}" style="margin-top:5px; color:green; font-weight:bold;"></div>
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

/* ------------------ CARRITO ------------------ */

// Cambiar cantidad en input
function changeQty(qtyId, delta) {
  const input = document.getElementById(qtyId);
  let val = parseInt(input.value) || 1;
  val += delta;
  if (val < 1) val = 1;
  input.value = val;
}

// Añadir producto al carrito
function addToCart(name, price, qtyId) {
  const qty = parseInt(document.getElementById(qtyId).value) || 1;
  const existing = cart.find(item => item.name === name);
  if (existing) existing.qty += qty;
  else cart.push({ name, price, qty });

  total += price * qty;
  updateCart();
  saveCartToStorage();

  // Mostrar mensaje temporal
  const index = qtyId.split('-')[1];
  const msgDiv = document.getElementById(`msg-${index}`);
  msgDiv.textContent = `✅ ${name} (${qty} und) añadido al carrito`;
  setTimeout(() => { msgDiv.textContent = ''; }, 2000);
}

// Eliminar producto del carrito
function removeFromCart(index) {
  total -= cart[index].price * cart[index].qty;
  cart.splice(index, 1);
  updateCart();
  saveCartToStorage();
}

// Actualizar vista del carrito
function updateCart() {
  const cartList = document.getElementById("cart-list");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");

  if (cartList) {
    cartList.innerHTML = "";
    cart.forEach((item, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${item.name} (x${item.qty}) - $${item.price * item.qty} 
        <button style="margin-left:10px; background:red; color:white; border:none; padding:3px 6px; border-radius:5px; cursor:pointer;" 
          onclick="removeFromCart(${i})">❌ Quitar</button>
      `;
      cartList.appendChild(li);
    });
  }

  if (cartCount) cartCount.textContent = cart.length;
  if (cartTotal) cartTotal.textContent = `Total: $${total}`;
}

// Guardar y cargar carrito en localStorage
function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const stored = localStorage.getItem('cart');
  if (stored) {
    cart = JSON.parse(stored);
    total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  } else {
    cart = [];
    total = 0;
  }
}

// Finalizar pedido
function checkout() {
  if (!cart.length) return alert("Tu carrito está vacío");

  const pedido = cart.map(p => `${p.name} x${p.qty} - $${p.price * p.qty}`).join("\n");
  const mensaje = encodeURIComponent(`Hola, quiero hacer este pedido:\n${pedido}\n\nTotal: $${total}`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`, "_blank");

  // Limpiar carrito después de enviar el pedido
  cart = [];
  total = 0;
  updateCart();
  localStorage.removeItem('cart');

  // Reiniciar cantidades visibles en productos
  document.querySelectorAll('.producto input[type=number]').forEach(input => input.value = 1);
}
