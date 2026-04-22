import { Router } from 'express';
import { agentController } from '../controllers/agent.controller.js';
import { validate } from '../middlewares/validate.js';
import { createAgentSchema, updateStatusSchema } from '../validators/agent.validator.js';

const router = Router();

router.get('/',        agentController.getAll);
router.get('/:id',     agentController.getById);
router.post('/',       validate(createAgentSchema), agentController.create);
router.patch('/:id/status', validate(updateStatusSchema), agentController.updateStatus);

export default router;
