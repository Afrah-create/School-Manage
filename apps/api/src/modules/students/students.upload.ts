import multer from "multer";
import path from "path";
import { tenantUploadDir, uploadRootDir } from "../../utils/tenantUploads.js";

const maxMb = Number(process.env.MAX_FILE_SIZE_MB ?? 2);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      cb(null, tenantUploadDir(req, "students"));
    } catch (e) {
      cb(e instanceof Error ? e : new Error(String(e)), "");
    }
  },
  filename: (req, file, cb) => {
    const id = req.params["id"] ?? "unknown";
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${id}${ext}`);
  },
});

export const studentPhotoUpload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      cb(new Error("Only JPEG and PNG images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const studentCsvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".csv", ".txt"].includes(ext)) {
      cb(new Error("Only CSV files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function getUploadRoot(): string {
  return uploadRootDir();
}
