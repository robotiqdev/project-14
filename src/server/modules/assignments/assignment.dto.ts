import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AssignTaskDTO {
  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @IsUUID()
  @IsNotEmpty()
  assigneeId!: string;
}

export class ReassignTaskDTO {
  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @IsUUID()
  @IsNotEmpty()
  newAssigneeId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UnassignTaskDTO {
  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
