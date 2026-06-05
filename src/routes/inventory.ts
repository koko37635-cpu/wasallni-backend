import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

// @GET /api/inventory
router.get('/', (req: Request, res: Response) => {
  // TODO: Get all inventory items
  res.json({ message: 'Get all inventory items' });
});

// @POST /api/inventory
router.post('/', (req: Request, res: Response) => {
  // TODO: Add new inventory item
  res.json({ message: 'Add new inventory item' });
});

// @PUT /api/inventory/:id
router.put('/:id', (req: Request, res: Response) => {
  // TODO: Update inventory item
  res.json({ message: 'Update inventory item' });
});

// @DELETE /api/inventory/:id
router.delete('/:id', (req: Request, res: Response) => {
  // TODO: Delete inventory item
  res.json({ message: 'Delete inventory item' });
});

export default router;
