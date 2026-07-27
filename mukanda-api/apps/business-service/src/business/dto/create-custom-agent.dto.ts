import { IsString, IsUrl, IsOptional, IsBoolean, IsInt, Min } from "class-validator";

export class CreateCustomAgentDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUrl()
  webhook: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  personality?: string;

  @IsOptional()
  @IsString()
  pollTrigger?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pollMinInterval?: number;
}