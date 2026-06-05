import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/connection';

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, phone, password, role } = req.body;

      // Check if user exists
      const userExists = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (userExists.rows.length > 0) {
        return res.status(400).json({ error: 'المستخدم موجود بالفعل' });
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Create user
      const result = await pool.query(
        'INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
        [name, email, phone, hashedPassword, role || 'staff']
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );

      res.json({
        message: 'تم التسجيل بنجاح',
        user,
        token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'خطأ في التسجيل' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'البريد أو كلمة المرور خاطئة' });
      }

      const user = result.rows[0];

      // Check password
      const passwordMatch = await bcryptjs.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(400).json({ error: 'البريد أو كلمة المرور خاطئة' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );

      res.json({
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
    }
  }

  async logout(req: Request, res: Response) {
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
  }
}

export default new AuthController();
