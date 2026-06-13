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

    const [
      todayStatsResult,
      todayItemsResult,
      monthlyStatsResult,
      stockResultResult,
      lowStockProducts,
      topProductThisMonth
    ] = await Promise.all([
      db
        .select({
          revenue: sql<string>`COALESCE(SUM(${salesTable.total}), 0)`,
          count: sql<string>`COALESCE(COUNT(${salesTable.id}), 0)`,
        })
        .from(salesTable)
        .where(and(gte(salesTable.date, today), lte(salesTable.date, tomorrow))),
      
      db
        .select({ qty: sql<string>`COALESCE(SUM(${saleItemsTable.quantity}), 0)` })
        .from(saleItemsTable)
        .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
        .where(and(gte(salesTable.date, today), lte(salesTable.date, tomorrow))),
        
      db
        .select({ revenue: sql<string>`COALESCE(SUM(${salesTable.total}), 0)` })
        .from(salesTable)
        .where(gte(salesTable.date, monthStart)),
        
      db
        .select({ totalStock: sql<string>`COALESCE(SUM(${productsTable.stock}), 0)` })
        .from(productsTable),
        
      db
        .select({ id: productsTable.id, name: productsTable.name, brand: productsTable.brand, stock: productsTable.stock })
        .from(productsTable)
        .where(lte(productsTable.stock, 20))
        .orderBy(productsTable.stock),
        
      db
        .select({
          productId: saleItemsTable.productId,
          qty: sql<string>`SUM(${saleItemsTable.quantity})`,
          rev: sql<string>`SUM(${saleItemsTable.total})`,
          name: productsTable.name,
          brand: productsTable.brand
        })
        .from(saleItemsTable)
        .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
        .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
        .where(gte(salesTable.date, monthStart))
        .groupBy(saleItemsTable.productId, productsTable.name, productsTable.brand)
        .orderBy(desc(sql`SUM(${saleItemsTable.quantity})`))
        .limit(1)
    ]);

    const todayStats = todayStatsResult[0];
    const todayItems = todayItemsResult;
    const monthlyStats = monthlyStatsResult[0];
    const stockResult = stockResultResult;

    let starProduct = null;
    if (topProductThisMonth.length > 0) {
      starProduct = {
        id: topProductThisMonth[0].productId,
        name: topProductThisMonth[0].name,
        brand: topProductThisMonth[0].brand,
        quantitySold: parseInt(topProductThisMonth[0].qty),
        revenue: parseFloat(topProductThisMonth[0].rev),
      };
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

    const [sales, items] = await Promise.all([
      db
        .select({
          id: salesTable.id,
          date: sql<string>`DATE(${salesTable.date})`,
          total: salesTable.total,
        })
        .from(salesTable)
        .where(gte(salesTable.date, thirtyDaysAgo)),
      db
        .select({
          saleId: saleItemsTable.saleId,
          quantity: saleItemsTable.quantity,
          purchasePrice: productsTable.purchasePrice,
        })
        .from(saleItemsTable)
        .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
        .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
        .where(gte(salesTable.date, thirtyDaysAgo))
    ]);

    const saleMetrics: Record<number, { cost: number; quantitySold: number }> = {};
    items.forEach((item) => {
      const saleId = item.saleId;
      const qty = item.quantity || 0;
      const pPrice = parseFloat(item.purchasePrice || "0");
      const cost = qty * pPrice;
      
      if (!saleMetrics[saleId]) {
        saleMetrics[saleId] = { cost: 0, quantitySold: 0 };
      }
      saleMetrics[saleId].cost += cost;
      saleMetrics[saleId].quantitySold += qty;
    });

    const dailyData: Record<string, { date: string; revenue: number; quantitySold: number; profit: number }> = {};
    sales.forEach((sale) => {
      const dateStr = sale.date;
      const total = parseFloat(sale.total);
      const metrics = saleMetrics[sale.id] || { cost: 0, quantitySold: 0 };
      const profit = total - metrics.cost;

      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, revenue: 0, quantitySold: 0, profit: 0 };
      }
      dailyData[dateStr].revenue += total;
      dailyData[dateStr].quantitySold += metrics.quantitySold;
      dailyData[dateStr].profit += parseFloat(profit.toFixed(2));
    });

    const result = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch daily sales" });
  }
});

router.get("/analytics/monthly", async (req, res) => {
  try {
    const [sales, items] = await Promise.all([
      db
        .select({
          id: salesTable.id,
          month: sql<string>`TO_CHAR(${salesTable.date}, 'YYYY-MM')`,
          total: salesTable.total,
        })
        .from(salesTable),
      db
        .select({
          saleId: saleItemsTable.saleId,
          quantity: saleItemsTable.quantity,
          purchasePrice: productsTable.purchasePrice,
        })
        .from(saleItemsTable)
        .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    ]);

    const saleMetrics: Record<number, { cost: number; quantitySold: number }> = {};
    items.forEach((item) => {
      const saleId = item.saleId;
      const qty = item.quantity || 0;
      const pPrice = parseFloat(item.purchasePrice || "0");
      const cost = qty * pPrice;
      
      if (!saleMetrics[saleId]) {
        saleMetrics[saleId] = { cost: 0, quantitySold: 0 };
      }
      saleMetrics[saleId].cost += cost;
      saleMetrics[saleId].quantitySold += qty;
    });

    const monthlyData: Record<string, { month: string; revenue: number; quantitySold: number; profit: number }> = {};
    sales.forEach((sale) => {
      const monthStr = sale.month;
      const total = parseFloat(sale.total);
      const metrics = saleMetrics[sale.id] || { cost: 0, quantitySold: 0 };
      const profit = total - metrics.cost;

      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = { month: monthStr, revenue: 0, quantitySold: 0, profit: 0 };
      }
      monthlyData[monthStr].revenue += total;
      monthlyData[monthStr].quantitySold += metrics.quantitySold;
      monthlyData[monthStr].profit += parseFloat(profit.toFixed(2));
    });

    const result = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
    res.json(result);
  } catch (err) {
    console.error(err);
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
        name: productsTable.name,
        brand: productsTable.brand,
        size: productsTable.size
      })
      .from(saleItemsTable)
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .groupBy(saleItemsTable.productId, productsTable.name, productsTable.brand, productsTable.size)
      .orderBy(desc(sql`SUM(${saleItemsTable.quantity})`))
      .limit(10);

    const result = rows.map((row: any) => ({
      id: row.productId,
      name: row.name ?? "Unknown",
      brand: row.brand ?? "",
      size: row.size ?? "",
      quantitySold: parseInt(row.qty),
      revenue: parseFloat(row.rev),
    }));
    
    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch top products" });
  }
});

router.get("/analytics/profit-margins", async (req, res) => {
  try {
    const [products, salesByProduct] = await Promise.all([
      db.select().from(productsTable).orderBy(productsTable.name),
      db
        .select({
          productId: saleItemsTable.productId,
          totalQty: sql<string>`SUM(${saleItemsTable.quantity})`,
          totalRevenue: sql<string>`SUM(${saleItemsTable.total})`,
        })
        .from(saleItemsTable)
        .groupBy(saleItemsTable.productId)
    ]);

    const salesMap: Record<number, { qty: number; revenue: number }> = {};
    salesByProduct.forEach((s: any) => {
      salesMap[s.productId] = { qty: parseInt(s.totalQty), revenue: parseFloat(s.totalRevenue) };
    });

    const result = products.map((p: any) => {
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
