import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { MobileService } from '../mobile/mobile.service';

export interface DigitalActionRequest {
  actionId: string;
  userId: string;
  connectorType: 'ANDROID_INTENT' | 'WEB_AUTOMATION' | 'SYSTEM_CALENDAR' | 'COMMUNICATION';
  intent: string;
  parameters: Record<string, any>;
  riskLevel: 'L0_INFORMATIONAL' | 'L1_SUGGESTED' | 'L2_PERMITTED' | 'L3_APPROVAL_REQUIRED' | 'L4_RESTRICTED';
  status: 'CREATED' | 'VALIDATED' | 'AWAITING_APPROVAL' | 'APPROVED' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'REJECTED';
}

@Injectable()
export class DigitalActionOrchestratorService {
  private readonly logger = new Logger(DigitalActionOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mobileService: MobileService,
  ) {}

  /**
   * Universal action state machine enforcing deterministic authorization & execution.
   */
  async processAction(
    userId: string,
    connectorType: DigitalActionRequest['connectorType'],
    intent: string,
    parameters: Record<string, any>,
    deviceId?: string,
  ): Promise<DigitalActionRequest> {
    const actionId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Determine Risk & Policy
    let riskLevel: DigitalActionRequest['riskLevel'] = 'L2_PERMITTED';
    if (intent === 'SEND_COMMUNICATION' || intent === 'EXECUTE_PAYMENT' || intent === 'DELETE_RESOURCE') {
      riskLevel = 'L3_APPROVAL_REQUIRED';
    } else if (intent === 'QUERY_STATUS' || intent === 'READ_DATA') {
      riskLevel = 'L0_INFORMATIONAL';
    }

    let initialStatus: DigitalActionRequest['status'] =
      riskLevel === 'L3_APPROVAL_REQUIRED' ? 'AWAITING_APPROVAL' : 'APPROVED';

    const action: DigitalActionRequest = {
      actionId,
      userId,
      connectorType,
      intent,
      parameters,
      riskLevel,
      status: initialStatus,
    };

    // If approval is required, return pending action contract without executing
    if (action.status === 'AWAITING_APPROVAL') {
      this.logger.log(`Action ${actionId} [${intent}] held for explicit L3 user confirmation.`);
      return action;
    }

    // 2. Execute permitted actions
    try {
      action.status = 'EXECUTING';

      if (connectorType === 'ANDROID_INTENT' && deviceId) {
        await this.mobileService.executeCommand(userId, {
          deviceId,
          commandType: intent,
          payload: parameters,
          requiresConfirmation: false,
        });
      }

      action.status = 'SUCCEEDED';
    } catch (err: any) {
      this.logger.error(`Execution failed for action ${actionId}: ${err.message}`);
      action.status = 'FAILED';
    }

    return action;
  }
}

