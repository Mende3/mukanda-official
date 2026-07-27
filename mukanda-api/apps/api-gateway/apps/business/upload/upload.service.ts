import {
    Injectable,
    Logger,
    OnModuleInit,
    BadRequestException,
    UnsupportedMediaTypeException,
    NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
    IMAGE_MAGIC_BYTES,
    buildProductImageKey,
    buildRuleFlyerKey,
    buildLogoKey,
    POSSIBLE_EXTENSIONS,
} from './upload.config'
import { extname } from 'path'

// Duração padrão das presigned URLs (em segundos)
const SIGNED_URL_TTL = 60 * 60 // 1 hora

@Injectable()
export class UploadService implements OnModuleInit {
    private readonly logger = new Logger(UploadService.name)
    private s3: S3Client
    private bucketName: string

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.bucketName = this.configService.getOrThrow<string>('R2_BUCKET')

        this.s3 = new S3Client({
            endpoint: this.configService.getOrThrow<string>('R2_ENDPOINT'),
            credentials: {
                accessKeyId: this.configService.getOrThrow<string>('R2_ACCESS_KEY'),
                secretAccessKey: this.configService.getOrThrow<string>('R2_SECRET_KEY'),
            },
            region: 'auto',
        })
    }

    // Public URL
    getPublicUrl (key: string): string {
        return `${this.configService.get('R2_PUBLIC_URL')}/${key}`;
    }

    // ─── Presigned URL ────────────────────────────────────────────────────────

    /**
     * Gera uma URL assinada temporária para acesso privado a um objecto no R2.
     * O bucket NÃO precisa de ser público — o acesso é controlado por esta URL.
     *
     * TTL padrão: 1 hora. Passar `ttlSeconds` para customizar.
     */
    async getSignedUrl(key: string, ttlSeconds = SIGNED_URL_TTL): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        })
        return getSignedUrl(this.s3, command, { expiresIn: ttlSeconds })
    }

    // ─── Upload ───────────────────────────────────────────────────────────────

    /**
     * Faz upload da imagem de um produto para o R2.
     * Se já existir uma imagem anterior para o mesmo productId, apaga-a primeiro
     * (mesmo que a extensão tenha mudado — ex: .png → .jpg).
     *
     * Retorna a key R2 do ficheiro gravado.
     */
    async uploadProductImage(
        file: Express.Multer.File,
        userEmail: string,
        productId: string,
    ): Promise<string> {
        this.validateMagicBytes(file.buffer, file.mimetype)

        // Apaga imagem anterior (qualquer extensão)
        await this.deleteProductImage(userEmail, productId)

        const key = buildProductImageKey(userEmail, productId, file.originalname)
        await this.putObject(key, file.buffer, file.mimetype)

        this.logger.log(`Produto imagem uploaded: ${key}`)
        return key
    }

    /**
     * Faz upload do flyer de uma regra de campanha para o R2.
     * Substitui o flyer anterior se existir.
     *
     * Retorna a key R2 do ficheiro gravado.
     */
    async uploadRuleFlyer(
        file: Express.Multer.File,
        userEmail: string,
        ruleId: string,
    ): Promise<string> {
        this.validateMagicBytes(file.buffer, file.mimetype)

        // Apaga flyer anterior (qualquer extensão)
        await this.deleteRuleFlyer(userEmail, ruleId)

        const key = buildRuleFlyerKey(userEmail, ruleId, file.originalname)
        await this.putObject(key, file.buffer, file.mimetype)

        this.logger.log(`Rule flyer uploaded: ${key}`)
        return key
    }

    /**
     * Faz upload do logótipo de um negócio para o R2.
     * Substitui o logótipo anterior se existir.
     *
     * Retorna a key R2 do ficheiro gravado.
     */
    async uploadBusinessLogo(
        file: Express.Multer.File,
        userEmail: string,
        businessId: string,
    ): Promise<string> {
        this.validateMagicBytes(file.buffer, file.mimetype)

        // Apaga logótipo anterior (qualquer extensão)
        await this.deleteBusinessLogo(userEmail, businessId)

        const key = buildLogoKey(userEmail, businessId, file.originalname)
        await this.putObject(key, file.buffer, file.mimetype)

        this.logger.log(`Business logo uploaded: ${key}`)
        return key
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    /**
     * Apaga a imagem de um produto.
     * Se a extensão for desconhecida, tenta todas as extensões permitidas.
     */
    async deleteProductImage(
        userEmail: string,
        productId: string,
        extension?: string,
    ): Promise<void> {
        if (extension) {
            const key = buildProductImageKey(userEmail, productId, `file${extension}`)
            await this.safeDeleteObject(key)
            return
        }

        for (const ext of POSSIBLE_EXTENSIONS) {
            const key = buildProductImageKey(userEmail, productId, `file${ext}`)
            if (await this.objectExists(key)) {
                await this.safeDeleteObject(key)
                return
            }
        }

        this.logger.warn(`Nenhuma imagem encontrada para produto ${productId} (${userEmail})`)
    }

    /**
     * Apaga o flyer de uma regra de campanha.
     */
    async deleteRuleFlyer(
        userEmail: string,
        ruleId: string,
        extension?: string,
    ): Promise<void> {
        if (extension) {
            const key = buildRuleFlyerKey(userEmail, ruleId, `file${extension}`)
            await this.safeDeleteObject(key)
            return
        }

        for (const ext of POSSIBLE_EXTENSIONS) {
            const key = buildRuleFlyerKey(userEmail, ruleId, `file${ext}`)
            if (await this.objectExists(key)) {
                await this.safeDeleteObject(key)
                return
            }
        }

        this.logger.warn(`Nenhum flyer encontrado para regra ${ruleId} (${userEmail})`)
    }

    /**
     * Apaga o logótipo de um negócio.
     */
    async deleteBusinessLogo(
        userEmail: string,
        businessId: string,
        extension?: string,
    ): Promise<void> {
        if (extension) {
            const key = buildLogoKey(userEmail, businessId, `file${extension}`)
            await this.safeDeleteObject(key)
            return
        }

        for (const ext of POSSIBLE_EXTENSIONS) {
            const key = buildLogoKey(userEmail, businessId, `file${ext}`)
            if (await this.objectExists(key)) {
                await this.safeDeleteObject(key)
                return
            }
        }

        this.logger.warn(`Nenhum logo encontrado para negócio ${businessId} (${userEmail})`)
    }

    async deleteUserFolder (userEmail: string) {
        if (!userEmail)
            return
        await this.safeDeleteFolder (userEmail);
    }

    /**
     * Apaga um objecto diretamente pela key R2 armazenada na base de dados.
     * Útil quando o `imageKey` está guardado no Prisma e se quer apagar pelo valor exacto.
     */
    async deleteByKey(key: string | null | undefined): Promise<void> {
        if (!key) return
        await this.safeDeleteObject(key)
    }

    // ─── Validação de Magic Bytes ─────────────────────────────────────────────

    /**
     * Valida os magic bytes do buffer do ficheiro (memoryStorage).
     * Lança excepção se o conteúdo real não corresponder ao mimetype declarado.
     *
     * Com memoryStorage não há ficheiro no disco para apagar —
     * o buffer simplesmente é descartado pela GC.
     */
    validateMagicBytes(buffer: Buffer, declaredMimetype: string): void {
        const signatures = IMAGE_MAGIC_BYTES[declaredMimetype]

        if (!signatures) {
            throw new UnsupportedMediaTypeException(
                `Mimetype não suportado: ${declaredMimetype}`,
            )
        }

        const isValid = signatures.some((signature) =>
            signature.every((byte, index) => buffer[index] === byte),
        )

        if (!isValid) {
            throw new BadRequestException(
                'O ficheiro enviado não é uma imagem válida. ' +
                'O conteúdo real não corresponde ao formato declarado.',
            )
        }

        // Verificação extra para WebP: bytes 8-11 devem ser "WEBP"
        if (declaredMimetype === 'image/webp') {
            const webpSignature = [0x57, 0x45, 0x42, 0x50]
            const isWebp = webpSignature.every(
                (byte, i) => buffer[8 + i] === byte,
            )
            if (!isWebp) {
                throw new BadRequestException('O ficheiro não é um WebP válido.')
            }
        }
    }

    // ─── Helpers Privados ─────────────────────────────────────────────────────

    private async putObject(
        key: string,
        body: Buffer,
        contentType: string,
    ): Promise<void> {
        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: body,
                ContentType: contentType,
            }),
        )
    }

    /**
     * Verifica se um objecto existe no R2 via HeadObject.
     * HeadObject não devolve o body — é a forma mais barata de verificar existência.
     */
    async objectExists(key: string): Promise<boolean> {
        try {
            await this.s3.send(
                new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
            )
            return true
        } catch {
            return false
        }
    }

    /**
     * Apaga um objecto sem lançar excepção se não existir.
     * Erros são apenas registados como warning.
     */
    private async safeDeleteObject(key: string): Promise<void> {
        try {
            await this.s3.send(
                new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
            )
            this.logger.log(`Objecto apagado do R2: ${key}`)
        } catch (error) {
            this.logger.warn(`Não foi possível apagar "${key}": ${error.message}`)
        }
    }

    private async safeDeleteFolder (prefix: string): Promise<void> {
       
        try {
            // 1. Lista todos os objetos com o prefixo
            const listed = await this.s3.send(
                new ListObjectsV2Command({
                    Bucket: this.bucketName,
                    Prefix: prefix,
                }),
            );

            if (!listed.Contents || listed.Contents.length === 0) {
                this.logger.warn(`Nenhum objecto encontrado com prefixo: ${prefix}`);
                return;
            }

            await this.s3.send(
                new DeleteObjectsCommand({
                    Bucket: this.bucketName,
                    Delete: {
                        Objects: listed.Contents.map(({Key}) => ({ Key})),
                        Quiet: true,
                    }
                })
            )
            this.logger.log(`Pasta apagada do R2: ${prefix} (${listed.Contents.length} objectos)`);
        } catch (error) {
            this.logger.warn(`Não foi possível apagar pasta "${prefix}": ${error.message}`);
        }

    }
}