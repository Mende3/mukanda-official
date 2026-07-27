import { 
    IsEmail,
    IsNotEmpty,
} from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDemoDto {
    @ApiProperty({ example: 'user@email.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsNotEmpty()
    password: string;
}