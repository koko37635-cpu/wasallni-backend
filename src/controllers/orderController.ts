import { Request, Response } from 'express';
import pool from '../database/connection';

class OrderController {
  async getAllOrders(req: Request, res: Response) {
    try {
      const { status, branchId, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM orders WHERE 1=1';
      const params: any[] = [];

      if (status) {
        query += ' AND status = $' + (params.length + 1);
        params.push(status);
      }

      if (branchId) {
        query += ' AND branch_id = $' + (params.length + 1);
        params.push(branchId);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في جلب الطلبات' });
    }
  }

  async createOrder(req: Request, res: Response) {
    try {
      const { customerId, items, totalPrice, deliveryAddress, branchId } = req.body;

      const result = await pool.query(
        `INSERT INTO orders (customer_id, items, total_price, delivery_address, branch_id, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING *`,
        [customerId, JSON.stringify(items), totalPrice, deliveryAddress, branchId, 'pending']
      );

      res.json({
        success: true,
        message: 'تم إنشاء الطلب بنجاح',
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في إنشاء الطلب' });
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في جلب الطلب' });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'حالة غير صحيحة' });
      }

      const result = await pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      }

      res.json({
        success: true,
        message: 'تم تحديث الطلب بنجاح',
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'خطأ في تحديث الطلب' });
    }
  }
}

export default new OrderController();
