import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

router.post('/signup',  authController.signup);
router.post('/login',   authController.login);
router.post('/logout',  authenticate, authController.logout);
router.get('/me',       authenticate, authController.me);

export default router;
