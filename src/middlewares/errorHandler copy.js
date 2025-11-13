const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack || err.message || err);

  // Handle Multer errors (file upload errors)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message,
    });
  }

  // Handle Cloudinary errors
  if (err.message.includes('Cloudinary')) {
    return res.status(500).json({
      success: false,
      message: 'File storage error',
      error:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Failed to process file',
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message),
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

export default errorHandler;
