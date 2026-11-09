import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max, IsDateString, IsUUID } from 'class-validator';
import { GoalType, GoalStatus, Priority } from '@prisma/client';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(GoalType)
  @IsOptional()
  type?: GoalType;

  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(GoalType)
  @IsOptional()
  type?: GoalType;

  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercent?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  isCompleted?: boolean;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class LogGoalProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

