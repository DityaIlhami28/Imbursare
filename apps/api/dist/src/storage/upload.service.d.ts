export declare const uploadToR2: (file: Express.Multer.File) => Promise<{
    fileName: string;
    url: string;
}>;
