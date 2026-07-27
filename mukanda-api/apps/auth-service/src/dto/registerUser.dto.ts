import {
    IsEmail,
    IsNotEmpty,
    IsStrongPassword,
    MinLength,
} from 'class-validator'

export class RegisterUserDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @IsNotEmpty()
    @IsStrongPassword(undefined, {
        message: 'A senha deve conter pelo menos 1 letra maiúscula, 1 número e 1 símbolo (!@#$%^&*)'
    })
    password: string;
}