import { Request, Response } from 'express';
import pool from '../database/connection';

class AnalyticsController {
  async getDailyReport(req: Request, res: Response) {
    try {
      const { branchId, date } = req.query;

      let query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders_count,
          SUM(total_price) as total_sales,
          AVG(total_price) as avg_order_value
        FROM orders
        WHERE 1=1
      `;
      const params: any[] = [];

      if (branchId) {
        query += ' AND branch_id = $' + (params.length + 1);
        params.push(branchId);
      }

      if (date) {
        query += ' AND DATE(created_at) = $' + (params.length + 1);
        params.push(date);
      } else {
        query += ' AND DATE(created_at) = CURRENT_DATE';
      }

      query += ' GROUP BY DATE(created_at)';

      const result = await pool.query(query, params);

      const insights = await this.generateInsights(branchId as string);

      res.json({
        success: true,
        data: {
          ...result.rows[0] || { date: new Date().toISOString().split('T')[0], orders_count: 0, total_sales: 0, avg_order_value: 0 },
          insights,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في الحصول على التقرير اليومي' });
    }
  }

  async getBranchPerformance(req: Request, res: Response) {
    try {
      const query = `
        SELECT 
          b.id,
          b.name,
          COUNT(o.id) as orders_count,
          SUM(o.total_price) as total_sales,
          AVG(o.total_price) as avg_order_value,
          COALESCE(AVG(r.rating), 0) as avg_rating
        FROM branches b
        LEFT JOIN orders o ON b.id = o.branch_id AND DATE(o.created_at) = CURRENT_DATE
        LEFT JOIN ratings r ON b.id = r.branch_id
        GROUP BY b.id, b.name
        ORDER BY total_sales DESC
      `;

      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في الحصول على أداء الفروع' });
    }
  }

  async getSalesTrends(req: Request, res: Response) {
    try {
      const { days = 30, branchId } = req.query;

      let query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders_count,
          SUM(total_price) as total_sales
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      `;
      const params: any[] = [days];

      if (branchId) {
        query += ' AND branch_id = $' + (params.length + 1);
        params.push(branchId);
      }

      query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في الحصول على اتجاهات المبيعات' });
    }
  }

  private async generateInsights(branchId?: string): Promise<string[]> {
    const insights: string[] = [];

    try {
      // Get today's sales vs yesterday
      const salesComparison = await pool.query(`
        SELECT 
          SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total_price ELSE 0 END) as today,
          SUM(CASE WHEN DATE(created_at) = CURRENT_DATE - INTERVAL '1 day' THEN total_price ELSE 0 END) as yesterday
        FROM orders
        ${branchId ? `WHERE branch_id = '${branchId}'` : ''}
      `);

      const today = parseFloat(salesComparison.rows[0]?.today || 0);
      const yesterday = parseFloat(salesComparison.rows[0]?.yesterday || 0);

      if (yesterday > 0) {
        const change = ((today - yesterday) / yesterday) * 100;
        if (change > 10) {
          insights.push(`📈 المبيعات ارتفعت ${change.toFixed(1)}% مقارنة بأمس`);
        } else if (change < -10) {
          insights.push(`📉 المبيعات انخفضت ${Math.abs(change).toFixed(1)}% مقارنة بأمس`);
        }
      }

      // Low stock items
      const lowStock = await pool.query(`
        SELECT COUNT(*) as count FROM inventory 
        WHERE quantity <= min_threshold
        ${branchId ? `AND branch_id = '${branchId}'` : ''}
      `);

      if (parseInt(lowStock.rows[0].count) > 0) {
        insights.push(`⚠️ يوجد ${lowStock.rows[0].count} أصناف معرضة للنفاد`);
      }

      // Top selling items
      const topItems = await pool.query(`
        SELECT * FROM (
          SELECT DISTINCT ON (product_name) 
            product_name, 
            COUNT(*) as count
          FROM order_items
          WHERE DATE(created_at) = CURRENT_DATE
          ${branchId ? `AND branch_id = '${branchId}'` : ''}
          GROUP BY product_name
          ORDER BY product_name, count DESC
        ) as tmp
        ORDER BY count DESC
        LIMIT 3
      `);

      if (topItems.rows.length > 0) {
        const items = topItems.rows.map(r => r.product_name).join('، ');
        insights.push(`⭐ الأصناف الأكثر طلباً: ${items}`);
      }

    } catch (error) {
      console.error('Error generating insights:', error);
    }

    return insights;
  }
}

export default new AnalyticsController();
