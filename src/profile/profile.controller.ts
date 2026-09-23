import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileService } from './profile.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('password')
  changePassword(@Req() request: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(
      request.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
