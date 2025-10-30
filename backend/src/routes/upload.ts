import express from 'express';
import { upload, uploadExerciseMedia, deleteExerciseMedia } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// POST /api/upload/exercise-media - Upload video and/or image files
router.post(
  '/exercise-media',
  authenticateToken,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  uploadExerciseMedia
);

// DELETE /api/upload/exercise-media/:type/:filename - Delete uploaded file
router.delete('/exercise-media/:type/:filename', authenticateToken, deleteExerciseMedia);

export default router;
