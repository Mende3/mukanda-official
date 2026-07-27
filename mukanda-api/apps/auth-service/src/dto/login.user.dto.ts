import { IsEmail, IsNotEmpty, IsStrongPassword } from "class-validator";

export class LoginUserDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    password: string;
}