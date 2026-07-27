import { MyRedisModule } from '@app/redis';
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
    imports: [MyRedisModule],
    providers: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}
