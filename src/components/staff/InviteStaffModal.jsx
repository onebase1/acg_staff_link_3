import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, UserPlus, AlertCircle } from "lucide-react";
import { STAFF_ROLES } from "@/constants/staffRoles";

export default function InviteStaffModal({ isOpen, onClose, onInvite }) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: STAFF_ROLES[0].value, // Default to first role (nurse)
    phone: ''
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    
    try {
      await onInvite(formData);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: STAFF_ROLES[0].value, // Reset to first role
        phone: ''
      });
      onClose();
    } catch (error) {
      console.error('Invitation failed:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-600" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Send a professional invitation email to join your agency
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Staff will receive a branded email with a secure setup link. They can complete their profile and upload documents.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                required
                placeholder="Alex"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                required
                placeholder="Basera"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              placeholder="alex.basera@example.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+44 7700 900200"
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({...formData, role: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.icon} {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 text-sm">
              <strong>Multi-Agency Support:</strong> If this staff member already works with another agency on our platform, they'll see both agencies when they log in.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={sending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {sending ? (
                <>Sending Invitation...</>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}