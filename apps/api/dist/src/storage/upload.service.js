"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToR2 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const r2_service_1 = require("./r2.service");
const uploadToR2 = async (file) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    await r2_service_1.r2.send(new client_s3_1.PutObjectCommand({
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
exports.uploadToR2 = uploadToR2;
//# sourceMappingURL=upload.service.js.map