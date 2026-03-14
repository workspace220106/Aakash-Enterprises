import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, ilike, sql } from "drizzle-orm";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    let products;
    if (search) {
      products = await db
        .select()
        .from(productsTable)
        .where(ilike(productsTable.name, `%${search}%`));
    } else {
      products = await db.select().from(productsTable).orderBy(productsTable.name);
    }
    res.json(
      products.map((p) => ({
        ...p,
        purchasePrice: parseFloat(p.purchasePrice),
        sellingPrice: parseFloat(p.sellingPrice),
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const { name, brand, size, purchasePrice, sellingPrice, stock, supplier } = req.body;
    const [product] = await db
      .insert(productsTable)
      .values({ name, brand, size, purchasePrice: String(purchasePrice), sellingPrice: String(sellingPrice), stock, supplier })
      .returning();
    res.status(201).json({
      ...product,
      purchasePrice: parseFloat(product.purchasePrice),
      sellingPrice: parseFloat(product.sellingPrice),
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create product" });
  }
});


router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parseInt(req.params.id)));
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ ...product, purchasePrice: parseFloat(product.purchasePrice), sellingPrice: parseFloat(product.sellingPrice), createdAt: product.createdAt.toISOString() }); // ✅ added return
  } catch {
    return res.status(500).json({ message: "Failed to fetch product" }); // ✅ added return
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const { name, brand, size, purchasePrice, sellingPrice, stock, supplier } = req.body;
    const [product] = await db
      .update(productsTable)
      .set({ name, brand, size, purchasePrice: String(purchasePrice), sellingPrice: String(sellingPrice), stock, supplier })
      .where(eq(productsTable.id, parseInt(req.params.id)))
      .returning();
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ ...product, purchasePrice: parseFloat(product.purchasePrice), sellingPrice: parseFloat(product.sellingPrice), createdAt: product.createdAt.toISOString() }); // ✅ added return
  } catch {
    return res.status(500).json({ message: "Failed to update product" }); // ✅ added return
  }
});
router.delete("/products/:id", async (req, res) => {
  try {
    await db.delete(productsTable).where(eq(productsTable.id, parseInt(req.params.id)));
    res.json({ message: "Product deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete product" });
  }
});

export default router;