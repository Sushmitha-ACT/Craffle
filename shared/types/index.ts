/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN'
}

export enum VerificationStatus {
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum NotificationType {
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_PREPARING = 'ORDER_PREPARING',
  ORDER_OUT_FOR_DELIVERY = 'ORDER_OUT_FOR_DELIVERY',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  NEW_REVIEW = 'NEW_REVIEW',
  SELLER_APPROVED = 'SELLER_APPROVED',
  SELLER_REJECTED = 'SELLER_REJECTED',
  SYSTEM = 'SYSTEM'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string | null;
  role: UserRole;
  isVerified: boolean;
  provider?: 'manual' | 'google';
  googleId?: string;
  avatar?: string;
  createdAt: string;
}

export interface Seller {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  governmentIdType: string;
  governmentIdNumber: string;
  governmentIdImage: string;
  verificationStatus: VerificationStatus;
  verificationScore?: number;
  verificationMessage?: string;
  extractedName?: string;
  verifiedAt?: string;
  uploadedAt?: string;
  reason?: string;
  aadhaarVerified?: boolean;
  aadhaarVerificationReference?: string;
  bankVerified?: boolean;
  bankVerificationReference?: string;
  bankName?: string;
  bankAccountName?: string;
  adminApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankAccount: string;
  ifsc: string;
  category: string;
  rating: number;
  totalReviews?: number;
  latitude: number;
  longitude: number;
  deliveryRadius: number; // in KM
  operatingHours?: string;
  description?: string;
  coverImage?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  description: string;
  images: string[];
  videoUrl?: string;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  stock: number;
  rating?: number;
  totalReviews?: number;
  tags?: string[];
  isVeg?: boolean;
  weight?: string;
  distance?: number;
  deliveryEstimate?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  items: OrderItem[];
  total: number;
  deliveryCharge?: number;
  discount?: number;
  status: OrderStatus;
  fulfillmentMethod: 'DELIVERY' | 'SELF_PICKUP';
  address: string;
  phone: string;
  customerLocation?: { latitude: number; longitude: number };
  sellerLocation?: { latitude: number; longitude: number };
  distanceKm?: number;
  estimatedDelivery?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  productId?: string;
  sellerId: string;
  rating: number;
  comment: string;
  images?: string[];
  sellerReply?: string;
  helpful?: number;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  replies: {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface OTPRecord {
  email: string;
  otp: string;
  expiresAt: string;
}

export interface CommissionRecord {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  totalAmount: number;
  sellerAmount: number;
  adminAmount: number;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sellerId: string;
  sellerName: string;
  stock: number;
  fulfillmentMethod: 'DELIVERY' | 'SELF_PICKUP';
}

