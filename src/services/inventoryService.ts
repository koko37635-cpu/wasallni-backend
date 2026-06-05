import pool from '../database/connection';

class InventoryService {
  async getLowStockItems(branchId?: string) {
    try {
      let query = `
        SELECT 
          i.id,
          p.name as product_name,
          i.quantity,
          i.min_threshold,
          i.unit,
          i.quantity - i.min_threshold as shortage
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.quantity <= i.min_threshold
      `;
      const params: any[] = [];

      if (branchId) {
        query += ' AND i.branch_id = $1';
        params.push(branchId);
      }

      query += ' ORDER BY i.quantity ASC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getConsumptionStats(productId: string, days: number = 30) {
    try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          SUM(ABS(quantity_change)) as daily_consumption
        FROM inventory_logs
        WHERE product_id = $1
          AND type = 'consumption'
          AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const result = await pool.query(query, [productId, days]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async calculateOptimalOrderQuantity(productId: string, branchId: string) {
    try {
      // Get average daily consumption
      const consumptionResult = await pool.query(`
        SELECT AVG(ABS(quantity_change)) as avg_daily
        FROM inventory_logs
        WHERE product_id = $1 AND branch_id = $2 AND type = 'consumption'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      `, [productId, branchId]);

      const avgDaily = parseFloat(consumptionResult.rows[0]?.avg_daily || 0);

      // Get current inventory
      const inventoryResult = await pool.query(`
        SELECT quantity, min_threshold
        FROM inventory
        WHERE product_id = $1 AND branch_id = $2
      `, [productId, branchId]);

      if (inventoryResult.rows.length === 0) {
        return null;
      }

      const { quantity, min_threshold } = inventoryResult.rows[0];
      const daysRemaining = quantity / avgDaily;

      return {
        current_quantity: quantity,
        daily_consumption: avgDaily,
        days_remaining: daysRemaining,
        needs_order: daysRemaining < 7,
        recommended_quantity: avgDaily * 14, // Order for 2 weeks
      };
    } catch (error) {
      throw error;
    }
  }

  async recordConsumption(productId: string, branchId: string, quantity: number, orderId?: string) {
    try {
      // Update inventory
      await pool.query(`
        UPDATE inventory
        SET quantity = quantity - $1, updated_at = NOW()
        WHERE product_id = $2 AND branch_id = $3
      `, [quantity, productId, branchId]);

      // Log consumption
      await pool.query(`
        INSERT INTO inventory_logs (product_id, branch_id, quantity_change, type, reference_id)
        VALUES ($1, $2, -$3, 'consumption', $4)
      `, [productId, branchId, quantity, orderId]);

      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new InventoryService();
