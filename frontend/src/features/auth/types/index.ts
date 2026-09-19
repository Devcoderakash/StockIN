/**
 * src/features/auth/types/index.ts
 */

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  businessName: string;
  phone?: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}
