'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Building2,
  Shield,
  Bell,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

const BUSINESS_TYPES = [
  'Hair Salon', 'Barber Shop', 'Aesthetics Clinic', 'Nail Salon',
  'Beauty Spa', 'Tattoo Studio', 'Massage Therapy', 'Lash & Brow Studio', 'Other',
];

const tabs = [
  { id: 'profile',  label: 'Profile',  icon: User },
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const { profile, updateProfile, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    email: profile?.email ?? user?.email ?? '',
    phone: profile?.phone ?? '',
  });

  const [businessForm, setBusinessForm] = useState({
    business_name: profile?.business_name ?? '',
    business_type: profile?.business_type ?? '',
  });

  const [notifForm, setNotifForm] = useState({
    email_notifications: profile?.email_notifications ?? true,
    campaign_notifications: profile?.campaign_notifications ?? true,
    review_notifications: profile?.review_notifications ?? true,
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const showSuccess = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    const { error } = await updateProfile(profileForm);
    setSaving(false);
    if (error) { setError(error); } else { showSuccess(); }
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    setError('');
    const { error } = await updateProfile(businessForm);
    setSaving(false);
    if (error) { setError(error); } else { showSuccess(); }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError('');
    const { error } = await updateProfile(notifForm);
    setSaving(false);
    if (error) { setError(error); } else { showSuccess(); }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      showSuccess();
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await supabase.auth.admin.deleteUser(user?.id ?? '');
    if (error) {
      setError('Could not delete account. Please contact support.');
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab navigation */}
        <nav className="lg:w-48 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(''); setSaved(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm mb-4">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Changes saved successfully.</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <Card className="border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
                    {profileForm.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{profileForm.full_name || 'Your name'}</div>
                    <div className="text-xs text-gray-400">{profileForm.email}</div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 font-medium text-sm">Full name</Label>
                    <Input
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Your full name"
                      className="h-10 border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 font-medium text-sm">Email address</Label>
                    <Input
                      value={profileForm.email}
                      disabled
                      className="h-10 border-gray-200 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-400">Contact support to change your email address.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 font-medium text-sm">Phone number</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+44 7700 900000"
                      className="h-10 border-gray-200"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'business' && (
            <Card className="border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">Business Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 font-medium text-sm">Business name</Label>
                    <Input
                      value={businessForm.business_name}
                      onChange={(e) => setBusinessForm((p) => ({ ...p, business_name: e.target.value }))}
                      placeholder="Your business name"
                      className="h-10 border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 font-medium text-sm">Business type</Label>
                    <Select
                      value={businessForm.business_type}
                      onValueChange={(v) => setBusinessForm((p) => ({ ...p, business_type: v }))}
                    >
                      <SelectTrigger className="h-10 border-gray-200">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveBusiness}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-900">Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 font-medium text-sm">New password</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                        placeholder="At least 8 characters"
                        className="h-10 border-gray-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 font-medium text-sm">Confirm new password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                        className="h-10 border-gray-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {saving ? 'Updating...' : 'Update password'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-red-700">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Permanently delete your account and all associated data — clients, campaigns, and tracking history. This cannot be undone.
                  </p>
                  <Button
                    onClick={() => setDeleteOpen(true)}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete account
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card className="border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Email notifications</div>
                    <p className="text-xs text-gray-400 mt-0.5">Receive product updates and important account emails.</p>
                  </div>
                  <Switch
                    checked={notifForm.email_notifications}
                    onCheckedChange={(v) => setNotifForm((p) => ({ ...p, email_notifications: v }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Campaign notifications</div>
                    <p className="text-xs text-gray-400 mt-0.5">Get notified when a campaign is sent or completed.</p>
                  </div>
                  <Switch
                    checked={notifForm.campaign_notifications}
                    onCheckedChange={(v) => setNotifForm((p) => ({ ...p, campaign_notifications: v }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Review booster notifications</div>
                    <p className="text-xs text-gray-400 mt-0.5">Get notified when review requests are sent or completed.</p>
                  </div>
                  <Switch
                    checked={notifForm.review_notifications}
                    onCheckedChange={(v) => setNotifForm((p) => ({ ...p, review_notifications: v }))}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all clients, campaigns, and tracking data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
