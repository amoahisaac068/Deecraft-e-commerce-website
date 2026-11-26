import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  reference: text().primaryKey(),
  email: text().notNull(),
  items: jsonb().$type<{ id: number; name: string; quantity: number; unitAmount: number }[]>().notNull(),
  amount: integer().notNull(),
  currency: text().notNull(),
  mode: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
});
