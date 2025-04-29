// backend/src/routes.js
import express from 'express';
import appRoutes from './routes/appRoutes/index.js';

const router = express.Router();

router.use('/api', appRoutes);

export default router;
