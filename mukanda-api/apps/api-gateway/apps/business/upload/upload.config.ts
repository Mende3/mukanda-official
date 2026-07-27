import { memoryStorage } from 'multer'
import { RpcException } from '@nestjs/microservices'
import { HttpCode, HttpStatus, Request } from '@nestjs/common'

export const MAX_IMAGE_SIZE_MB = 5;

export const memoryMulterStorage = memoryStorage();

export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export function getPublicUrl(key: string): string {
    return `${R2_PUBLIC_URL}/${key}`;
}

export const imageFileFilter = (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
) => {
    const allowedMimetypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ]
    const allowedExtensions = /\.(jpg|jpeg|png|webp|gif)$/i

    if (!allowedMimetypes.includes(file.mimetype)) {
        return callback(
            new RpcException({
                statusCode: HttpStatus.BAD_REQUEST,
                message:`Tipo de ficheiro não suportado: ${file.mimetype}. ` +
                `Apenas JPEG, PNG, WebP e GIF são permitidos.`
            }),
            false,
        )
    }

    if (!allowedExtensions.test(file.originalname)) {
        return callback(
            new RpcException({
                statusCode: HttpStatus.BAD_REQUEST,
                messge: `Extensão inválida: ${file.originalname}. ` +
                `Extensões permitidas: .jpg, .jpeg, .png, .webp, .gif`,
            }),
            false,
        )
    }

    callback(null, true)
}

export const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/png':  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    'image/gif':  [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // + verificação extra bytes 8-11 = "WEBP"
}

import { extname } from 'path'

export function buildProductImageKey(
    userEmail: string,
    productId: string,
    originalname: string,
): string {
    const ext = extname(originalname).toLowerCase()
    return `${userEmail}/produtos/${productId}_img${ext}`
}

export function buildRuleFlyerKey(
    userEmail: string,
    ruleId: string,
    originalname: string,
): string {
    const ext = extname(originalname).toLowerCase()
    return `${userEmail}/campanhas/${ruleId}_flyer${ext}`
}

export function buildLogoKey(
    userEmail: string,
    businessId: string,
    originalname: string,
): string {
    const ext = extname(originalname).toLowerCase()
    return `${userEmail}/logos/${businessId}_logo${ext}`
}

// ─── Extensões possíveis (para delete sem extensão conhecida) ─────────────────

export const POSSIBLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']