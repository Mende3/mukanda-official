import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsStrongPassword,
    MinLength,
} from 'class-validator'

export class RegisterUserDemoDto {
    @ApiProperty({example: 'user@email.com'})
    @IsEmail()
    email: string;

    @ApiProperty({example: 'name'})
    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @ApiProperty({example: 'password'})
    @IsNotEmpty()
    @IsStrongPassword(undefined, {
        message: 'A senha deve conter pelo menos 1 letra maiúscula, 1 número e 1 símbolo (!@#$%^&*)'
    })
    password: string;
}