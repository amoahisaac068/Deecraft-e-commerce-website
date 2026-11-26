const products = [
  { id:1, name:'The Signature Tote', price:450, category:'Totes', stock:8, image:'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=85' },
  { id:2, name:'Mini Leather Crossbody', price:320, category:'Crossbody', stock:12, image:'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=85' },
  { id:3, name:'Classic Shoulder Bag', price:380, category:'Shoulder Bags', stock:6, image:'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=85' },
  { id:4, name:'Evening Clutch', price:280, category:'Clutches', stock:10, image:'https://images.unsplash.com/photo-1564222195116-8a74a96b2c7e?auto=format&fit=crop&w=800&q=85' },
  { id:5, name:'Structured Handbag', price:520, category:'Handbags', stock:5, image:'https://images.unsplash.com/photo-1585488434455-1e7b6b4b4b6e?auto=format&fit=crop&w=800&q=85' },
  { id:6, name:'Everyday Backpack', price:360, category:'Backpacks', stock:9, image:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85' }
];

const grid = document.querySelector('#productGrid');
const filter = document.querySelector('#categoryFilter');
const drawer = document.querySelector('#cartDrawer');
const overlay = document.querySelector('#overlay');
const cartItems = document.querySelector('#cartItems');
const cartCount = document.querySelector('#cartCount');
const cartTotal = document.querySelector('#cartTotal');
const toast = document.querySelector('#toast');

let cart = JSON.parse(localStorage.getItem('deecraftCart') || '[]');

const categories = [...new Set(products.map(product => product.category))];
categories.forEach(category => filter.add(new Option(category, category)));

function money(amount) {
  return `GHS ${amount.toFixed(2)}`;
}

function renderProducts(category = 'All') {
  const visible = category === 'All' ? products : products.filter(product => product.category === category);
  grid.innerHTML = visible.map(product => `
    <article class="product-card">
      <div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy"></div>
      <div class="product-info">
        <div><h3>${product.name}</h3><span class="category">${product.category}</span><br><strong>${money(product.price)}</strong></div>
        <button class="add-button" type="button" data-id="${product.id}">Add to cart</button>
      </div>
    </article>
  `).join('');
}

function saveCart() {
  localStorage.setItem('deecraftCart', JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = quantity;

  if (!cart.length) {
    cartItems.innerHTML = '<p>Your cart is empty.</p>';
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div><h3>${item.name}</h3><span>Qty: ${item.quantity}</span><br><strong>${money(item.price * item.quantity)}</strong></div>
        <button class="remove-button" type="button" data-remove="${item.id}" aria-label="Remove ${item.name}">Remove</button>
      </div>
    `).join('');
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = money(total);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function openCart() {
  drawer.classList.add('open');
  overlay.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeCart() {
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

grid.addEventListener('click', event => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  const product = products.find(item => item.id === Number(button.dataset.id));
  const existing = cart.find(item => item.id === product.id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  saveCart();
  showToast(`${product.name} added to cart`);
});

filter.addEventListener('change', event => renderProducts(event.target.value));
document.querySelector('#cartButton').addEventListener('click', openCart);
document.querySelector('#closeCart').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

cartItems.addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  cart = cart.filter(item => item.id !== Number(button.dataset.remove));
  saveCart();
});

document.querySelector('#checkoutButton').addEventListener('click', () => {
  if (!cart.length) return showToast('Your cart is empty');
  showToast('Checkout demo — connect a payment provider to go live');
});

renderProducts();
renderCart();
