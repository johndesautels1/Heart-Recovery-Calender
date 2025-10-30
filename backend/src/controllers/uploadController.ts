import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads/exercises');
const videosDir = path.join(uploadDir, 'videos');
const imagesDir = path.join(uploadDir, 'images');

[uploadDir, videosDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on file type
    if (file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, imagesDir);
    } else {
      cb(new Error('Invalid file type'), '');
    }
  },
  filename: (req, file, cb) => {
    // Create unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept videos and images only
  if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Multer upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// POST /api/upload/exercise-media
export const uploadExerciseMedia = async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const result: { videoUrl?: string; imageUrl?: string } = {};

    // Process video file
    if (files.video && files.video[0]) {
      const videoFile = files.video[0];
      result.videoUrl = `/uploads/exercises/videos/${videoFile.filename}`;
    }

    // Process image file
    if (files.image && files.image[0]) {
      const imageFile = files.image[0];
      result.imageUrl = `/uploads/exercises/images/${imageFile.filename}`;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
};

// DELETE /api/upload/exercise-media/:filename
export const deleteExerciseMedia = async (req: Request, res: Response) => {
  try {
    const { type, filename } = req.params;

    if (!['videos', 'images'].includes(type)) {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    const filePath = path.join(uploadDir, type, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'File deletion failed', details: error.message });
  }
};
