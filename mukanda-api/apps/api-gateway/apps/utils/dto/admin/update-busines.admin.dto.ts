import { IsString, IsOptional, IsBoolean, IsInt } from "class-validator";
// update-agent.dto.ts
export class UpdateAgentAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  personality?: string;

  @IsOptional()
  @IsString()
  pollTrigger?: string;

  @IsOptional()
  @IsInt()
  pollMinInterval?: number;
}

// update-custom-agent.dto.ts — CUSTOM é 100% flexível
export class UpdateCustomAgentAdminDto extends UpdateAgentAdminDto {
  @IsOptional()
  @IsString()
  webhook?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}