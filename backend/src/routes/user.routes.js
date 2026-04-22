import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.js';
import { upsertUserSchema } from '../validators/user.validator.js';

const router = Router();

router.get('/',    userController.getAll);
router.get('/:id', userController.getById);
router.post('/',   validate(upsertUserSchema), userController.upsert);

export default router;
