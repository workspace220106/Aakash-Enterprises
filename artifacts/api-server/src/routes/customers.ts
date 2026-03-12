import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, salesTable, saleItemsTable, productsTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";

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
    res.json({ ...customer, createdAt: customer.createdAt.toISOString() });
  } catch {
    res.status(500).json({ message: "Failed to fetch customer" });
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
    res.json({ ...customer, createdAt: customer.createdAt.toISOString() });
  } catch {
    res.status(500).json({ message: "Failed to update customer" });
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

        return {
          id: sale.id,
          customerId: sale.customerId,
          customerName: null,
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
    res.status(500).json({ message: "Failed to fetch customer sales" });
  }
});

export default router;
