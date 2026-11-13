import React from 'react';
import { Bot, Sparkles, ArrowRight, Mic, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface DashboardAIAssistantCardProps {
  pendingCheckIn?: {
    message: string;
    routineTitle?: string;
    target?: any;
  } | null;
  onOpenCheckIn?: () => void;
  onOpenAIAssistant?: () => void;
  onOpenVoiceAssistant?: () => void;
  assistantName?: string;
}

export const DashboardAIAssistantCard: React.FC<DashboardAIAssistantCardProps> = ({
  pendingCheckIn,
  onOpenCheckIn,
  onOpenAIAssistant,
  onOpenVoiceAssistant,
  assistantName = 'Nova',
}) => {
  return (
    <div className="bg-gradient-to-br from-[#F7F5FC] via-[#FFFFFF] to-[#F7F5FC] border border-[#DAD6E5] rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_-2px_rgba(118,83,214,0.06)] relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7653D6]/10 border border-[#7653D6]/20 text-[#7653D6] flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#7653D6]">
                {assistantName} AI Copilot
              </h2>
              <Badge variant="primary" size="sm">
                Proactive
              </Badge>
            </div>
            <p className="text-xs text-[#202033] font-medium mt-1 leading-relaxed max-w-xl">
              {pendingCheckIn
                ? pendingCheckIn.message
                : `Your schedule is balanced today. Ask me to prioritize tasks, summarize meetings, or log habit completions.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {pendingCheckIn && onOpenCheckIn ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenCheckIn}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Respond
            </Button>
          ) : (
            <>
              {onOpenVoiceAssistant && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenVoiceAssistant}
                  leftIcon={<Mic className="w-3.5 h-3.5 text-[#7653D6]" />}
                  title="Speak with voice assistant"
                >
                  Speak
                </Button>
              )}
              {onOpenAIAssistant && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenAIAssistant}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Ask {assistantName}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
