import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { MembersService } from './members.service';

/**
 * `GroupMemberGuard` est posée **route par route** plutôt que sur la classe :
 * presque tout ici suppose un groupe, mais pas l'édition de son propre profil —
 * on doit pouvoir corriger son email juste après l'inscription.
 */
@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /** Déclarée avant `:id` : Nest résout les routes dans l'ordre. */
  @Patch('me')
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser('id') memberId: string,
  ) {
    return this.membersService.updateProfile(memberId, dto);
  }

  @Get()
  @UseGuards(GroupMemberGuard)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.findAllInGroup(user.groupId!);
  }

  @Patch('me/push-token')
  @UseGuards(GroupMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePushToken(
    @Body() dto: UpdatePushTokenDto,
    @CurrentUser('id') memberId: string,
  ) {
    return this.membersService.updatePushToken(memberId, dto.pushToken);
  }

  /**
   * Déclarée **avant** `:id` : Nest résout les routes dans l'ordre, et
   * `ParseUUIDPipe` rejetterait « me » avec un 400.
   */
  @Delete('me')
  @UseGuards(GroupMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.leaveGroup(user.id, user.groupId!);
  }

  @Patch(':id/role')
  @UseGuards(GroupMemberGuard, AdminGuard)
  setRole(
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membersService.setRole(
      targetId,
      user.id,
      user.groupId!,
      dto.role,
    );
  }

  @Delete(':id')
  @UseGuards(GroupMemberGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membersService.removeFromGroup(
      targetId,
      user.id,
      user.groupId!,
    );
  }
}
