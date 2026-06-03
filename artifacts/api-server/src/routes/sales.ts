import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, productsTable, customersTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";

const router = Router();

router.get("/sales", async (req, res) => {
  try {
    const { startDate, endDate, customerId } = req.query;

    const conditions = [];
    if (startDate) conditions.push(gte(salesTable.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(salesTable.date, new Date(endDate as string)));
    if (customerId) conditions.push(eq(salesTable.customerId, parseInt(customerId as string)));

    const sales = await db
      .select({
        id: salesTable.id,
        customerId: salesTable.customerId,
        customerName: customersTable.name,
        total: salesTable.total,
        notes: salesTable.notes,
        date: salesTable.date
      })
      .from(salesTable)
      .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(salesTable.date);

    if (sales.length === 0) {
      return res.json([]);
    }

    const saleIds = sales.map(s => s.id);

    const items = await db
      .select({
        id: saleItemsTable.id,
        saleId: saleItemsTable.saleId,
        productId: saleItemsTable.productId,
        productName: productsTable.name,
        quantity: saleItemsTable.quantity,
        price: saleItemsTable.price,
        total: saleItemsTable.total,
      })
      .from(saleItemsTable)
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .where(inArray(saleItemsTable.saleId, saleIds));

    const itemsBySaleId = items.reduce((acc, item) => {
      if (!acc[item.saleId]) acc[item.saleId] = [];
      acc[item.saleId].push({
        id: item.id,
        productId: item.productId,
        productName: item.productName ?? "",
        quantity: item.quantity,
        price: parseFloat(item.price),
        total: parseFloat(item.total),
      });
      return acc;
    }, {} as Record<number, any[]>);

    const result = sales.map(sale => ({
      id: sale.id,
      customerId: sale.customerId,
      customerName: sale.customerName,
      total: parseFloat(sale.total),
      notes: sale.notes,
      date: sale.date.toISOString(),
      items: itemsBySaleId[sale.id] || []
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch sales" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const { customerId, items, notes, total: customTotal } = req.body;
    console.log("[createSale] received total:", customTotal, "type:", typeof customTotal);

    const calculatedTotal = items.reduce((sum: number, item: { quantity: number; price: number }) => sum + item.quantity * item.price, 0);
    const finalTotal = (customTotal !== undefined && customTotal !== null && !isNaN(Number(customTotal)))
      ? Number(customTotal)
      : calculatedTotal;
    console.log("[createSale] finalTotal:", finalTotal, "calculatedTotal:", calculatedTotal);

    const [sale] = await db
      .insert(salesTable)
      .values({ customerId: customerId ?? null, total: String(finalTotal), notes: notes ?? null })
      .returning();

    const scaleFactor = calculatedTotal > 0 ? finalTotal / calculatedTotal : 1;

    for (const item of items as { productId: number; quantity: number; price: number }[]) {
      const originalItemTotal = item.quantity * item.price;
      const finalItemTotal = originalItemTotal * scaleFactor;
      const finalItemPrice = item.price * scaleFactor;

      await db.insert(saleItemsTable).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        price: String(parseFloat(finalItemPrice.toFixed(4))),
        total: String(parseFloat(finalItemTotal.toFixed(2))),
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
      items: saleItems.map((i: any) => ({
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
