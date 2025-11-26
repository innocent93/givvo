// @ts-nocheck
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Validate type + size
const validateFile = file => {
  if (!file) {
    const err = new Error('File is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error('Only JPEG images and PDF files are allowed.');
    err.statusCode = 400;
    throw err;
  }

  if (file.size > MAX_FILE_SIZE) {
    const err = new Error('File size exceeds 5MB limit.');
    err.statusCode = 400;
    throw err;
  }
};

// Build Cloudinary options based on mimetype
const buildCloudinaryOptions = (file, folder, filename) => {
  const publicId = filename?.replace(/\.[^.]+$/, ''); // strip extension

  // JPEG image
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
    return {
      folder,
      public_id: publicId,
      resource_type: 'image',
      transformation: [
        {
          quality: 'auto:best', // auto best quality
          fetch_format: 'auto', // WebP/AVIF/JPEG depending on client
        },
      ],
    };
  }

  // PDF – stored as image resource with pdf format so we can still apply quality
  if (file.mimetype === 'application/pdf') {
    return {
      folder,
      public_id: publicId,
      resource_type: 'image',
      format: 'pdf',
      transformation: [
        {
          quality: 'auto:best',
        },
      ],
    };
  }

  // fallback (should not happen with validation)
  return {
    folder,
    public_id: publicId,
  };
};

// Low-level uploader
const uploadBufferToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
};

/**
 * High-level helper:
 *  - validates file (type + size)
 *  - applies image/PDF transformations
 *  - uploads to Cloudinary
 *  - returns secure_url
 */
export const uploadFileToCloudinary = async (file, folder, userId) => {
  if (!file) return undefined;

  validateFile(file);

  const options = buildCloudinaryOptions(
    file,
    `${folder}/${userId}`,
    file.originalname
  );

  const result = await uploadBufferToCloudinary(file.buffer, options);
  return result.secure_url;
};
