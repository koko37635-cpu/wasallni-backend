import pool from '../database/connection';
import AIService from './aiService';

class AnalyticsService {
  async generateDailyReport(branchId?: string) {
    try {
      // Get sales data
      const salesQuery = `
        SELECT 
          COUNT(*) as orders_count,
          SUM(total_price) as total_sales,
          AVG(total_price) as avg_order_value
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
        ${branchId ? 'AND branch_id = $1' : ''}
      `;

      const params = branchId ? [branchId] : [];
      const salesResult = await pool.query(salesQuery, params);

      // Get insights from AI
      let aiInsights = [];
      try {
        const aiReport = await AIService.getDailyReport(branchId);
        aiInsights = aiReport.data?.insights || [];
      } catch (error) {
        console.error('AI Service unavailable:', error);
      }

      // Get low stock items
      const lowStockQuery = `
        SELECT COUNT(*) as count
        FROM inventory
        WHERE quantity <= min_threshold
        ${branchId ? 'AND branch_id = $1' : ''}
      `;

      const lowStockResult = await pool.query(lowStockQuery, params);

      return {
        date: new Date().toISOString().split('T')[0],
        ...salesResult.rows[0],
        low_stock_alerts: lowStockResult.rows[0]?.count || 0,
        insights: aiInsights,
      };
    } catch (error) {
      throw error;
    }
  }

  async getProfitAnalysis(branchId?: string, startDate?: string, endDate?: string) {
    try {
      const query = `
        SELECT 
          DATE(o.created_at) as date,
          SUM(o.total_price) as revenue,
          COUNT(DISTINCT o.id) as orders_count,
          COALESCE(SUM(
            SELECT SUM(ii.quantity * sp.unit_price)
            FROM order_items ii
            JOIN supplier_products sp ON ii.product_id = sp.product_id
            WHERE ii.order_id = o.id
          ), 0) as cost_of_goods,
          (SUM(o.total_price) - COALESCE(SUM(
            SELECT SUM(ii.quantity * sp.unit_price)
            FROM order_items ii
            JOIN supplier_products sp ON ii.product_id = sp.product_id
            WHERE ii.order_id = o.id
          ), 0)) as gross_profit
        FROM orders o
        WHERE 1=1
        ${branchId ? 'AND o.branch_id = $1' : ''}
        ${startDate ? `AND DATE(o.created_at) >= $${branchId ? 2 : 1}` : ''}
        ${endDate ? `AND DATE(o.created_at) <= $${branchId && startDate ? 3 : branchId || startDate ? 2 : 1}` : ''}
        GROUP BY DATE(o.created_at)
        ORDER BY date DESC
      `;

      const params: any[] = [];
      if (branchId) params.push(branchId);
      if (startDate) params.push(startDate);
      if (endDate) params.push(endDate);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getEmployeePerformance(branchId?: string) {
    try {
      const query = `
        SELECT 
          u.id,
          u.name,
          u.role,
          COUNT(DISTINCT o.id) as orders_handled,
          AVG(o.delivery_time_minutes) as avg_delivery_time,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(DISTINCT r.id) as total_ratings
        FROM users u
        LEFT JOIN orders o ON u.id = o.delivery_person_id
        LEFT JOIN ratings r ON o.id = r.order_id
        WHERE u.role IN ('delivery', 'staff')
        ${branchId ? 'AND u.branch_id = $1' : ''}
        GROUP BY u.id, u.name, u.role
        ORDER BY avg_rating DESC
      `;

      const params = branchId ? [branchId] : [];
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

export default new AnalyticsService();
