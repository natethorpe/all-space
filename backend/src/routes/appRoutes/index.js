// backend/src/routes/appRoutes/index.js
import express from 'express';
import sponsorRouter from './sponsor.js';

const router = express.Router();

router.use('/sponsors', sponsorRouter);

export default router;
