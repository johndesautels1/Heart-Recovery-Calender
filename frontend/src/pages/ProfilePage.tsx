import React, { useState, useRef } from 'react';
import { GlassCard, Button, Input } from '../components/ui';
import { User, Mail, Phone, Heart, Stethoscope, Lock, Save, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phoneNumber: user?.phoneNumber || '',
    emergencyContact: user?.emergencyContact || '',
    emergencyPhone: user?.emergencyPhone || '',
    doctorName: user?.doctorName || '',
    doctorPhone: user?.doctorPhone || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedUser = await api.updateProfile(formData);
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      emergencyContact: user?.emergencyContact || '',
      emergencyPhone: user?.emergencyPhone || '',
      doctorName: user?.doctorName || '',
      doctorPhone: user?.doctorPhone || '',
    });
    setIsEditing(false);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        try {
          const updatedUser = await api.updateProfile({ profilePhoto: base64String });
          updateUser(updatedUser);
          toast.success('Profile photo updated successfully!');
        } catch (error: any) {
          console.error('Error uploading photo:', error);
          toast.error(error.response?.data?.error || 'Failed to upload photo');
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing photo:', error);
      toast.error('Failed to process photo');
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Profile Settings</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="primary">
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <GlassCard>
          <div className="p-6 text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handlePhotoClick}
              >
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-white" />
                )}
              </div>
              <button
                onClick={handlePhotoClick}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors"
                style={{ boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)' }}
              >
                {isUploadingPhoto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink-bright)' }}>
              {user?.name}
            </h2>
            <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
              {user?.email}
            </p>
            <div className="mt-4 inline-block px-4 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: user?.role === 'admin' ? 'rgba(147, 51, 234, 0.2)' :
                                user?.role === 'therapist' ? 'rgba(34, 197, 94, 0.2)' :
                                'rgba(59, 130, 246, 0.2)',
                color: user?.role === 'admin' ? '#a855f7' :
                      user?.role === 'therapist' ? '#22c55e' :
                      '#3b82f6'
              }}
            >
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </div>
          </div>
        </GlassCard>

        {/* Profile Information Form */}
        <div className="lg:col-span-2">
          <GlassCard>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--ink-bright)' }}>
                Personal Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Full Name
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    icon={<User className="h-5 w-5" />}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Phone Number
                  </label>
                  <Input
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="(555) 123-4567"
                    icon={<Phone className="h-5 w-5" />}
                  />
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--ink-bright)' }}>
                    <Heart className="h-5 w-5 text-red-500" />
                    Emergency Contact
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        Contact Name
                      </label>
                      <Input
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="Emergency contact name"
                        icon={<User className="h-5 w-5" />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        Contact Phone
                      </label>
                      <Input
                        name="emergencyPhone"
                        value={formData.emergencyPhone}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="(555) 123-4567"
                        icon={<Phone className="h-5 w-5" />}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--ink-bright)' }}>
                    <Stethoscope className="h-5 w-5 text-green-500" />
                    Healthcare Provider
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        Doctor Name
                      </label>
                      <Input
                        name="doctorName"
                        value={formData.doctorName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="Dr. Smith"
                        icon={<Stethoscope className="h-5 w-5" />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        Doctor Phone
                      </label>
                      <Input
                        name="doctorPhone"
                        value={formData.doctorPhone}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="(555) 123-4567"
                        icon={<Phone className="h-5 w-5" />}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3 mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <Button
                    onClick={handleSave}
                    loading={isSaving}
                    variant="success"
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="secondary"
                    className="flex-1"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Account Security */}
          <GlassCard className="mt-6">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ink-bright)' }}>
                <Lock className="h-5 w-5 text-yellow-500" />
                Account Security
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--ink)' }}>Email Address</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{user?.email}</p>
                  </div>
                  <Mail className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--ink)' }}>Password</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>••••••••</p>
                  </div>
                  <Lock className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                </div>
                <p className="text-sm text-center pt-2" style={{ color: 'var(--muted)' }}>
                  Contact support to change your email or password
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
