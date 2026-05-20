import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2 } from './r2.service';

export const uploadToR2 = async (file: Express.Multer.File) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));
    return {
        fileName,
        url: `${process.env.R2_PUBLIC_URL}/${fileName}`,
    };
};