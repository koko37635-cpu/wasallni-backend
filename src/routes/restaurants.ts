import { Router, Request, Response } from 'express';
import { pool } from '../db';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware to verify token and get user
const authenticate = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all restaurants (with filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { cuisine, search, category } = req.query;
    let query = `
      SELECT r.*, 
        (SELECT json_agg(json_build_object('id', m.id, 'name', m.name, 'price', m.price)) 
         FROM menu_items m WHERE m.restaurant_id = r.id AND m.is_available = true LIMIT 6) as popular_items
      FROM restaurants r
      WHERE r.is_active = true
    `;
    const params: any[] = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.name ILIKE $${params.length} OR r.description ILIKE $${params.length})`;
    }
    
    if (cuisine) {
      params.push(cuisine);
      query += ` AND r.cuisine_type = $${params.length}`;
    }
    
    query += ` ORDER BY r.rating DESC LIMIT 50`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Get restaurant by ID with full menu
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurant = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    if (restaurant.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    const menu = await pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 AND is_available = true ORDER BY category, name',
      [id]
    );
    
    res.json({
      ...restaurant.rows[0],
      menu: menu.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Get all categories
router.get('/categories/all', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============ Admin/Restaurant Owner Routes ============

// Create restaurant (Admin or Restaurant Owner)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'restaurant') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { name, name_ar, description, cuisine_type, delivery_time_min, delivery_fee, min_order, address, phone } = req.body;
    const userId = user.userId;
    
    const result = await pool.query(
      `INSERT INTO restaurants (user_id, name, name_ar, description, cuisine_type, delivery_time_min, delivery_fee, min_order, address, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, name, name_ar, description, cuisine_type, delivery_time_min, delivery_fee, min_order, address, phone]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

// Get my restaurant (for restaurant owner)
router.get('/my/restaurant', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'restaurant') {
      return res.status(403).json({ error: 'Only restaurant owners can access' });
    }
    
    const result = await pool.query('SELECT * FROM restaurants WHERE user_id = $1', [user.userId]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Update restaurant
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { name, description, delivery_time_min, delivery_fee, min_order, address, phone, is_active } = req.body;
    
    // Check permission
    const restaurant = await pool.query('SELECT user_id FROM restaurants WHERE id = $1', [id]);
    if (restaurant.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found' });
    if (user.role !== 'admin' && restaurant.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await pool.query(
      `UPDATE restaurants SET name = $1, description = $2, delivery_time_min = $3, delivery_fee = $4, 
       min_order = $5, address = $6, phone = $7, is_active = $8, updated_at = NOW() 
       WHERE id = $9 RETURNING *`,
      [name, description, delivery_time_min, delivery_fee, min_order, address, phone, is_active, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// Add menu item
router.post('/:id/menu', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { name, name_ar, description, category, price, discount_price, is_available } = req.body;
    
    const restaurant = await pool.query('SELECT user_id FROM restaurants WHERE id = $1', [id]);
    if (user.role !== 'admin' && restaurant.rows[0]?.user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await pool.query(
      `INSERT INTO menu_items (restaurant_id, name, name_ar, description, category, price, discount_price, is_available) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, name, name_ar, description, category, price, discount_price, is_available ?? true]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Update menu item
router.put('/menu/:itemId', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const user = (req as any).user;
    const { name, description, category, price, discount_price, is_available } = req.body;
    
    const menuItem = await pool.query(
      `SELECT m.*, r.user_id FROM menu_items m JOIN restaurants r ON m.restaurant_id = r.id WHERE m.id = $1`,
      [itemId]
    );
    if (menuItem.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    if (user.role !== 'admin' && menuItem.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await pool.query(
      `UPDATE menu_items SET name = $1, description = $2, category = $3, price = $4, discount_price = $5, is_available = $6 
       WHERE id = $7 RETURNING *`,
      [name, description, category, price, discount_price, is_available, itemId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/menu/:itemId', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const user = (req as any).user;
    
    const menuItem = await pool.query(
      `SELECT m.*, r.user_id FROM menu_items m JOIN restaurants r ON m.restaurant_id = r.id WHERE m.id = $1`,
      [itemId]
    );
    if (menuItem.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    if (user.role !== 'admin' && menuItem.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await pool.query('DELETE FROM menu_items WHERE id = $1', [itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

export default router;
