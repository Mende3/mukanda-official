import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerificationCodeDto {
    @IsNotEmpty()
    @IsString()
    @Length(6, 6)
    code: string;
}