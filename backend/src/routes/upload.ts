import express from 'express';
import { upload, uploadExerciseMedia, deleteExerciseMedia } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/upload/exercise-media
 * @desc    Upload exercise media files (video and/or image)
 * @access  Private
 * @body    Multipart form data with 'video' and/or 'image' fields
 * @returns { videoUrl, imageUrl }
 */
router.post(
  '/exercise-media',
  authenticateToken,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  uploadExerciseMedia
);

/**
 * @route   DELETE /api/upload/exercise-media/:type/:filename
 * @desc    Delete an uploaded exercise media file
 * @access  Private
 * @params  type - 'video' or 'image', filename - name of file to delete
 */
router.delete('/exercise-media/:type/:filename', authenticateToken, deleteExerciseMedia);

export default router;
