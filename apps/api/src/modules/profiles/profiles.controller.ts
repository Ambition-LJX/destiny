import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../common/dto/auth.types';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/profile.dto';

/**
 * 命盘档案接口。全部需要登录。
 */
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProfileDto) {
    return this.profiles.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.profiles.list(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.profiles.getView(user.userId, id);
  }

  @Get('export/all')
  exportAll(@CurrentUser() user: AuthUser) {
    return this.profiles.exportAll(user.userId);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.profiles.remove(user.userId, id);
    return { deleted: true };
  }
}
