import { Router } from 'express';
import { tagsController } from './tags.controller';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.get('/', asyncHandler(tagsController.list));

export const tagsRoutes = router;
