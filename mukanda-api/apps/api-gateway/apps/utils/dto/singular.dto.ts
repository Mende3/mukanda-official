import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, Length, MinLength } from 'class-validator';

export class VerificationCodeDto {
    @ApiProperty({example: 'xxxxxx'})
    @IsNotEmpty()
    @IsString()
    @Length(6, 6)
    code: string;
}

export class ForgetPasswordDto {
    @ApiProperty({example: 'user@email.com'})
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({example: 'strongpassword'})
    @IsStrongPassword()
    password: string;
}

export class UpadateUserNameDto {
    @ApiProperty({example: 'name'})
    @IsNotEmpty()
    @MinLength(2)
    name: string;
}
