import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/agent-load',          analyticsController.agentLoad);
router.get('/response-time',       analyticsController.avgResponseTime);
router.get('/conversation/:id',    analyticsController.conversationStats);
router.get('/overview',            analyticsController.overview);

export default router;
