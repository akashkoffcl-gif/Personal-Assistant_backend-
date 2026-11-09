import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
} from 'class-validator';
import { FinanceAccountType, TransactionType } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(FinanceAccountType)
  @IsOptional()
  type?: FinanceAccountType;

  @IsNumber()
  @IsOptional()
  initialBalance?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(FinanceAccountType)
  @IsOptional()
  type?: FinanceAccountType;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class CreateTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  date: string; // "YYYY-MM-DD"

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}

export class UpdateTransactionDto {
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  month: string; // "YYYY-MM"

  @IsNumber()
  @Min(1)
  allocatedAmount: number;
}

export class UpdateBudgetDto {
  @IsNumber()
  @Min(1)
  allocatedAmount: number;
}

export class CreateSavingsGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  targetAmount: number;

  @IsNumber()
  @IsOptional()
  initialAmount?: number;

  @IsString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class ContributeSavingsGoalDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class CreateRecurringDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsString()
  @IsNotEmpty()
  nextDate: string;

  @IsBoolean()
  @IsOptional()
  isSubscription?: boolean;
}

