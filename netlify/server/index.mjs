import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { orders } from '../../db/schema.ts';
import { products } from '../../public/catalog.js';

export const config = { path: '/api/payments/*' };

const currency = 'GHS';
const referenceFormat = /^deecraft-[a-f0-9-]{36}$/;
const catalog = new Map(products.map(product => [product.id, product]));

class CheckoutError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new CheckoutError(400, 'Request body is required.');

  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256_000) {
      await reader.cancel();
      throw new CheckoutError(413, 'Request is too large.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function parse(body) {
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new CheckoutError(400, 'Invalid request.');
  }
}

function validateOrder(input) {
  const email = typeof input?.email === 'string' ? input.email.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutError(400, 'Enter a valid email address.');
  }
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > catalog.size) {
    throw new CheckoutError(400, 'Check the items in your cart.');
  }

  const seen = new Set();
  const items = input.items.map(item => {
    const product = catalog.get(item?.id);
    const quantity = item?.quantity;
    if (!product || seen.has(product.id) || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
      throw new CheckoutError(400, 'Check your cart quantities and try again.');
    }
    seen.add(product.id);
    return { id: product.id, name: product.name, quantity, unitAmount: Math.round(product.price * 100) };
  });
  return { email, items, amount: items.reduce((total, item) => total + item.unitAmount * item.quantity, 0) };
}

async function paystack(secret, path, payload) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: payload ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json();
  if (!response.ok || result.status !== true || !result.data) {
    throw new CheckoutError(502, 'Paystack could not complete the request. Please try again.');
  }
  return result.data;
}

async function startCheckout(request, url, secret, mode) {
  if (request.headers.get('origin') !== url.origin || !request.headers.get('content-type')?.startsWith('application/json')) {
    throw new CheckoutError(403, 'Start checkout from the storefront.');
  }

  const order = validateOrder(parse(await readBody(request)));
  const reference = `deecraft-${randomUUID()}`;
  const callback = new URL('/', url);
  const canceled = new URL('/', url);
  canceled.searchParams.set('reference', reference);
  canceled.searchParams.set('checkout', 'canceled');

  await db.insert(orders).values({ ...order, reference, currency, mode });
  const transaction = await paystack(secret, '/transaction/initialize', {
    email: order.email,
    amount: order.amount,
    currency,
    reference,
    channels: ['card', 'mobile_money'],
    callback_url: callback.href,
    metadata: JSON.stringify({
      cancel_action: canceled.href,
      custom_fields: [{ display_name: 'Items', variable_name: 'items', value: order.items.map(item => `${item.quantity} × ${item.name}`).join(', ') }],
    }),
  });
  const checkout = new URL(transaction.authorization_url);
  if (transaction.reference !== reference || checkout.origin !== 'https://checkout.paystack.com') {
    throw new CheckoutError(502, 'Paystack returned an invalid checkout link.');
  }
  return json({ reference, checkoutUrl: checkout.href }, 201);
}

async function getOrder(reference, mode) {
  if (typeof reference !== 'string' || !referenceFormat.test(reference)) return;
  const [order] = await db.select().from(orders).where(and(eq(orders.reference, reference), eq(orders.mode, mode)));
  return order;
}

async function recordPayment(order, transaction) {
  if (transaction.reference !== order.reference || transaction.amount !== order.amount ||
      transaction.currency !== order.currency || transaction.domain !== order.mode) {
    throw new CheckoutError(502, 'Payment details did not match the order.');
  }
  if (transaction.status === 'success') {
    await db.update(orders).set({ paidAt: new Date() })
      .where(and(eq(orders.reference, order.reference), isNull(orders.paidAt)));
    return 'paid';
  }
  return ['failed', 'abandoned', 'reversed'].includes(transaction.status) ? 'unpaid' : 'pending';
}

async function verifyPayment(reference, secret, mode) {
  const order = await getOrder(reference, mode);
  if (!order) throw new CheckoutError(404, 'Payment reference not found.');
  if (order.paidAt) return json({ status: 'paid' });
  const transaction = await paystack(secret, `/transaction/verify/${order.reference}`);
  return json({ status: await recordPayment(order, transaction) });
}

async function webhook(request, secret, mode) {
  const signature = request.headers.get('x-paystack-signature') ?? '';
  if (!/^[a-f0-9]{128}$/i.test(signature)) return json({ error: 'Invalid signature.' }, 401);
  const raw = await readBody(request);
  const expected = createHmac('sha512', secret).update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return json({ error: 'Invalid signature.' }, 401);

  const event = parse(raw);
  if (event?.event === 'charge.success' && event.data?.status === 'success') {
    const order = await getOrder(event.data.reference, mode);
    if (order && !order.paidAt) await recordPayment(order, event.data);
  }
  return new Response(null, { status: 200 });
}

export default async function handlePayments(request, context) {
  const url = new URL(request.url);
  const routes = { '/api/payments/checkout': 'POST', '/api/payments/status': 'GET', '/api/payments/webhook': 'POST' };
  const method = routes[url.pathname];
  if (!method) return json({ error: 'Not found.' }, 404);
  if (request.method !== method) return new Response(null, { status: 405, headers: { Allow: method } });

  const mode = context?.deploy?.context === 'production' && context.deploy.published ? 'live' : 'test';
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret?.startsWith(`sk_${mode}_`)) return json({ error: 'Online payments are not available right now.' }, 503);

  try {
    if (url.pathname === '/api/payments/checkout') return await startCheckout(request, url, secret, mode);
    if (url.pathname === '/api/payments/webhook') return await webhook(request, secret, mode);
    return await verifyPayment(url.searchParams.get('reference'), secret, mode);
  } catch (error) {
    if (error instanceof CheckoutError) return json({ error: error.message }, error.status);
    console.error('Paystack checkout request failed:', url.pathname);
    return json({ error: 'Payment service is temporarily unavailable. Please try again.' }, 502);
  }
}
