import { IsEnum } from 'class-validator';
import { MemberRole } from '../entities/member.entity';

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole)
  role: MemberRole;
}
