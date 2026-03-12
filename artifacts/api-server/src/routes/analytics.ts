import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, productsTable } from "@workspace/db/schema";
import { eq, sql, gte, lte, and, desc } from "drizzle-orm";

const router = Router();

router.get("/analytics/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayStats] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(${salesTable.total}), 0)`,
        count: sql<string>`COALESCE(COUNT(${salesTable.id}), 0)`,
      })
      .from(salesTable)
      .where(and(gte(salesTable.date, today), lte(salesTable.date, tomorrow)));

    const todayItems = await db
      .select({ qty: sql<string>`COALESCE(SUM(${saleItemsTable.quantity}), 0)` })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .where(and(gte(salesTable.date, today), lte(salesTable.date, tomorrow)));

    const [monthlyStats] = await db
      .select({ revenue: sql<string>`COALESCE(SUM(${salesTable.total}), 0)` })
      .from(salesTable)
      .where(gte(salesTable.date, monthStart));

    const stockResult = await db
      .select({ totalStock: sql<string>`COALESCE(SUM(${productsTable.stock}), 0)` })
      .from(productsTable);

    const lowStockProducts = await db
      .select({ id: productsTable.id, name: productsTable.name, brand: productsTable.brand, stock: productsTable.stock })
      .from(productsTable)
      .where(lte(productsTable.stock, 20))
      .orderBy(productsTable.stock);

    const topProductThisMonth = await db
      .select({
        productId: saleItemsTable.productId,
        qty: sql<string>`SUM(${saleItemsTable.quantity})`,
        rev: sql<string>`SUM(${saleItemsTable.total})`,
      })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .where(gte(salesTable.date, monthStart))
      .groupBy(saleItemsTable.productId)
      .orderBy(desc(sql`SUM(${saleItemsTable.quantity})`))
      .limit(1);

    let starProduct = null;
    if (topProductThisMonth.length > 0) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, topProductThisMonth[0].productId));
      if (product) {
        starProduct = {
          id: product.id,
          name: product.name,
          brand: product.brand,
          quantitySold: parseInt(topProductThisMonth[0].qty),
          revenue: parseFloat(topProductThisMonth[0].rev),
        };
      }
    }

    res.json({
      todaySales: parseFloat(todayStats?.revenue ?? "0"),
      todayDrinksSold: parseInt(todayItems[0]?.qty ?? "0"),
      monthlySales: parseFloat(monthlyStats?.revenue ?? "0"),
      stockRemaining: parseInt(stockResult[0]?.totalStock ?? "0"),
      lowStockProducts,
      starProduct,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

router.get("/analytics/daily", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await db
      .select({
        date: sql<string>`DATE(${salesTable.date})`,
        revenue: sql<string>`SUM(${salesTable.total})`,
      })
      .from(salesTable)
      .where(gte(salesTable.date, thirtyDaysAgo))
      .groupBy(sql`DATE(${salesTable.date})`)
      .orderBy(sql`DATE(${salesTable.date})`);

    const itemRows = await db
      .select({
        date: sql<string>`DATE(${salesTable.date})`,
        qty: sql<string>`SUM(${saleItemsTable.quantity})`,
      })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .where(gte(salesTable.date, thirtyDaysAgo))
      .groupBy(sql`DATE(${salesTable.date})`);

    const qtyMap: Record<string, number> = {};
    itemRows.forEach((r) => { qtyMap[r.date] = parseInt(r.qty); });

    res.json(rows.map((r) => ({
      date: r.date,
      revenue: parseFloat(r.revenue),
      quantitySold: qtyMap[r.date] ?? 0,
    })));
  } catch {
    res.status(500).json({ message: "Failed to fetch daily sales" });
  }
});

router.get("/analytics/monthly", async (req, res) => {
  try {
    const rows = await db
      .select({
        month: sql<string>`TO_CHAR(${salesTable.date}, 'YYYY-MM')`,
        revenue: sql<string>`SUM(${salesTable.total})`,
      })
      .from(salesTable)
      .groupBy(sql`TO_CHAR(${salesTable.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${salesTable.date}, 'YYYY-MM')`)
      .limit(12);

    const itemRows = await db
      .select({
        month: sql<string>`TO_CHAR(${salesTable.date}, 'YYYY-MM')`,
        qty: sql<string>`SUM(${saleItemsTable.quantity})`,
      })
      .from(saleItemsTable)
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .groupBy(sql`TO_CHAR(${salesTable.date}, 'YYYY-MM')`);

    const qtyMap: Record<string, number> = {};
    itemRows.forEach((r) => { qtyMap[r.month] = parseInt(r.qty); });

    res.json(rows.map((r) => ({
      month: r.month,
      revenue: parseFloat(r.revenue),
      quantitySold: qtyMap[r.month] ?? 0,
    })));
  } catch {
    res.status(500).json({ message: "Failed to fetch monthly sales" });
  }
});

router.get("/analytics/top-products", async (req, res) => {
  try {
    const rows = await db
      .select({
        productId: saleItemsTable.productId,
        qty: sql<string>`SUM(${saleItemsTable.quantity})`,
        rev: sql<string>`SUM(${saleItemsTable.total})`,
      })
      .from(saleItemsTable)
      .groupBy(saleItemsTable.productId)
      .orderBy(desc(sql`SUM(${saleItemsTable.quantity})`))
      .limit(10);

    const result = await Promise.all(
      rows.map(async (row) => {
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, row.productId));
        return {
          id: row.productId,
          name: product?.name ?? "Unknown",
          brand: product?.brand ?? "",
          size: product?.size ?? "",
          quantitySold: parseInt(row.qty),
          revenue: parseFloat(row.rev),
        };
      })
    );
    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch top products" });
  }
});

router.get("/analytics/profit-margins", async (req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.name);

    const salesByProduct = await db
      .select({
        productId: saleItemsTable.productId,
        totalQty: sql<string>`SUM(${saleItemsTable.quantity})`,
        totalRevenue: sql<string>`SUM(${saleItemsTable.total})`,
      })
      .from(saleItemsTable)
      .groupBy(saleItemsTable.productId);

    const salesMap: Record<number, { qty: number; revenue: number }> = {};
    salesByProduct.forEach((s) => {
      salesMap[s.productId] = { qty: parseInt(s.totalQty), revenue: parseFloat(s.totalRevenue) };
    });

    const result = products.map((p) => {
      const purchasePrice = parseFloat(p.purchasePrice);
      const sellingPrice = parseFloat(p.sellingPrice);
      const profitPerUnit = sellingPrice - purchasePrice;
      const profitMarginPercent = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
      const sold = salesMap[p.id] ?? { qty: 0, revenue: 0 };
      const totalProfit = sold.qty * profitPerUnit;

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        size: p.size,
        purchasePrice,
        sellingPrice,
        profitPerUnit,
        profitMarginPercent: parseFloat(profitMarginPercent.toFixed(2)),
        totalUnitsSold: sold.qty,
        totalRevenue: sold.revenue,
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        stock: p.stock,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch profit margins" });
  }
});

export default router;
