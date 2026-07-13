import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2 } from './r2.service';

const publicUrlBase = () => (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

/// Derives the R2 object key from a stored public/derived file URL.
export const keyFromUrl = (fileUrl: string) => fileUrl.replace(`${publicUrlBase()}/`, '');

/// Returns a short-lived presigned GET URL so receipts are not served from a
/// permanent public URL. Requires the bucket to be private to actually restrict access.
export const getSignedFileUrl = async (fileUrl: string, expiresIn = 3600) => {
    const key = keyFromUrl(fileUrl);
    return getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }),
        { expiresIn },
    );
};

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