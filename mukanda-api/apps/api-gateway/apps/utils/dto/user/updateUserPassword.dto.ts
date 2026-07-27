import { ApiProperty } from "@nestjs/swagger";
import { IsStrongPassword } from "class-validator";

export class UpdateUserPasswordDto {
    
    @ApiProperty({ example: 'oldpassword'})
    @IsStrongPassword()
    oldPass: string;

    @ApiProperty({ example: 'newpassword'})
    @IsStrongPassword()
    newPass: string;

}