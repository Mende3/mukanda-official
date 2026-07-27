import {
    Controller,
    Patch,
    Delete,
    Get,
    Param,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    BadRequestException,
    HttpCode,
    HttpStatus,
    Query,
    Inject,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
    ApiTags,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger'
import {
    memoryMulterStorage,
    imageFileFilter,
    MAX_IMAGE_SIZE_MB,
} from './upload.config'
import { ClientProxy } from '@nestjs/microservices'
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard'
import { firstValueFrom } from 'rxjs'
import { UploadService } from './upload.service'


const MULTER_OPTIONS = {
    storage: memoryMulterStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024 },
}


@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('upload')
export class UploadController {

    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
        private readonly uploadService: UploadService,       
    ) {}

    @Patch('product/:id/image')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(FileInterceptor('file', MULTER_OPTIONS))
    async uploadProductImage(
        @Req() req,
        @Param('id') productId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('Nenhum ficheiro enviado.')

        const { email, userId } = req.user

        // 1. Upload para R2 (gateway faz isto directamente)
        const key = await this.uploadService.uploadProductImage(file, email, productId)
        const signedUrl = await this.uploadService.getSignedUrl(key)

        // 2. Persiste a key no business-service via TCP
        await firstValueFrom(
            this.businessClient.send('upload-product-update_image_key', { productId, key, userId })
        )

        return { key, signedUrl, productId, size: file.size, mimetype: file.mimetype }
    }

    @Delete('product/:id/image')
    @HttpCode(HttpStatus.OK)
    async deleteProductImage(@Req() req, @Param('id') productId: string) {
        const { email, userId } = req.user

        // 2. Apaga do R2
        await this.uploadService.deleteProductImage(email, productId)

        // 3. Limpa a key no business-service
        await firstValueFrom(
            this.businessClient.send('upload-product-update_image_key', { productId, key: null, userId })
        )

        return { message: 'Imagem eliminada com sucesso', productId }
    }

    // signed URL não precisa de ir ao business-service — o gateway resolve directamente no R2
    // @Get('products/:id/image/url')
    // async getProductImageUrl(@Req() req, @Param('id') productId: string, @Query('ttl') ttl?: string) {
    //     const { email } = req.user
    //     const ttlSeconds = ttl ? parseInt(ttl, 10) : undefined

    //     const key = await this.findExistingKey((ext) => buildProductImageKey(email, productId, `file${ext}`))
    //     if (!key) throw new BadRequestException(`Nenhuma imagem encontrada para ${productId}`)

    //     const signedUrl = await this.uploadService.getSignedUrl(key, ttlSeconds)
    //     return { key, signedUrl, productId }
    // }

    // ... mesmo padrão para campaigns/rules e businesses/logo

    @Patch('campaign/:id/image')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(FileInterceptor('file', MULTER_OPTIONS))
    async uploadRuleFlyer(
        @Req() req,
        @Param('id') campaignId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('Nenhum ficheiro enviado.')

        const { email, userId } = req.user

        // 1. Upload para R2 (gateway faz isto directamente)
        const key = await this.uploadService.uploadRuleFlyer(file, email, campaignId)
        const signedUrl = await this.uploadService.getSignedUrl(key)

        // 2. Persiste a key no business-service via TCP
        await firstValueFrom(
            this.businessClient.send('upload-campaign-update_image_key', { campaignId, key, userId })
        )

        return { key, signedUrl, campaignId, size: file.size, mimetype: file.mimetype }
    }

    @Delete('campaign/:id/image')
    @HttpCode(HttpStatus.OK)
    async deleteCampaignImage(@Req() req, @Param('id') productId: string) {
        const { email, userId } = req.user

        // 2. Apaga do R2
        await this.uploadService.deleteRuleFlyer(email, productId)

        // 3. Limpa a key no business-service
        await firstValueFrom(
            this.businessClient.send('upload-product-update_image_key', { productId, key: null, userId })
        )

        return { message: 'Imagem eliminada com sucesso', productId }
    }

    @Delete('delete-user-folder')
    @HttpCode(HttpStatus.OK)
    async deleteFolder(@Req() req) {
        const { email, userId } = req.user

        // 2. Apaga do R2
        await this.uploadService.deleteUserFolder(email)
    }


}