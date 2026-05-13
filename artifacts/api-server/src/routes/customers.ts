import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, salesTable, saleItemsTable, productsTable } from "@workspace/db/schema";
import { eq, ilike, inArray } from "drizzle-orm";

const router = Router();

router.get("/customers", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    let customers;
    if (search) {
      customers = await db
        .select()
        .from(customersTable)
        .where(ilike(customersTable.name, `%${search}%`));
    } else {
      customers = await db.select().from(customersTable).orderBy(customersTable.name);
    }
    res.json(customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const { name, phone, shopName, address, notes } = req.body;
    const [customer] = await db.insert(customersTable).values({ name, phone, shopName, address, notes: notes || "" }).returning();
    res.status(201).json({ ...customer, createdAt: customer.createdAt.toISOString() });
  } catch {
    res.status(500).json({ message: "Failed to create customer" });
  }
});


router.get("/customers/:id", async (req, res) => {
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, parseInt(req.params.id)));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json({ ...customer, createdAt: customer.createdAt.toISOString() }); // ✅ added return
  } catch {
    return res.status(500).json({ message: "Failed to fetch customer" }); // ✅ added return
  }
});

router.put("/customers/:id", async (req, res) => {
  try {
    const { name, phone, shopName, address, notes } = req.body;
    const [customer] = await db
      .update(customersTable)
      .set({ name, phone, shopName, address, notes: notes || "" })
      .where(eq(customersTable.id, parseInt(req.params.id)))
      .returning();
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json({ ...customer, createdAt: customer.createdAt.toISOString() }); // ✅ added return
  } catch {
    return res.status(500).json({ message: "Failed to update customer" }); // ✅ added return
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    await db.delete(customersTable).where(eq(customersTable.id, parseInt(req.params.id)));
    res.json({ message: "Customer deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete customer" });
  }
});

router.get("/customers/:id/sales", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const sales = await db.select().from(salesTable).where(eq(salesTable.customerId, customerId)).orderBy(salesTable.date);

    if (sales.length === 0) return res.json([]);

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
      customerName: null,
      total: parseFloat(sale.total),
      notes: sale.notes,
      date: sale.date.toISOString(),
      items: itemsBySaleId[sale.id] || []
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch customer sales" });
  }
});

export default router;