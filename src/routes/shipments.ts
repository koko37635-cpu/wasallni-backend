import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { notifyUser } from '../index';

const router = Router();

// Get all shipments
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as rider_name 
      FROM shipments s
      LEFT JOIN users u ON s.rider_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// Get shipment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

// Create new shipment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tracking_number, customer_name, customer_phone, pickup_address, delivery_address, price } = req.body;
    
    const result = await pool.query(
      `INSERT INTO shipments (tracking_number, customer_name, customer_phone, pickup_address, delivery_address, price) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tracking_number, customer_name, customer_phone, pickup_address, delivery_address, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

// Assign rider to shipment
router.put('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rider_id } = req.body;
    
    // Get shipment details for notification
    const shipment = await pool.query('SELECT tracking_number FROM shipments WHERE id = $1', [id]);
    const tracking_number = shipment.rows[0]?.tracking_number;
    
    const result = await pool.query(
      'UPDATE shipments SET rider_id = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [rider_id, 'assigned', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Send notification to rider
    if (tracking_number && rider_id) {
      notifyUser(rider_id, {
        title: '📦 New Shipment Assigned',
        message: `Shipment ${tracking_number} has been assigned to you`,
        type: 'shipment_assigned',
        related_id: parseInt(id)
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to assign rider' });
  }
});

// Update shipment status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get shipment details for notification
    const shipment = await pool.query('SELECT tracking_number, rider_id FROM shipments WHERE id = $1', [id]);
    const tracking_number = shipment.rows[0]?.tracking_number;
    const rider_id = shipment.rows[0]?.rider_id;
    
    const result = await pool.query(
      'UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    // Send notification based on status change
    if (rider_id && tracking_number) {
      const notificationMessages: Record<string, { title: string; message: string }> = {
        assigned: {
          title: '✅ Shipment Assigned',
          message: `Shipment ${tracking_number} has been assigned to you`
        },
        in_transit: {
          title: '🚚 Shipment On The Way',
          message: `Shipment ${tracking_number} is on the way to destination`
        },
        delivered: {
          title: '🎉 Shipment Delivered',
          message: `Shipment ${tracking_number} has been delivered successfully!`
        },
        cancelled: {
          title: '❌ Shipment Cancelled',
          message: `Shipment ${tracking_number} has been cancelled`
        }
      };
      
      if (notificationMessages[status]) {
        notifyUser(rider_id, {
          title: notificationMessages[status].title,
          message: notificationMessages[status].message,
          type: 'shipment_update',
          related_id: parseInt(id)
        });
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get shipments by rider
router.get('/rider/:riderId', async (req: Request, res: Response) => {
  try {
    const { riderId } = req.params;
    const result = await pool.query(
      'SELECT * FROM shipments WHERE rider_id = $1 ORDER BY created_at DESC',
      [riderId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rider shipments' });
  }
});

export default router;