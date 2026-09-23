import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('password')
  changePassword(@Req() req: Request & { user: any }, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}