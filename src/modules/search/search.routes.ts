import { Router } from 'express';
import type { Request, Response } from 'express';
import { searchService } from './search.service';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

/** GET /search/trending — hardcoded trending terms (§16). */
router.get(
  '/trending',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, searchService.trending());
  }),
);

export const searchRoutes = router;
