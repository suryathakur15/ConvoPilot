import { Router } from 'express';
import { agentAuthController } from '../controllers/agentAuth.controller.js';

const router = Router();

router.post('/signup', agentAuthController.signup);
router.post('/login',  agentAuthController.login);
router.post('/logout', agentAuthController.logout);
router.get('/me',      agentAuthController.me);

export default router;
