import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, productsTable, customersTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

router.get("/sales", async (req, res) => {
  try {
    const { startDate, endDate, customerId } = req.query;

    const conditions = [];
    if (startDate) conditions.push(gte(salesTable.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(salesTable.date, new Date(endDate as string)));
    if (customerId) conditions.push(eq(salesTable.customerId, parseInt(customerId as string)));

    const sales = await db
      .select()
      .from(salesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(salesTable.date);

    const result = await Promise.all(
      sales.map(async (sale) => {
        const items = await db
          .select({
            id: saleItemsTable.id,
            productId: saleItemsTable.productId,
            productName: productsTable.name,
            quantity: saleItemsTable.quantity,
            price: saleItemsTable.price,
            total: saleItemsTable.total,
          })
          .from(saleItemsTable)
          .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
          .where(eq(saleItemsTable.saleId, sale.id));

        let customerName: string | null = null;
        if (sale.customerId) {
          const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId));
          customerName = customer?.name ?? null;
        }

        return {
          id: sale.id,
          customerId: sale.customerId,
          customerName,
          total: parseFloat(sale.total),
          notes: sale.notes,
          date: sale.date.toISOString(),
          items: items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName ?? "",
            quantity: i.quantity,
            price: parseFloat(i.price),
            total: parseFloat(i.total),
          })),
        };
      })
    );
    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch sales" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const { customerId, items, notes } = req.body;

    const total = items.reduce((sum: number, item: { quantity: number; price: number }) => sum + item.quantity * item.price, 0);

    const [sale] = await db
      .insert(salesTable)
      .values({ customerId: customerId ?? null, total: String(total), notes: notes ?? null })
      .returning();

    for (const item of items as { productId: number; quantity: number; price: number }[]) {
      await db.insert(saleItemsTable).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        price: String(item.price),
        total: String(item.quantity * item.price),
      });
      await db
        .update(productsTable)
        .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
        .where(eq(productsTable.id, item.productId));
    }

    let customerName: string | null = null;
    if (sale.customerId) {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId));
      customerName = customer?.name ?? null;
    }

    const saleItems = await db
      .select({
        id: saleItemsTable.id,
        productId: saleItemsTable.productId,
        productName: productsTable.name,
        quantity: saleItemsTable.quantity,
        price: saleItemsTable.price,
        total: saleItemsTable.total,
      })
      .from(saleItemsTable)
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(eq(saleItemsTable.saleId, sale.id));

    res.status(201).json({
      id: sale.id,
      customerId: sale.customerId,
      customerName,
      total: parseFloat(sale.total),
      notes: sale.notes,
      date: sale.date.toISOString(),
      items: saleItems.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName ?? "",
        quantity: i.quantity,
        price: parseFloat(i.price),
        total: parseFloat(i.total),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create sale" });
  }
});

router.delete("/sales/:id", async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    await db.delete(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));
    await db.delete(salesTable).where(eq(salesTable.id, saleId));
    res.json({ message: "Sale deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete sale" });
  }
});

export default router;
