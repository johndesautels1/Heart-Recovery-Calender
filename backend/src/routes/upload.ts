import express from 'express';
import { upload, uploadExerciseMedia, deleteExerciseMedia } from '../controllers/uploadController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// POST /api/upload/exercise-media - Upload video and/or image files
router.post(
  '/exercise-media',
  authenticate,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  uploadExerciseMedia
);

// DELETE /api/upload/exercise-media/:type/:filename - Delete uploaded file
router.delete('/exercise-media/:type/:filename', authenticate, deleteExerciseMedia);

export default router;
