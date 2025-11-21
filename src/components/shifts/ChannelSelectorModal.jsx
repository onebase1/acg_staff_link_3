import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Mail, MessageCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Channel Selector Modal for Urgent Shift Broadcasts
 * Allows admins to select which notification channels to use
 */
export function ChannelSelectorModal({ 
  isOpen, 
  onClose, 
  enabledChannels, 
  defaultChannels,
  onConfirm,
  staffCount = 0
}) {
  const [selected, setSelected] = useState(new Set(defaultChannels || []));

  const toggleChannel = (channel) => {
    const newSelected = new Set(selected);
    if (newSelected.has(channel)) {
      newSelected.delete(channel);
    } else {
      newSelected.add(channel);
    }
    setSelected(newSelected);
  };

  const channelConfig = {
    sms: {
      icon: MessageSquare,
      label: 'SMS (Twilio)',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-600',
      description: 'Instant delivery, £0.15-£0.30 per message',
      cost: staffCount > 0 ? `~£${(staffCount * 0.20).toFixed(2)}` : null
    },
    email: {
      icon: Mail,
      label: 'Email (Resend)',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-600',
      description: 'Free, detailed info + portal link, 1-5 min delay',
      cost: 'Free'
    },
    whatsapp: {
      icon: MessageCircle,
      label: 'WhatsApp (Meta)',
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-500',
      textColor: 'text-emerald-600',
      description: 'Free, instant, rich formatting',
      cost: 'Free'
    }
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Broadcast Channels</DialogTitle>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Broadcasting to <strong>{staffCount}</strong> eligible staff member{staffCount !== 1 ? 's' : ''}
          </AlertDescription>
        </Alert>

        <div className="space-y-3 py-4">
          {enabledChannels.map(channel => {
            const config = channelConfig[channel];
            const Icon = config.icon;
            const isSelected = selected.has(channel);

            return (
              <div
                key={channel}
                onClick={() => toggleChannel(channel)}
                className={`
                  p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${isSelected 
                    ? `${config.borderColor} ${config.bgColor}` 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-5 h-5 mt-0.5"
                  />
                  <Icon className={`w-5 h-5 mt-0.5 ${config.textColor}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{config.label}</p>
                      {config.cost && (
                        <span className={`text-xs font-semibold ${config.textColor}`}>
                          {config.cost}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selected.size > 1 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900 text-sm">
              Multiple channels selected. Staff will receive notifications via all selected channels simultaneously.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="bg-red-600 hover:bg-red-700"
          >
            Broadcast to {selected.size} Channel{selected.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

