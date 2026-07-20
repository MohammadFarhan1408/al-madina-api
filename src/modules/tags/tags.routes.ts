import { Router } from 'express';
import { tagsController } from './tags.controller';
import { objectIdParam } from '../../utils/common.schema';
import { validate } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

router.get('/', asyncHandler(tagsController.list));
router.get('/:id', validate({ params: objectIdParam() }), asyncHandler(tagsController.detail));

export const tagsRoutes = router;
