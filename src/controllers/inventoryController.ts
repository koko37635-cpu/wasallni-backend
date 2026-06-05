import { Request, Response } from 'express';
import pool from '../database/connection';

class InventoryController {
  async getAllItems(req: Request, res: Response) {
    try {
      const { branchId, limit = 100 } = req.query;

      let query = 'SELECT * FROM inventory WHERE 1=1';
      const params: any[] = [];

      if (branchId) {
        query += ' AND branch_id = $' + (params.length + 1);
        params.push(branchId);
      }

      query += ' ORDER BY name ASC LIMIT $' + (params.length + 1);
      params.push(limit);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في جلب الأصناف' });
    }
  }

  async createItem(req: Request, res: Response) {
    try {
      const { name, quantity, unit, minThreshold, supplier, branchId } = req.body;

      const result = await pool.query(
        `INSERT INTO inventory (name, quantity, unit, min_threshold, supplier, branch_id, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING *`,
        [name, quantity, unit, minThreshold, supplier, branchId]
      );

      res.json({
        success: true,
        message: 'تم إضافة الصنف بنجاح',
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في إضافة الصنف' });
    }
  }

  async updateItemQuantity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity, type } = req.body; // type: 'add' or 'deduct'

      // Get current quantity
      const current = await pool.query(
        'SELECT quantity FROM inventory WHERE id = $1',
        [id]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'الصنف غير موجود' });
      }

      const newQuantity = type === 'add' 
        ? current.rows[0].quantity + quantity 
        : current.rows[0].quantity - quantity;

      const result = await pool.query(
        'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newQuantity, id]
      );

      res.json({
        success: true,
        message: 'تم تحديث الكمية بنجاح',
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في تحديث الكمية' });
    }
  }

  async getLowStockItems(req: Request, res: Response) {
    try {
      const { branchId } = req.query;

      let query = 'SELECT * FROM inventory WHERE quantity <= min_threshold';
      const params: any[] = [];

      if (branchId) {
        query += ' AND branch_id = $' + (params.length + 1);
        params.push(branchId);
      }

      query += ' ORDER BY quantity ASC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        message: `يوجد ${result.rows.length} أصناف معرضة للنفاد`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في جلب الأصناف المنخفضة' });
    }
  }
}

export default new InventoryController();
