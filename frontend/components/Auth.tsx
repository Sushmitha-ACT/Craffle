/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';
import { 
  ShoppingBag, Eye, EyeOff, AlertCircle, CheckCircle2, 
  RefreshCw, ChevronLeft, User, Briefcase, MapPin, Store, FileText
} from 'lucide-react';
import { UserRole } from '@shared/types';
import AddressAutocomplete from './AddressAutocomplete';
import LocationPicker from './LocationPicker';
interface AuthProps {
  onLoginSuccess: (token: string, user: any, seller: any) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password' | 'otp' | 'reset_password';
type RegisterTab = 'customer' | 'seller';

const InputGroup = ({ label, type, value, onChange, placeholder = "", required = true, icon, className = "", rightElement }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-[13px] font-bold text-[var(--text)] pl-1">{label}</label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          {icon}
        </div>
      )}
      <input 
        type={type} 
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[14px] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all ${icon ? 'pl-10' : ''} ${rightElement ? 'pr-10' : ''}`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          {rightElement}
        </div>
      )}
    </div>
  </div>
);

export default function Auth({ onLoginSuccess, showToast }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('register');
  const [registerTab, setRegisterTab] = useState<RegisterTab>('customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Location Map States
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // Seller Fields
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [aadharStep, setAadharStep] = useState(0);
  const [aadharNumber, setAadharNumber] = useState('');
  const [aadharOtp, setAadharOtp] = useState('');
  const [aadharReferenceId, setAadharReferenceId] = useState('');
  const [aadharVerifying, setAadharVerifying] = useState(false);

  const [bankAccount, setBankAccount] = useState('');
  const [bankConfirmAccount, setBankConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankStep, setBankStep] = useState(0);
  const [bankReferenceId, setBankReferenceId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankVerifying, setBankVerifying] = useState(false);

  // OTP Fields
  const [otpCode, setOtpCode] = useState('');
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const setError = (msg: string | null) => { if (msg && showToast) showToast(msg, 'error'); };
  const setSuccess = (msg: string | null) => { if (msg && showToast) showToast(msg, 'success'); };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleGetGPS = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapLat(pos.coords.latitude);
          setMapLng(pos.coords.longitude);
          setIsLocating(false);
          setSuccess('Location grabbed successfully!');
        },
        (err) => {
          console.warn("Geolocation failed", err);
          setError('Failed to get your location. Please check browser permissions or pick on map.');
          setIsLocating(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setIsLocating(false);
    }
  };

  const handleGeocodeAddress = async () => {
    const fullAddress = `${address}, ${city}, ${state} - ${pincode}`.trim();
    if (fullAddress.length < 5) {
      setError('Please enter a valid address first.');
      return;
    }
    setIsLocating(true);
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        setMapLat(Number(geoData[0].lat));
        setMapLng(Number(geoData[0].lon));
        setSuccess('Address located on map!');
      } else {
        setError('Could not find this exact address on the map. Please try a broader address or place the pin manually.');
      }
    } catch (err) {
      console.warn('Geocoding search failed', err);
      setError('Failed to search address. Please drop the pin manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.unverified) {
          setOtpTargetEmail(data.email);
          setMode('otp');
          setResendCooldown(60);
          throw new Error('Your email is unverified. Please verify using the OTP sent to your mailbox.');
        }
        throw new Error(data.error || 'Login failed');
      }
      setSuccess('Logged in successfully!');
      setTimeout(() => onLoginSuccess(data.token, data.user, data.seller), 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword, role: UserRole.CUSTOMER })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      setSuccess(data.message);
      onLoginSuccess(data.token, data.user, null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (bankAccount !== bankConfirmAccount) {
      setError('Bank account numbers do not match');
      return;
    }
    setLoading(true);
    try {
      const userRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword, role: UserRole.SELLER })
      });
      const userData = await userRes.json();
      if (!userRes.ok) {
        throw new Error(userData.error || 'User creation failed');
      }

      const newlyCreatedUserId = userData?.user?.id || userData?.user?._id;
      if (!newlyCreatedUserId) throw new Error('User registry failure. Please try again.');

      const lat = mapLat || 13.0827;
      const lng = mapLng || 80.2707;

      const sellerRes = await fetch('/api/sellers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newlyCreatedUserId,
          businessName: businessName || name,
          email, 
          phone, 
          address: address || 'Local Address', 
          latitude: lat,
          longitude: lng,
          category: 'Home Maker',
          aadhaarNumber: aadharNumber,
          bankAccount,
          ifsc,
          bankName: bankName || 'Bank',
          bankAccountName: name
        })
      });
      
      const sellerData = await sellerRes.json();
      if (!sellerRes.ok) throw new Error(sellerData.error || 'Seller application submission failed');

      setSuccess('Your seller application has been submitted successfully. Your account is awaiting admin review.');
      
      setTimeout(() => onLoginSuccess(userData.token, userData.user, sellerData.seller), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleVerifyAadhaarSend = async () => {
    if (aadharNumber.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setAadharVerifying(true);
    try {
      const res = await fetch('/api/sellers/verify-aadhaar-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarNumber: aadharNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setAadharReferenceId(data.referenceId);
      setAadharStep(1); // Move to OTP step
      setSuccess('Aadhaar OTP sent!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAadharVerifying(false);
    }
  };

  const handleVerifyAadhaarSubmit = async () => {
    if (aadharOtp.length < 6) {
      setError('Please enter the OTP');
      return;
    }
    setAadharVerifying(true);
    try {
      const res = await fetch('/api/sellers/verify-aadhaar-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: aadharOtp, referenceId: aadharReferenceId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      setAadharStep(2); // Verified
      setSuccess('Aadhaar Verified Successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAadharVerifying(false);
    }
  };

  const handleVerifyBank = async () => {
    if (!bankAccount || bankAccount !== bankConfirmAccount) {
      setError('Bank accounts do not match');
      return;
    }
    if (!ifsc) {
      setError('IFSC is required');
      return;
    }
    setBankVerifying(true);
    try {
      const res = await fetch('/api/sellers/verify-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: bankAccount, ifsc, expectedName: name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bank Verification Failed');
      
      setBankName(data.bankName);
      setBankAccountName(data.accountHolderName);
      setBankReferenceId(data.referenceId);
      setBankStep(1); // Verified
      setSuccess('Bank Account Verified Successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBankVerifying(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpTargetEmail, otp: otpCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      setSuccess(data.message);
      setTimeout(() => {
        setMode('login');
        setEmail(otpTargetEmail);
        setPassword('');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpTargetEmail, otp: otpCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      setSuccess('OTP verified! Enter your new password.');
      setTimeout(() => setMode('reset_password'), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpTargetEmail, otp: otpCode, newPassword: password, confirmPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reset failed');
      setSuccess(data.message);
      setTimeout(() => {
        setMode('login');
        setEmail(otpTargetEmail);
        setPassword('');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      setSuccess('Reset OTP sent successfully!');
      setOtpTargetEmail(email);
      setResendCooldown(60);
      setOtpCode('');
      setTimeout(() => setMode('verify_reset_otp' as AuthMode), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center p-4 sm:p-8 font-sans text-gray-800">
      <div className="w-full max-w-[560px] mx-auto mt-12 mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-[#3D2314] mb-2 tracking-tight">Join Craffle</h1>
        <p className="text-[#8C4A1D] text-[15px] font-medium">India's Home-Based Creator Marketplace</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[560px]"
      >
        {mode === 'register' && (
          <div className="flex gap-2 mb-6 bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border)]">
            <button
              onClick={() => setRegisterTab('customer')}
              className={`flex-1 py-3 px-4 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${registerTab === 'customer' ? 'bg-[#FF6B35] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel)]'}`}
            >
              <ShoppingBag className="w-4 h-4" /> Register as Customer
            </button>
            <button
              onClick={() => setRegisterTab('seller')}
              className={`flex-1 py-3 px-4 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${registerTab === 'seller' ? 'bg-[#FF6B35] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel)]'}`}
            >
              <Store className="w-4 h-4" /> Register as Seller
            </button>
          </div>
        )}

        <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 shadow-sm border border-[var(--border)] transition-colors duration-200">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Welcome Back</h2>
              <InputGroup label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
              <InputGroup 
                label="Password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter your password" 
                value={password} 
                onChange={(e: any) => setPassword(e.target.value)} 
                rightElement={<button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="w-5 h-5 text-[var(--muted)]"/> : <Eye className="w-5 h-5 text-[var(--muted)]"/>}</button>}
              />
              <div className="flex justify-end -mt-2">
                <button type="button" onClick={() => setMode('forgot_password')} className="text-[#FF6B35] text-sm font-bold hover:underline">Forgot Password?</button>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-bold py-3.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Sign In →'}
              </button>
            </form>
          )}

          {mode === 'register' && registerTab === 'customer' && (
            <form onSubmit={handleRegisterCustomer} className="flex flex-col gap-5">
              <InputGroup label="Full Name" type="text" placeholder="Your full name" value={name} onChange={(e: any) => setName(e.target.value)} />
              <InputGroup label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
              <InputGroup 
                label="Password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Min. 8 chars, 1 uppercase, 1 digit" 
                value={password} 
                onChange={(e: any) => setPassword(e.target.value)} 
                rightElement={<button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>}
              />
              <InputGroup label="Confirm Password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />
              <button type="submit" disabled={loading} className="w-full bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-bold py-3.5 rounded-xl transition-colors mt-4 flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Create Account →'}
              </button>
            </form>
          )}

          {mode === 'register' && registerTab === 'seller' && (
            <form onSubmit={handleRegisterSeller} className="flex flex-col gap-5">
              <InputGroup label="Full Name" type="text" placeholder="Your full name" value={name} onChange={(e: any) => setName(e.target.value)} />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputGroup label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                <InputGroup label="Phone Number" type="tel" placeholder="10-digit mobile" value={phone} onChange={(e: any) => setPhone(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputGroup 
                  label="Password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min. 8 chars, 1 uppercase, 1 digit" 
                  value={password} 
                  onChange={(e: any) => setPassword(e.target.value)} 
                  rightElement={<button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>}
                />
                <InputGroup label="Confirm Password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />
              </div>

              <div className="my-2 border-t border-[#F0E6D8] pt-4">
                <h3 className="text-[#8C4A1D] font-extrabold text-[15px] mb-4">Business Information</h3>
                
                <div className="flex flex-col gap-5">
                  <InputGroup label="Business Name" type="text" placeholder="Your shop / business name" value={businessName} onChange={(e: any) => setBusinessName(e.target.value)} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-[#8C4A1D] pl-1">Address</label>
                    <AddressAutocomplete 
                      initialValue={address} 
                      onSelect={(newAddress, lat, lng) => {
                        setAddress(newAddress);
                        setMapLat(lat);
                        setMapLng(lng);
                      }} 
                    />
                    {mapLat !== null && mapLng !== null && (
                      <LocationPicker 
                        initialLocation={{ lat: mapLat, lng: mapLng }}
                        onLocationSelect={(lat, lng) => {
                          setMapLat(lat);
                          setMapLng(lng);
                        }} 
                      />
                    )}
                  </div>
                  
                  {/* Identity & Bank Information for Manual Review */}
                  <div className="my-2 border-t border-[#F0E6D8] pt-4">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[#8C4A1D] font-extrabold text-[15px]">Identity Information</h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                        Manual Admin Review
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mb-3">
                      Please enter your 12-digit Aadhaar number. This will be securely reviewed by our team during application onboarding.
                    </p>
                    <div className="flex flex-col gap-3">
                      <InputGroup 
                        label="Aadhaar Number" 
                        type="text" 
                        placeholder="Enter 12-digit Aadhaar Number" 
                        value={aadharNumber} 
                        onChange={(e: any) => setAadharNumber(e.target.value.replace(/\D/g, '').slice(0, 12))} 
                      />
                    </div>
                  </div>

                  <div className="my-2 border-t border-[#F0E6D8] pt-4">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[#8C4A1D] font-extrabold text-[15px]">Bank Account Information</h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                        Manual Admin Review
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mb-3">
                      Payout account details for order settlements, verified by our administrator prior to account activation.
                    </p>
                    <div className="flex flex-col gap-3">
                      <InputGroup 
                        label="Bank Account Number" 
                        type="text" 
                        placeholder="Enter bank account number" 
                        value={bankAccount} 
                        onChange={(e: any) => setBankAccount(e.target.value.trim())} 
                      />
                      <InputGroup 
                        label="Confirm Bank Account" 
                        type="text" 
                        placeholder="Re-enter bank account number" 
                        value={bankConfirmAccount} 
                        onChange={(e: any) => setBankConfirmAccount(e.target.value.trim())} 
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InputGroup 
                          label="Bank Name" 
                          type="text" 
                          placeholder="e.g. State Bank of India, HDFC" 
                          value={bankName} 
                          onChange={(e: any) => setBankName(e.target.value)} 
                        />
                        <InputGroup 
                          label="IFSC Code" 
                          type="text" 
                          placeholder="e.g. SBIN0001234" 
                          value={ifsc} 
                          onChange={(e: any) => setIfsc(e.target.value.toUpperCase().trim())} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" /> Application Notice
                </p>
                <p>
                  Your seller account starts in <span className="font-bold">PENDING</span> status upon registration. A Craffle administrator will manually review your business, identity, and payout details before granting seller permissions.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={loading || !aadharNumber || aadharNumber.length !== 12 || !bankAccount || bankAccount !== bankConfirmAccount || !ifsc} 
                className="w-full bg-[#FF6B35] hover:bg-[#E65A2A] disabled:bg-[#FFB59A] disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Submit Seller Application →'}
              </button>
            </form>
          )}

          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5 items-center text-center">
              <h2 className="text-2xl font-bold text-[#3D2314] mb-2">Verify Email</h2>
              <p className="text-[#8C4A1D] text-[14px] mb-4">Enter the 6-digit code sent to <b>{otpTargetEmail}</b></p>
              
              <input 
                type="text" 
                maxLength={6} 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="text-4xl tracking-[0.3em] text-center w-full max-w-[280px] border-b-2 border-gray-300 focus:border-[#FF6B35] outline-none pb-2 font-mono text-[#3D2314] bg-transparent"
                placeholder="000000"
                autoFocus
              />

              <div className="mt-6 text-sm text-[#8C4A1D]">
                {resendCooldown > 0 ? (
                  <span>Resend code in <strong className="font-bold">{resendCooldown}s</strong></span>
                ) : (
                  <button type="button" onClick={() => setMode('forgot_password')} className="text-[#FF6B35] font-bold hover:underline">Resend code</button>
                )}
              </div>
              
              <div className="w-full flex justify-between mt-8">
                <button type="button" onClick={() => setMode('login')} className="text-[#8C4A1D] font-bold hover:underline px-4 py-2">Back</button>
                <button type="submit" disabled={loading || otpCode.length !== 6} className="bg-[#FF6B35] hover:bg-[#E65A2A] disabled:bg-orange-300 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
                  {loading && <RefreshCw className="w-5 h-5 animate-spin" />} Verify
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
              <h2 className="text-2xl font-bold text-[#3D2314] mb-2">Account Recovery</h2>
              <p className="text-[#8C4A1D] text-[14px] mb-4">Get a verification code sent to your email to reset your password.</p>
              <InputGroup label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
              
              <div className="w-full flex justify-between mt-6">
                <button type="button" onClick={() => setMode('login')} className="text-[#8C4A1D] font-bold hover:underline px-4 py-2">Cancel</button>
                <button type="submit" disabled={loading} className="bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
                  {loading && <RefreshCw className="w-5 h-5 animate-spin" />} Send Code
                </button>
              </div>
            </form>
          )}

          {mode === 'verify_reset_otp' && (
            <form onSubmit={handleVerifyResetOtp} className="flex flex-col gap-5 items-center text-center">
              <h2 className="text-2xl font-bold text-[#3D2314] mb-2">Reset Password</h2>
              <p className="text-[#8C4A1D] text-[14px] mb-4">Enter the 6-digit code sent to <b>{otpTargetEmail}</b></p>
              
              <input 
                type="text" 
                maxLength={6} 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="text-4xl tracking-[0.3em] text-center w-full max-w-[280px] border-b-2 border-gray-300 focus:border-[#FF6B35] outline-none pb-2 font-mono text-[#3D2314] bg-transparent"
                placeholder="000000"
                autoFocus
              />

              <div className="mt-6 text-sm text-[#8C4A1D]">
                {resendCooldown > 0 ? (
                  <span>Resend code in <strong className="font-bold">{resendCooldown}s</strong></span>
                ) : (
                  <button type="button" onClick={() => handleForgotPassword(new Event('submit') as any)} className="text-[#FF6B35] font-bold hover:underline">Resend code</button>
                )}
              </div>
              
              <div className="w-full flex justify-between mt-8">
                <button type="button" onClick={() => setMode('forgot_password')} className="text-[#8C4A1D] font-bold hover:underline px-4 py-2">Back</button>
                <button type="submit" disabled={loading || otpCode.length !== 6} className="bg-[#FF6B35] hover:bg-[#E65A2A] disabled:bg-orange-300 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
                  {loading && <RefreshCw className="w-5 h-5 animate-spin" />} Verify
                </button>
              </div>
            </form>
          )}

          {mode === 'reset_password' && (
            <form onSubmit={handleResetPasswordComplete} className="flex flex-col gap-5">
              <h2 className="text-2xl font-bold text-[#3D2314] mb-2">Create New Password</h2>
              
              <InputGroup 
                label="New Password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Min. 8 chars" 
                value={password} 
                onChange={(e: any) => setPassword(e.target.value)} 
                rightElement={<button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button>}
              />
              <InputGroup label="Confirm New Password" type="password" placeholder="Repeat new password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />
              
              <div className="w-full flex justify-between mt-6">
                <button type="button" onClick={() => setMode('login')} className="text-[#8C4A1D] font-bold hover:underline px-4 py-2">Cancel</button>
                <button type="submit" disabled={loading} className="bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
                  {loading && <RefreshCw className="w-5 h-5 animate-spin" />} Reset Password
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {mode !== 'otp' && mode !== 'forgot_password' && (
        <div className="mt-8 text-center text-[#8C4A1D] font-medium text-[15px]">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => setMode('register')} className="text-[#FF6B35] font-bold hover:underline ml-1">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('login')} className="text-[#FF6B35] font-bold hover:underline ml-1">Sign in</button></>
          )}
        </div>
      )}
    </div>
  );
}
