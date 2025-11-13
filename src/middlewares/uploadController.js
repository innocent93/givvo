// @ts-nocheck
import InternProfile from '../models/InternProfile.js';

const uploadResumeCloud = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        details: 'Please select a resume file to upload',
      });
    }

    // Prepare resume data from Cloudinary response
    const resumeData = {
      url: req.file.path,
      public_id: req.file.filename,
      format: req.file.format,
      fileName: req.file.originalname,
      isActive: true,
      size: req.file.size,
      resourceType: req.file.resource_type,
      uploadedAt: new Date(),
    };

    // Update database
    const updateOperations = [
      // Deactivate all other resumes
      InternProfile.updateMany(
        { user: req.user.id, 'resumes.isActive': true },
        { $set: { 'resumes.$[].isActive': false } }
      ),
      // Add new resume
      InternProfile.findOneAndUpdate(
        { user: req.user.id },
        { $push: { resumes: resumeData } },
        { new: true, upsert: true }
      ),
    ];

    const [, updatedProfile] = await Promise.all(updateOperations);

    // Success response
    return res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully',
      resume: {
        id: req.file.filename,
        url: req.file.path,
        fileName: req.file.originalname,
        format: req.file.format,
        size: req.file.size,
        isActive: true,
      },
      user: {
        id: req.user.id,
        totalResumes: updatedProfile.resumes.length,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Handle different error cases
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        details: error.message,
      });
    }

    if (error.message.includes('File too large')) {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        details: 'Maximum file size is 10MB',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to upload resume',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
    });
  }
};

export default uploadResumeCloud;
