import { Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { 
    ApiOperation,
    ApiBody,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/auth/guards/roles/func.decorator';
import { AuthGuard } from '../../auth/auth/guards/auth/auth.guard';
import { EmailVerifiedGuard } from '../../auth/auth/guards/auth/email.guard';
import { RolesGuard } from '../../auth/auth/guards/roles/role.guard';
import { Role } from '../../auth/auth/guards/roles/role.enum';
import { Post, Req, Body } from '@nestjs/common';
import { CreateProductDto } from '../../utils/dto/product/create-product.dto';
import { firstValueFrom } from 'rxjs';
import { handlerRcpError } from 'apps/api-gateway/utils/rpc-error.handler';
import { UpdateProductDto } from '../../utils/dto/product/update-product.dto';
import { UploadService } from '../upload/upload.service';
import { SkipThrottle } from '@nestjs/throttler';
import { UpdateStockDto } from '../../utils/dto/product/update-stock.dto';
import { UpdateMinStockDto } from '../../utils/dto/product/update-stock-min.dto';

@SkipThrottle({ auth: true, authHour: true })
@UseGuards(AuthGuard, EmailVerifiedGuard, RolesGuard)
@Controller('product')
export class ProductController {
    constructor (
        @Inject('BUSINESS-SERVICE') private readonly businessClient: ClientProxy,
        private readonly uploadService: UploadService,
    ) {}

    @ApiOperation({ summary: 'criar um produto'})
    @ApiBody({ type: CreateProductDto})
    @Roles(Role.User)
    @Post('create')
    async create(
        @Req() req,
        @Body() body: CreateProductDto,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('product-create', {
                    user: req.user,
                    name: body.name,
                    aiSuggested: body.aiSuggested,
                    description: body.description,
                    price: body.price,
                    unit: body.unit,
                    category: body.category,
                    initialStock: body.initialStock,
                    minQuantity: body.minQuantity,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'pegar todos produtos'})
    @Roles(Role.User)
    @Get('findall')
    async findall(
        @Req() req,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('product-findall', {
                    user: req.user,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'pegar um produto'})
    @Roles(Role.User)
    @Get('findone/:id')
    async findone(
        @Req() req,
        @Param('id') productId: string,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('product-findone', {
                    user: req.user,
                    productId: productId,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'atualizar um produto'})
    @ApiBody({ type: UpdateProductDto})
    @Roles(Role.User)
    @Patch('update/:id')
    async update(
        @Req() req,
        @Param('id') productId: string,
        @Body() body: UpdateProductDto,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('product-update', {
                    user: req.user,
                    productId: productId,
                    name: body.name,
                    description: body.description,
                    price: body.price,
                    unit: body.unit,
                    category: body.category,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'deletar um produto'})
    @Roles(Role.User)
    @Delete('delete/:id')
    async delete(
        @Req() req,
        @Param('id') productId: string,
    ) {

        const { email } = req.user
        // 2. Apaga do R2
        await this.uploadService.deleteProductImage(email, productId)

        return firstValueFrom(
            this.businessClient
                .send('product-delete', {
                    user: req.user,
                    productId: productId,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'stock de um produto'})
    @Roles(Role.User)
    @Get('low-stock')
    async getLowStock(
        @Req() req,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('product-low-stock', {
                    user: req.user,
                })
                .pipe(handlerRcpError),
        );
    }

    @ApiOperation({ summary: 'atualizar stock de um produto'})
    @Roles(Role.User)
    @Patch(':id/stock')
    async updateStock(
        @Req() req,
        @Body() body: UpdateStockDto,
        @Param('id') productId: string,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('product-update-stock', {
                    user: req.user,
                    productId,
                    quantity: body.quantity,
                    operation: body.operation
                })
                .pipe(handlerRcpError),
        );
    }
    
    @ApiOperation({ summary: 'atualizar stock min de um produto'})
    @Roles(Role.User)
    @Patch(':id/stock/min')
    async updateMinStock(
        @Req() req,
        @Body() body: UpdateMinStockDto,
        @Param('id') productId: string,
    ) {
        return firstValueFrom(
            this.businessClient
                .send('product-update-min-stock', {
                    user: req.user,
                    productId,
                    minQuantity: body.minQuantity
                })
                .pipe(handlerRcpError),
        );
    }

}
