import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  assistantName?: string;

  @IsString()
  @IsOptional()
  geminiApiKey?: string;

  @IsOptional()
  uiContext?: {
    activeTab?: string;
    selectedTaskId?: string;
    selectedProjectId?: string;
    selectedDate?: string;
  };
}

export class ProviderStatusDto {
  status: 'CONNECTED' | 'INVALID_CREDENTIAL' | 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'TIMEOUT' | 'NOT_CONFIGURED';
  model: string;
  source: 'DEVELOPER_API_KEY' | 'GROUNDED_FALLBACK';
  message: string;
  timestamp: string;
}

export class ExecuteActionDto {
  @IsBoolean()
  confirmed: boolean;
}

export class ProposePlanDto {
  @IsString()
  @IsNotEmpty()
  date: string; // "YYYY-MM-DD"

  @IsOptional()
  preferences?: {
    deepWorkFocus?: boolean;
    bufferMinutes?: number;
  };
}

export class ApplyPlanDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;
}

export class PlanWorkflowDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export class ApproveWorkflowDto {
  @IsString()
  @IsOptional()
  confirmedPayloadHash?: string;
}


