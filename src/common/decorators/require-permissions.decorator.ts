import { SetMetadata } from '@nestjs/common';
import { Action } from '../enums/action.enum';
import { RBAC_PERMISSIONS_KEY } from '../constants/rbac.constants';

export const RequirePermissions = (...actions: Action[]) =>
  SetMetadata(RBAC_PERMISSIONS_KEY, actions);
