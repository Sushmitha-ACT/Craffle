import React, { useState, useEffect } from 'react';
import { User, Mail, MapPin, Shield, Edit2, Key, Trash2, Plus, Check, Loader2, Navigation, X } from 'lucide-react';
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
  addressLine: string;
  city: string;
  state: string;
  pinCode: string;
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

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Addresses state
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  
  const [addressForm, setAddressForm] = useState<{
    id: string | null;
    name: string;
    addressLine: string;
    city: string;
    state: string;
    pinCode: string;
    latitude?: number;
    longitude?: number;
    isDefault: boolean;
  }>({
    id: null,
    name: '',
    addressLine: '',
    city: '',
    state: '',
    pinCode: '',
    latitude: 12.8456,
    longitude: 80.2265,
    isDefault: false
  });

  // Load profile and addresses on mount
  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [token]);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!profileData.name.trim() || !profileData.email.trim()) {
      showToast('Name and Email are required.', 'error');
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
        body: JSON.stringify(profileData)
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

  // Change Password
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
        setShowPasswordModal(false);
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

  // Get GPS current location and reverse geocode
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
            const address = data.address;
            const fullAddressText = data.display_name || '';
            const cityText = address.city || address.town || address.village || address.suburb || '';
            const stateText = address.state || '';
            const pinCodeText = address.postcode || '';

            setAddressForm(prev => ({
              ...prev,
              addressLine: fullAddressText,
              city: cityText,
              state: stateText,
              pinCode: pinCodeText
            }));
            showToast('Location reverse geocoded successfully!', 'success');
          } else {
            showToast('Coordinates retrieved, but geocoding request failed.', 'info');
          }
        } catch (err) {
          showToast('Failed to contact geocoding server.', 'info');
        } finally {
          setReverseGeocoding(false);
        }
      },
      (error) => {
        setReverseGeocoding(false);
        showToast('Error getting location: ' + error.message, 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Save Address (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const { id, name, addressLine, city, state, pinCode, latitude, longitude, isDefault } = addressForm;
    
    if (!name.trim() || !addressLine.trim() || !city.trim() || !state.trim() || !pinCode.trim()) {
      showToast('Please fill in all address fields.', 'error');
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
        body: JSON.stringify({ name, addressLine, city, state, pinCode, latitude, longitude, isDefault })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(id ? 'Address updated!' : 'Address added!', 'success');
        fetchAddresses();
        setShowAddressModal(false);
      } else {
        showToast(data.error || 'Failed to save address.', 'error');
      }
    } catch (err) {
      showToast('An error occurred saving address.', 'error');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast('Address removed.', 'success');
        fetchAddresses();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete address.', 'error');
      }
    } catch (err) {
      showToast('Error deleting address.', 'error');
    }
  };

  // Set default address
  const handleSetDefaultAddress = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast('Default address updated!', 'success');
        fetchAddresses();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to set default.', 'error');
      }
    } catch (err) {
      showToast('Error setting default address.', 'error');
    }
  };

  // Open address modal for editing
  const openEditAddress = (addr: AddressItem) => {
    setAddressForm({
      id: addr._id,
      name: addr.name,
      addressLine: addr.addressLine,
      city: addr.city,
      state: addr.state,
      pinCode: addr.pinCode,
      latitude: addr.latitude || 12.8456,
      longitude: addr.longitude || 80.2265,
      isDefault: addr.isDefault
    });
    setShowAddressModal(true);
  };

  // Open address modal for adding new
  const openAddAddress = () => {
    setAddressForm({
      id: null,
      name: '',
      addressLine: '',
      city: '',
      state: '',
      pinCode: '',
      latitude: 12.8456,
      longitude: 80.2265,
      isDefault: false
    });
    setShowAddressModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)] transition-colors duration-200">My Profile</h1>
            <p className="text-sm text-[var(--text-secondary)] font-medium transition-colors duration-200">Manage your personal information</p>
          </div>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-xs font-bold text-[#FF6B35] bg-orange-50 px-4 py-2 rounded-full hover:bg-orange-100 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Quick Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm flex flex-col items-center text-center transition-colors duration-200">
            <div className="w-20 h-20 rounded-full bg-[#FEF3C7] text-[#FF6B35] flex items-center justify-center mb-4 text-3xl font-extrabold shadow-sm">
              {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-1 transition-colors duration-200">{profileData.name || 'User'}</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4 transition-colors duration-200">{profileData.email}</p>
            <span className="px-3 py-1 bg-[#E8F8F0] text-[#10B981] text-[10px] font-extrabold rounded-full uppercase tracking-wider">
              {user?.role || 'Customer'}
            </span>
          </div>

          {/* Account Security */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <h3 className="font-bold text-[11px] text-[var(--text)] tracking-wider flex items-center gap-2 mb-6 uppercase transition-colors duration-200">
              <Key className="w-4 h-4 text-[var(--muted)]" /> ACCOUNT SECURITY
            </h3>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors text-left"
            >
              <Key className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-sm font-semibold text-[var(--text)]">Change Password</span>
            </button>
          </div>
        </div>

        {/* Right Column: Profile Form / Saved Addresses */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Personal Details */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <h3 className="font-bold text-[11px] text-[var(--text)] tracking-wider flex items-center gap-2 mb-6 uppercase transition-colors duration-200">
              <User className="w-4 h-4 text-[var(--muted)]" /> PERSONAL DETAILS
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Full Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      className="w-full p-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-semibold text-sm text-[var(--text)]" 
                      value={profileData.name} 
                      onChange={e => setProfileData({...profileData, name: e.target.value})} 
                      required
                    />
                  ) : (
                    <div className="p-3.5 bg-[var(--bg-secondary)] rounded-2xl text-[var(--text)] font-semibold text-sm">
                      {profileData.name || <span className="text-[var(--muted)]">Not provided</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Phone Number</label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      className="w-full p-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-semibold text-sm text-[var(--text)]" 
                      value={profileData.phone} 
                      onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                    />
                  ) : (
                    <div className="p-3.5 bg-[var(--bg-secondary)] rounded-2xl text-[var(--text)] font-semibold text-sm">
                      {profileData.phone || <span className="text-[var(--muted)]">Not provided</span>}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Email Address</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    className="w-full p-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-semibold text-sm text-[var(--text)]" 
                    value={profileData.email} 
                    onChange={e => setProfileData({...profileData, email: e.target.value})} 
                    required
                  />
                ) : (
                  <div className="p-3.5 bg-[var(--bg-secondary)] rounded-2xl text-[var(--text)] font-semibold text-sm">
                    {profileData.email || <span className="text-[var(--muted)]">Not provided</span>}
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-6 flex justify-end gap-3">
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
                    className="px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] font-bold transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-[#FF6B35] hover:bg-[#e05621] text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm flex items-center gap-2"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Saved Addresses */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <h3 className="font-bold text-[11px] text-[var(--text)] tracking-wider flex items-center gap-2 mb-6 uppercase transition-colors duration-200">
              <MapPin className="w-4 h-4 text-[var(--muted)]" /> SAVED ADDRESSES
            </h3>
            
            {isFetchingAddresses ? (
              <div className="flex flex-col items-center justify-center py-8 text-[var(--muted)] gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="text-xs font-semibold">Loading addresses...</span>
              </div>
            ) : addresses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 border border-[var(--border)] rounded-2xl bg-[var(--panel)] text-center mb-4 transition-colors duration-200">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] text-[var(--muted)] flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-[var(--text)] text-sm">No address saved yet</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-[240px]">Add a shipping or delivery address to checkout faster.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((addr) => (
                  <div 
                    key={addr._id} 
                    className="p-4 border border-[var(--border)] rounded-2xl bg-[var(--bg-secondary)]/50 relative group transition-all duration-200 hover:border-[#FF6B35]/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mt-0.5">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-[var(--text)]">{addr.name}</h4>
                            {addr.isDefault && (
                              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">{addr.addressLine}</p>
                          <p className="text-xs text-[var(--muted)] mt-0.5">
                            {addr.city}, {addr.state} - {addr.pinCode}
                          </p>
                          {addr.latitude && addr.longitude && (
                            <p className="text-[10px] text-[var(--muted)] mt-1 font-mono">
                              Coords: {addr.latitude.toFixed(5)}, {addr.longitude.toFixed(5)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {!addr.isDefault && (
                          <button 
                            onClick={() => handleSetDefaultAddress(addr._id)}
                            className="p-1.5 text-xs text-[#FF6B35] font-bold hover:bg-[var(--panel)] rounded-lg transition-all"
                            title="Set Default"
                          >
                            Set Default
                          </button>
                        )}
                        <button 
                          onClick={() => openEditAddress(addr)}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-blue-600 hover:bg-[var(--panel)] rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAddress(addr._id)}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-red-600 hover:bg-[var(--panel)] rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={openAddAddress}
              className="w-full py-3.5 border border-dashed border-[var(--border)] rounded-2xl text-[var(--muted)] font-bold hover:border-[#FF6B35]/30 hover:bg-orange-50/10 hover:text-[#FF6B35] transition-all flex items-center justify-center gap-2 text-sm"
            >
              + Add New Address
            </button>
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--panel)] rounded-3xl border border-[var(--border)] shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[var(--text)] mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#FF6B35]" /> Change Password
            </h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Current Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">New Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingPassword}
                  className="bg-[#FF6B35] hover:bg-[#e05621] text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADDRESS MODAL (ADD / EDIT) */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[var(--panel)] rounded-3xl border border-[var(--border)] shadow-2xl p-6 relative my-8">
            <button 
              onClick={() => setShowAddressModal(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[var(--text)] mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#FF6B35]" /> 
              {addressForm.id ? 'Edit Address' : 'Add New Address'}
            </h3>
            
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Address Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Home, Work"
                    required
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={addressForm.name}
                    onChange={e => setAddressForm({...addressForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">PIN Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 632001"
                    required
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={addressForm.pinCode}
                    onChange={e => setAddressForm({...addressForm, pinCode: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Full Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 12 Gandhi Road"
                  required
                  className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={addressForm.addressLine}
                  onChange={e => setAddressForm({...addressForm, addressLine: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">City</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Vellore"
                    required
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={addressForm.city}
                    onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">State</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tamil Nadu"
                    required
                    className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={addressForm.state}
                    onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                  />
                </div>
              </div>

              {/* Geolocation Coordinate selection helper */}
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-xs text-orange-800 uppercase tracking-wider">Set Exact Coordinates</h4>
                  <p className="text-xs text-orange-600 mt-1">We use coordinates to match you with nearby sellers.</p>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={reverseGeocoding}
                  className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e05621] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  {reverseGeocoding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Locating...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      Use Current Location
                    </>
                  )}
                </button>
              </div>

              {/* Interactive leaflet map picker */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Visual Location Picker</label>
                <LocationPicker 
                  initialLocation={addressForm.latitude && addressForm.longitude ? { lat: addressForm.latitude, lng: addressForm.longitude } : undefined}
                  onLocationSelect={async (lat, lng) => {
                    setAddressForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    
                    // Autofill address fields based on map selection click
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                      if (res.ok) {
                        const data = await res.json();
                        const address = data.address;
                        const fullAddressText = data.display_name || '';
                        const cityText = address.city || address.town || address.village || address.suburb || '';
                        const stateText = address.state || '';
                        const pinCodeText = address.postcode || '';

                        setAddressForm(prev => ({
                          ...prev,
                          addressLine: fullAddressText,
                          city: cityText,
                          state: stateText,
                          pinCode: pinCodeText
                        }));
                      }
                    } catch (err) {
                      console.error('Failed to reverse geocode coordinate:', err);
                    }
                  }}
                />
              </div>

              {/* Default checkbox */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="defaultAddressCheckbox"
                  className="w-4 h-4 text-[#FF6B35] border-gray-300 rounded focus:ring-orange-500"
                  checked={addressForm.isDefault}
                  onChange={e => setAddressForm({...addressForm, isDefault: e.target.checked})}
                />
                <label htmlFor="defaultAddressCheckbox" className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none cursor-pointer">
                  Set as Default Address
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)]">
                <button 
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingAddress}
                  className="bg-[#FF6B35] hover:bg-[#e05621] text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm flex items-center gap-2"
                >
                  {isSavingAddress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Address'
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
