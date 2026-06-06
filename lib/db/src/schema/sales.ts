import { pgTable, serial, integer, numeric, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  date: timestamp("date").defaultNow().notNull(),
}, (table) => [
  index("sales_customer_id_idx").on(table.customerId),
  index("sales_date_idx").on(table.date),
]);

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => salesTable.id).notNull(),
  productId: integer("product_id").references(() => productsTable.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
}, (table) => [
  index("sale_items_sale_id_idx").on(table.saleId),
  index("sale_items_product_id_idx").on(table.productId),
]);

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, date: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
