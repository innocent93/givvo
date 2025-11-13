// // @ts-nocheck
// import multer from "multer";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import cloudinaryModule from "cloudinary";
// import dotenv from "dotenv";

// dotenv.config();

// const cloudinary = cloudinaryModule.v2;

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // ✅ Allowed file types (images + PDF)
// const allowedDocTypes = [
//   "image/jpeg",
//   "image/png",
//   "image/webp",
//   "application/pdf",
// ];

// // ✅ File filter for documents (images OR PDF)
// const fileFilter = (req, file, cb) => {
//   if (allowedDocTypes.includes(file.mimetype)) cb(null, true);
//   else cb(new Error("Only JPG, PNG, WEBP images or PDF files are allowed!"), false);
// };

// // ✅ Cloudinary storage for identity documents
// const documentStorage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     const isPDF = file.mimetype === "application/pdf";
//     return {
//       folder: "identity-documents",
//       public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
//       resource_type: "auto", // ⚡ auto-detect (handles image/pdf)
//       allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
//       ...(isPDF
//         ? {} // No image transformation for PDFs
//         : {
//             transformation: [
//               { width: 800, height: 800, crop: "limit" },
//               { quality: "auto:best" },
//             ],
//           }),
//     };
//   },
// });

// // ✅ Cloudinary storage for vehicle images (unchanged)
// const carStorage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => ({
//     folder: "vehicles",
//     public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
//     resource_type: "image",
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     transformation: [
//       { width: 800, height: 800, crop: "limit" },
//       { quality: "auto:best" },
//     ],
//   }),
// });

// // ✅ Multer uploader for documents
// const uploadDocument = multer({
//   storage: documentStorage,
//   fileFilter,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for docs
// });

// // ✅ Multer uploader for vehicles
// const vehicleImages = multer({
//   storage: carStorage,
//   fileFilter: (req, file, cb) => {
//     if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
//     else cb(new Error("Only image files are allowed for vehicles!"), false);
//   },
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
// }).fields([
//   { name: "mainImage", maxCount: 1 },
//   { name: "supportingImages", maxCount: 10 },
// ]);

// export { uploadDocument, vehicleImages };

// @ts-nocheck
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinaryModule from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudinary = cloudinaryModule.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Allowed file types (images + PDF)
const allowedDocTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

// ✅ File filter for documents (images OR PDF)
const fileFilter = (req, file, cb) => {
  if (allowedDocTypes.includes(file.mimetype)) cb(null, true);
  else
    cb(
      new Error('Only JPG, PNG, WEBP images or PDF files are allowed!'),
      false
    );
};

// ✅ Cloudinary storage for identity documents
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    return {
      folder: 'identity-documents',
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
      resource_type: 'auto', // ⚡ auto-detect (handles image/pdf)
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      ...(isPDF
        ? {} // No image transformation for PDFs
        : {
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto:best' },
            ],
          }),
    };
  },
});

// ✅ Cloudinary storage for vehicle images
const carStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'vehicles',
    public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto:best' },
    ],
  }),
});

// ✅ Cloudinary storage for profile photos
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'profile-photos',
    public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // crop around face
      { quality: 'auto:best' },
    ],
  }),
});

// ✅ Cloudinary storage for admin profile photos
const adminProfileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'admin-photos',
    public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // crop around face
      { quality: 'auto:best' },
    ],
  }),
});

// ✅ Multer uploader for documents
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for docs
});

// ✅ Multer uploader for vehicles
const vehicleImages = multer({
  storage: carStorage,
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      cb(null, true);
    else cb(new Error('Only image files are allowed for vehicles!'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'supportingImages', maxCount: 10 },
]);

// ✅ Multer uploader for profile photos
const uploadProfilePhoto = multer({
  storage: profileStorage,
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      cb(null, true);
    else
      cb(
        new Error('Only JPG, PNG, WEBP images are allowed for profile photos!'),
        false
      );
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

//multer upload for admin profile photos
const uploadAdminProfilePhoto = multer({
  storage: adminProfileStorage,
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      cb(null, true);
    else
      cb(
        new Error('Only JPG, PNG, WEBP images are allowed for profile photos!'),
        false
      );
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

export {
  uploadDocument,
  vehicleImages,
  uploadProfilePhoto,
  uploadAdminProfilePhoto,
};
