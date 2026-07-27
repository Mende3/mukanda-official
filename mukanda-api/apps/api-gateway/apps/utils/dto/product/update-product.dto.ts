import { PartialType } from '@nestjs/swagger'
import { CreateProductDto } from './create-product.dto'
import { OmitType } from '@nestjs/swagger'

// Omite campos que não fazem sentido actualizar via PATCH /products/:id
// A imagem é gerida exclusivamente via PATCH /upload/products/:id/image
// O stock é gerido via PATCH /products/:id/stock
export class UpdateProductDto extends PartialType(
    OmitType(CreateProductDto, ['initialStock', 'minQuantity', 'aiSuggested'] as const),
) {}