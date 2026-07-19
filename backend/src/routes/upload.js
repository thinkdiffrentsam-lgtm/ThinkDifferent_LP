const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { protect, admin } = require('../middleware/auth');

// Multer memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Limit files to 50MB
});

// @desc    Upload file to S3 (fallback to local server disk storage if S3 details are missing)
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME } = process.env;

    const useS3 = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_BUCKET_NAME;

    if (useS3) {
      // 1. UPLOAD TO AWS S3
      console.log('AWS S3 credentials found. Uploading file to S3 bucket...');
      
      const s3 = new S3Client({
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY
        },
        region: AWS_REGION || 'us-east-1'
      });

      const fileKey = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      
      const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      });

      await s3.send(command);

      const fileUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;
      
      return res.status(200).json({
        message: 'File uploaded to AWS S3 successfully',
        url: fileUrl,
        storage: 's3',
        filename: fileKey
      });
    } else {
      // 2. FALLBACK: WRITE TO LOCAL DISK
      console.warn('AWS S3 credentials missing in .env. Falling back to local disk storage...');
      
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      // Ensure local uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      const destinationPath = path.join(uploadsDir, filename);

      // Write memory buffer to local file system
      await fs.promises.writeFile(destinationPath, req.file.buffer);

      // Construct server URL
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

      return res.status(200).json({
        message: 'File uploaded to local disk storage successfully (AWS S3 fallback)',
        url: fileUrl,
        storage: 'local',
        filename: filename
      });
    }
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

module.exports = router;
