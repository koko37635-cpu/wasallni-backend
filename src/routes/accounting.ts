import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// Get all earnings
router.get('/all', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT e.*, s.tracking_number, s.customer_name 
       FROM rider_earnings e
       JOIN shipments s ON e.shipment_id = s.id
       ORDER BY e.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// Get summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const totalRevenue = await pool.query('SELECT COALESCE(SUM(price), 0) as total FROM shipments');
    const pendingPayouts = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM rider_earnings WHERE status = $1',
      ['pending']
    );
    const totalPaid = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM rider_earnings WHERE status = $1',
      ['paid']
    );
    res.json({
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      pendingPayouts: parseFloat(pendingPayouts.rows[0].total),
      totalPaid: parseFloat(totalPaid.rows[0].total)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Mark earning as paid
router.patch('/pay/:earningId', async (req: Request, res: Response) => {
  try {
    const { earningId } = req.params;
    const result = await pool.query(
      'UPDATE rider_earnings SET status = $1, paid_at = NOW() WHERE id = $2 RETURNING *',
      ['paid', earningId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

export default router;