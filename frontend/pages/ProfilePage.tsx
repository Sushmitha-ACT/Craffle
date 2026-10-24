import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, Shield, Edit2, Key, Trash2, Plus,
  Check, Loader2, Camera, X, Eye, EyeOff, Home, Briefcase,
  CheckCircle2, AlertCircle, Lock, Navigation, ArrowRight
} from 'lucide-react';
import LocationPicker from '../components/LocationPicker';

interface ProfilePageProps {
  user: any;
  token: string | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onUserUpdate: (updatedUser: any) => void;
}

interface AddressItem {
  _id: string;
  name: string;
  recipientName?: string;
  phone?: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  addressType?: 'Home' | 'Work' | 'Other';
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

export default function ProfilePage({ user, token, showToast, onUserUpdate }: ProfilePageProps) {
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profileImage: user?.profileImage || ''
  });

  // Photo upload & preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState<{
    id: string | null;
    name: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    landmark: string;
    city: string;
    state: string;
    pinCode: string;
    addressType: 'Home' | 'Work' | 'Other';
    latitude?: number;
    longitude?: number;
    isDefault: boolean;
  }>({
    id: null,
    name: 'Home',
    recipientName: user?.name || '',
    phone: user?.phone || '',
    addressLine: '',
    landmark: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '',
    addressType: 'Home',
    latitude: 13.0827,
    longitude: 80.2707,
    isDefault: false
  });

  // Keep state in sync with prop
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        profileImage: user.profileImage || ''
      });
    }
  }, [user]);

  // Load profile and addresses on mount
  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [token]);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          profileImage: data.profileImage || ''
        });
        onUserUpdate(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile details:', err);
    }
  };

  const fetchAddresses = async () => {
    if (!token) return;
    setIsFetchingAddresses(true);
    try {
      const res = await fetch('/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setIsFetchingAddresses(false);
    }
  };

  // ==========================================
  // PROFILE PHOTO HANDLERS
  // ==========================================

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image (JPEG, PNG, or WebP).', 'error');
      return;
    }

    // Validate size (5 MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5 MB. Please choose a smaller file.', 'error');
      return;
    }

    // Read and create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!photoPreview || !token) return;
    setIsUploadingPhoto(true);

    try {
      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: photoPreview })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Profile photo updated successfully!', 'success');
        setProfileData(prev => ({ ...prev, profileImage: data.profileImage }));
        onUserUpdate(data.user);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        showToast(data.error || 'Failed to upload photo.', 'error');
      }
    } catch (err) {
      showToast('An error occurred while uploading your photo.', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCancelPhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    setIsRemovingPhoto(true);
    try {
      const res = await fetch('/api/profile/photo', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Profile photo removed.', 'success');
        setProfileData(prev => ({ ...prev, profileImage: '' }));
        onUserUpdate(data.user);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        showToast(data.error || 'Failed to remove photo.', 'error');
      }
    } catch (err) {
      showToast('An error occurred while removing your photo.', 'error');
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  // ==========================================
  // PROFILE DETAILS HANDLER
  // ==========================================

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!profileData.name.trim()) {
      showToast('Name is required.', 'error');
      return;
    }

    if (profileData.phone && !/^[0-9+()-\s]{7,15}$/.test(profileData.phone.trim())) {
      showToast('Please enter a valid phone number.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
          phone: profileData.phone.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        onUserUpdate(data);
        setIsEditing(false);
      } else {
        showToast(data.error || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ==========================================
  // PASSWORD HANDLER
  // ==========================================

  // Calculate simple password strength
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: 'None', color: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score, text: 'Weak', color: 'bg-red-500' };
      case 2:
        return { score, text: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score, text: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score, text: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score, text: 'Weak', color: 'bg-red-500' };
    }
  };

  const passwordStrength = calculatePasswordStrength(passwordForm.newPassword);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (passwordForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Password changed successfully!', 'success');
        setShowPasswordForm(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(data.error || 'Failed to change password.', 'error');
      }
    } catch (err) {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ==========================================
  // ADDRESS HANDLERS
  // ==========================================

  const openAddAddress = () => {
    setAddressForm({
      id: null,
      name: 'Home',
      recipientName: profileData.name || '',
      phone: profileData.phone || '',
      addressLine: '',
      landmark: '',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '',
      addressType: 'Home',
      latitude: 13.0827,
      longitude: 80.2707,
      isDefault: addresses.length === 0
    });
    setShowAddressModal(true);
  };

  const openEditAddress = (addr: AddressItem) => {
    setAddressForm({
      id: addr._id,
      name: addr.name || 'Home',
      recipientName: addr.recipientName || profileData.name || '',
      phone: addr.phone || profileData.phone || '',
      addressLine: addr.addressLine || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      pinCode: addr.pinCode || '',
      addressType: addr.addressType || 'Home',
      latitude: addr.latitude || 13.0827,
      longitude: addr.longitude || 80.2707,
      isDefault: addr.isDefault
    });
    setShowAddressModal(true);
  };

  // GPS reverse geocode
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    setReverseGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setAddressForm(prev => ({ ...prev, latitude, longitude }));

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const street = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const pinCode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';

            setAddressForm(prev => ({
              ...prev,
              addressLine: street || data.display_name?.split(',').slice(0, 2).join(',') || prev.addressLine,
              city: city || prev.city,
              state: state || prev.state,
              pinCode: pinCode || prev.pinCode
            }));
            showToast('Current GPS address captured!', 'success');
          }
        } catch {
          showToast('GPS coordinates captured (geocoding server unavailable).', 'info');
        } finally {
          setReverseGeocoding(false);
        }
      },
      (error) => {
        setReverseGeocoding(false);
        showToast('Error getting location: ' + error.message, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const { id, name, recipientName, phone, addressLine, landmark, city, state, pinCode, addressType, latitude, longitude, isDefault } = addressForm;

    if (!name.trim() || !addressLine.trim() || !city.trim() || !state.trim() || !pinCode.trim()) {
      showToast('Please fill in label, street address, city, state, and PIN code.', 'error');
      return;
    }

    const cleanPin = pinCode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      showToast('Please enter a valid 6-digit Indian PIN code (e.g. 600001).', 'error');
      return;
    }

    setIsSavingAddress(true);
    try {
      const url = id ? `/api/addresses/${id}` : '/api/addresses';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          landmark: landmark.trim(),
          city: city.trim(),
          state: state.trim(),
          pinCode: cleanPin,
          addressType,
          latitude,
          longitude,
          isDefault
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(id ? 'Address updated successfully!' : 'Address added successfully!', 'success');
        fetchAddresses();
        setShowAddressModal(false);
      } else {
        showToast(data.error || 'Failed to save address.', 'error');
      }
    } catch {
      showToast('An error occurred saving address.', 'error');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this address?')) return;

    setDeletingAddressId(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Address removed.', 'success');
        fetchAddresses();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete address.', 'error');
      }
    } catch {
      showToast('An error occurred deleting address.', 'error');
    } finally {
      setDeletingAddressId(null);
    }
  };

  // Set Default Address
  const handleSetDefaultAddress = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Default address updated!', 'success');
        fetchAddresses();
      } else {
        showToast('Failed to set default address.', 'error');
      }
    } catch {
      showToast('An error occurred updating default address.', 'error');
    }
  };

  const role = user?.role || 'CUSTOMER';

  return (
    <div className="w-full px-6 lg:px-10 py-8 transition-colors duration-200">
      
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFile}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* TOP PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center shrink-0 shadow-xs border border-orange-100">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[var(--text)] tracking-tight">My Profile</h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] font-normal mt-1">Manage your personal information, security, and delivery addresses</p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="self-start sm:self-auto flex items-center gap-2 text-sm sm:text-[15px] font-bold text-white bg-[#FF6B35] hover:bg-[#e05621] px-6 py-3 rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer"
          >
            <Edit2 className="w-4.5 h-4.5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* MAIN TWO-COLUMN RESPONSIVE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: AVATAR & ACCOUNT SECURITY (5 of 12 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* PROFILE SUMMARY & AVATAR CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm flex flex-col items-center text-center transition-colors duration-200 relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-[#FF6B35] to-amber-500" />

            {/* AVATAR WITH CAMERA OVERLAY */}
            <div className="relative group my-2">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-orange-100 to-amber-50 cursor-pointer flex items-center justify-center relative transition-transform duration-200 group-hover:scale-105"
                title="Click to change profile photo"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : profileData.profileImage ? (
                  <img src={profileData.profileImage} alt={profileData.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#FEF3C7] text-[#FF6B35] text-4xl font-black">
                    {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                {/* Dark Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1">
                  <Camera className="w-6 h-6" />
                  <span>Change</span>
                </div>
              </div>

              {/* Floating Camera Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[#FF6B35] text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-[#e05621] transition-all cursor-pointer"
                title="Upload Photo"
              >
                <Camera className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* PHOTO PREVIEW SAVE / CANCEL CONTROLS */}
            {photoPreview && (
              <div className="w-full mt-4 p-4 bg-orange-50/80 border border-orange-200 rounded-2xl flex flex-col items-center gap-2.5">
                <p className="text-xs font-bold text-orange-900">New photo selected</p>
                <div className="flex items-center gap-2.5 w-full">
                  <button
                    onClick={handleCancelPhoto}
                    disabled={isUploadingPhoto}
                    className="flex-1 py-2 px-3 border border-orange-200 text-xs font-bold text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePhoto}
                    disabled={isUploadingPhoto}
                    className="flex-1 py-2 px-3 bg-[#FF6B35] text-xs font-bold text-white rounded-xl hover:bg-[#e05621] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Save Photo
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* REMOVE PHOTO BUTTON (if existing photo and not in preview) */}
            {!photoPreview && profileData.profileImage && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isRemovingPhoto}
                className="mt-2 text-xs font-semibold text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors"
              >
                {isRemovingPhoto ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Remove photo
              </button>
            )}

            {/* User Details */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] mt-4 mb-1">
              {profileData.name || 'Craffle User'}
            </h2>
            <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] font-medium mb-3 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-[var(--muted)]" />
              {profileData.email}
            </p>

            {/* Role Badge */}
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase ${
                role === 'ADMIN'
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : role === 'SELLER'
                  ? 'bg-orange-100 text-[#FF6B35] border border-orange-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                <Shield className="w-3.5 h-3.5" />
                {role}
              </span>
            </div>

            <div className="w-full mt-6 pt-5 border-t border-[var(--border)] grid grid-cols-2 gap-4 text-left">
              <div className="bg-[var(--bg-secondary)] p-3.5 sm:p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-[var(--muted)] block">Member Status</span>
                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" /> Verified
                </span>
              </div>
              <div className="bg-[var(--bg-secondary)] p-3.5 sm:p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-[var(--muted)] block">Saved Addresses</span>
                <span className="text-sm font-bold text-[var(--text)] mt-0.5 block">
                  {addresses.length} {addresses.length === 1 ? 'Address' : 'Addresses'}
                </span>
              </div>
            </div>
          </div>

          {/* ACCOUNT SECURITY CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[var(--border)]">
              <h3 className="font-extrabold text-base sm:text-lg text-[var(--text)] tracking-wider flex items-center gap-2.5 uppercase">
                <Key className="w-5 h-5 text-[#FF6B35]" /> Account Security
              </h3>
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="text-sm font-bold text-[#FF6B35] hover:underline"
                >
                  Change Password
                </button>
              )}
            </div>

            {!showPasswordForm ? (
              <div className="p-5 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[var(--text)]">Password Protection</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Keep your account secure with regular updates</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 text-sm font-bold text-[#FF6B35] bg-white rounded-xl shadow-xs border border-orange-200 hover:bg-orange-50 transition-colors cursor-pointer"
                >
                  Update
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4 pt-1">
                {/* Current Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[15px] text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF6B35] pr-10 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[15px] text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF6B35] pr-10 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {passwordForm.newPassword && (
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                        {passwordStrength.text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[15px] text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF6B35] pr-10 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="px-5 py-2.5 border border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="px-6 py-2.5 bg-[#FF6B35] hover:bg-[#e05621] text-sm font-bold text-white rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Save Password'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PERSONAL DETAILS & SAVED ADDRESSES (7 of 12 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* PERSONAL DETAILS CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <h3 className="font-extrabold text-base sm:text-lg text-[var(--text)] tracking-wider flex items-center gap-2.5 uppercase">
                <User className="w-5 h-5 text-[#FF6B35]" /> Personal Details
              </h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-bold text-[#FF6B35] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Editing Mode
                </span>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      required
                      value={profileData.name}
                      onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      placeholder="e.g. Sushi Sharma"
                      className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl text-[15px] font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
                    />
                  ) : (
                    <div className="px-4 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border)]/50 rounded-2xl text-[15px] font-semibold text-[var(--text)]">
                      {profileData.name || <span className="text-[var(--muted)]">Not provided</span>}
                    </div>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl text-[15px] font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
                    />
                  ) : (
                    <div className="px-4 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border)]/50 rounded-2xl text-[15px] font-semibold text-[var(--text)] flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[var(--muted)]" />
                      {profileData.phone || <span className="text-[var(--muted)]">Not provided</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Address (Read-only for security) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Email Address <span className="text-xs font-normal text-[var(--muted)] normal-case">(Primary identifier)</span>
                </label>
                <div className="px-4 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border)]/50 rounded-2xl text-[15px] font-semibold text-[var(--text)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4.5 h-4.5 text-[var(--muted)]" />
                    <span>{profileData.email}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5" /> Read-only
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-2 ml-1">
                  Registered login email cannot be changed directly for account security.
                </p>
              </div>

              {/* Action Buttons in Edit Mode */}
              {isEditing && (
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                        profileImage: user?.profileImage || ''
                      });
                    }}
                    className="px-5 py-2.5 border border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 bg-[#FF6B35] hover:bg-[#e05621] text-sm font-bold text-white rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* SAVED ADDRESSES CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-[var(--text)] tracking-wider flex items-center gap-2.5 uppercase">
                  <MapPin className="w-5 h-5 text-[#FF6B35]" /> Saved Addresses
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Shipping addresses for instant Craffle checkout</p>
              </div>

              <button
                onClick={openAddAddress}
                className="self-start sm:self-auto flex items-center gap-2 text-sm font-bold text-white bg-[#FF6B35] hover:bg-[#e05621] px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add New Address
              </button>
            </div>

            {/* List / Loading / Empty States */}
            {isFetchingAddresses ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)] gap-3">
                <Loader2 className="w-9 h-9 animate-spin text-[#FF6B35]" />
                <span className="text-sm font-bold">Loading your saved addresses...</span>
              </div>
            ) : addresses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 border-2 border-dashed border-[var(--border)] rounded-3xl bg-[var(--bg-secondary)]/30 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mb-3">
                  <MapPin className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-[var(--text)] text-lg">No address saved yet</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm mb-6">
                  Save your home, work, or pickup location to enjoy seamless one-click delivery at checkout.
                </p>
                <button
                  onClick={openAddAddress}
                  className="px-6 py-3 bg-[#FF6B35] hover:bg-[#e05621] text-sm font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5" /> Add Your First Address
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className={`p-6 border rounded-2xl relative transition-all duration-200 ${
                      addr.isDefault
                        ? 'border-orange-300 bg-orange-50/20 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--bg-secondary)]/40 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center shrink-0 mt-0.5 border border-orange-100 shadow-xs">
                          {addr.addressType === 'Work' ? (
                            <Briefcase className="w-6 h-6" />
                          ) : (
                            <Home className="w-6 h-6" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <span className="font-bold text-base sm:text-lg text-[var(--text)]">{addr.name}</span>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase">
                              {addr.addressType || 'Home'}
                            </span>
                            {addr.isDefault && (
                              <span className="bg-orange-100 text-[#FF6B35] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-orange-200 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> Default Address
                              </span>
                            )}
                          </div>

                          {/* Recipient details */}
                          {(addr.recipientName || addr.phone) && (
                            <p className="text-sm font-semibold text-[var(--text)] mb-1">
                              {addr.recipientName} {addr.phone ? `• ${addr.phone}` : ''}
                            </p>
                          )}

                          {/* Full Address */}
                          <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                            {addr.addressLine}
                            {addr.landmark ? `, Landmark: ${addr.landmark}` : ''}
                          </p>
                          <p className="text-sm font-bold text-[var(--text)] mt-1.5">
                            {addr.city}, {addr.state} — <span className="font-mono text-orange-600">{addr.pinCode}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-start mt-2 sm:mt-0">
                        {!addr.isDefault && (
                          <button
                            onClick={() => handleSetDefaultAddress(addr._id)}
                            className="px-3 py-1.5 text-xs font-bold text-[#FF6B35] hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200 cursor-pointer"
                            title="Set as Default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => openEditAddress(addr)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[#FF6B35] hover:bg-[var(--panel)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer"
                          title="Edit Address"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr._id)}
                          disabled={deletingAddressId === addr._id}
                          className="p-2 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-50 cursor-pointer"
                          title="Delete Address"
                        >
                          {deletingAddressId === addr._id ? (
                            <Loader2 className="w-4.5 h-4.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4.5 h-4.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ADD / EDIT ADDRESS MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[var(--panel)] rounded-3xl border border-[var(--border)] shadow-2xl p-6 sm:p-8 relative my-8">
            <button
              onClick={() => setShowAddressModal(false)}
              className="absolute top-5 right-5 text-[var(--text-secondary)] hover:text-[var(--text)] p-1 rounded-lg hover:bg-[var(--bg-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text)]">
                  {addressForm.id ? 'Edit Saved Address' : 'Add New Address'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Provide accurate shipping details for prompt delivery</p>
              </div>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              {/* Address Type & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Address Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.name}
                    onChange={e => setAddressForm({ ...addressForm, name: e.target.value })}
                    placeholder="e.g. Home, Office, Mom's Place"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Address Type
                  </label>
                  <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                    {(['Home', 'Work', 'Other'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddressForm({ ...addressForm, addressType: type })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          addressForm.addressType === type
                            ? 'bg-[#FF6B35] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recipient Name and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={addressForm.recipientName}
                    onChange={e => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                    placeholder="e.g. Sushi"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Street Address / Flat / House <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={reverseGeocoding}
                    className="text-[11px] font-bold text-[#FF6B35] hover:underline flex items-center gap-1"
                  >
                    {reverseGeocoding ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Navigation className="w-3 h-3" />
                    )}
                    Use Live GPS
                  </button>
                </div>
                <textarea
                  required
                  rows={2}
                  value={addressForm.addressLine}
                  onChange={e => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                  placeholder="Flat / Building Name, Street / Road, Area"
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] resize-none"
                />
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Landmark <span className="text-[10px] text-[var(--muted)] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={addressForm.landmark}
                  onChange={e => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  placeholder="e.g. Near Apollo Hospital, Opposite Metro Station"
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                />
              </div>

              {/* City, State, PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="Chennai"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="Tamil Nadu"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressForm.pinCode}
                    onChange={e => setAddressForm({ ...addressForm, pinCode: e.target.value.replace(/\D/g, '') })}
                    placeholder="600001"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] font-mono outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              {/* Set as Default checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="w-4 h-4 text-[#FF6B35] rounded-md border-[var(--border)] focus:ring-orange-500"
                  />
                  <span className="text-xs font-bold text-[var(--text)]">
                    Make this my default shipping address
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-5 py-2.5 border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-6 py-2.5 bg-[#FF6B35] hover:bg-[#e05621] text-xs font-bold text-white rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {isSavingAddress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    addressForm.id ? 'Save Changes' : 'Add Address'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
