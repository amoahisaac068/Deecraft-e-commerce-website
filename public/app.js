import { products } from './catalog.js';

const grid = document.querySelector('#productGrid');
const filter = document.querySelector('#categoryFilter');
const drawer = document.querySelector('#cartDrawer');
const overlay = document.querySelector('#overlay');
const cartItems = document.querySelector('#cartItems');
const cartCount = document.querySelector('#cartCount');
const cartTotal = document.querySelector('#cartTotal');
const toast = document.querySelector('#toast');
const checkoutForm = document.querySelector('#checkoutForm');
const checkoutButton = document.querySelector('#checkoutButton');
const paymentStatus = document.querySelector('#paymentStatus');
const checkPayment = document.querySelector('#checkPayment');
const returnUrl = new URL(location.href);
const reference = returnUrl.searchParams.get('reference') || returnUrl.searchParams.get('trxref');
const canceled = returnUrl.searchParams.get('checkout') === 'canceled';
let awaitingPayment = Boolean(reference);

function readStored(storage, key) {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
}

const storedCart = readStored(localStorage, 'deecraftCart');
let cart = products.flatMap(product => {
  const item = Array.isArray(storedCart) && storedCart.find(item => item?.id === product.id);
  return Number.isInteger(item?.quantity) && item.quantity > 0
    ? [{ ...product, quantity: Math.min(item.quantity, product.stock) }]
    : [];
});

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
  checkoutForm.hidden = !cart.length || awaitingPayment;
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
  if (existing?.quantity >= product.stock) return showToast('Maximum quantity reached for this item');
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

function showPaymentStatus(message) {
  paymentStatus.textContent = message;
  paymentStatus.hidden = false;
}

function resetCheckoutButton() {
  checkoutButton.disabled = false;
  checkoutButton.textContent = 'Pay with Paystack';
}

checkoutForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!cart.length || checkoutButton.disabled || awaitingPayment) return;

  const items = cart.map(({ id, quantity }) => ({ id, quantity }));
  const email = new FormData(checkoutForm).get('email');
  checkoutButton.disabled = true;
  checkoutButton.textContent = 'Opening Paystack…';
  paymentStatus.hidden = true;
  try {
    const response = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, items }),
    });
    const result = await response.json();
    if (!response.ok) {
      showPaymentStatus(result.error || 'Checkout is unavailable. Please try again.');
      resetCheckoutButton();
      return;
    }
    const checkout = new URL(result.checkoutUrl);
    if (checkout.origin !== 'https://checkout.paystack.com') throw new Error('Invalid checkout link');
    sessionStorage.setItem('deecraftCheckout', JSON.stringify({ reference: result.reference, items }));
    location.assign(checkout.href);
  } catch {
    showPaymentStatus('Could not open checkout. Please try again.');
    resetCheckoutButton();
  }
});

function finishPayment(status) {
  const checkout = readStored(sessionStorage, 'deecraftCheckout');
  if (checkout?.reference === reference) {
    if (status === 'paid') {
      cart = cart.map(item => ({
        ...item, quantity: item.quantity - (checkout.items.find(purchased => purchased.id === item.id)?.quantity || 0),
      })).filter(item => item.quantity > 0);
    }
    sessionStorage.removeItem('deecraftCheckout');
  }
  awaitingPayment = false;
  checkPayment.hidden = true;
  for (const key of ['reference', 'trxref', 'checkout']) returnUrl.searchParams.delete(key);
  history.replaceState(null, '', returnUrl);
  saveCart();
}

async function refreshPayment() {
  checkPayment.disabled = true;
  showPaymentStatus('Checking payment with Paystack…');
  try {
    const response = await fetch(`/api/payments/status?reference=${encodeURIComponent(reference)}`);
    const result = await response.json();
    if (response.status === 404) {
      showPaymentStatus('That payment reference could not be found.');
      finishPayment('unpaid');
    } else if (!response.ok) {
      throw new Error('Verification unavailable');
    } else if (result.status === 'paid') {
      showPaymentStatus(`Payment confirmed. Keep your order reference: ${reference}`);
      finishPayment('paid');
    } else if (result.status === 'unpaid' || canceled && result.status === 'pending') {
      showPaymentStatus(result.status === 'unpaid' ? 'Payment was not completed. Your cart is ready if you want to retry.'
        : 'Checkout was closed and no payment was confirmed. Check your Mobile Money or bank activity before retrying.');
      finishPayment('unpaid');
    } else {
      showPaymentStatus('Payment is pending. Check again before trying another payment.');
      checkPayment.hidden = false;
    }
  } catch {
    showPaymentStatus('Payment could not be confirmed yet. Check again before retrying checkout.');
    checkPayment.hidden = false;
  } finally {
    checkPayment.disabled = false;
  }
}

window.addEventListener('pageshow', resetCheckoutButton);
checkPayment.addEventListener('click', refreshPayment);
renderProducts();
renderCart();
if (reference) {
  openCart();
  refreshPayment();
  paymentStatus.focus();
}
