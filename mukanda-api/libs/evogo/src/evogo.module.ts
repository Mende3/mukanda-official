import { Module } from '@nestjs/common';
import { EvogoService } from './evogo.service';
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [EvogoService],
  exports: [EvogoService],
})
export class EvogoModule {}
