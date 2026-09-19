import React, { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { Boxes, Sparkles, Building2, Phone, Mail, MapPin, FileText, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { settings, setupBusiness } = useAppState();

  const [formData, setFormData] = useState({
    businessName: settings.businessName || '',
    tagline: settings.tagline || 'Inventory & Billing Management',
    phone: settings.phone || '',
    email: settings.email || '',
    address: settings.address || '',
    city: settings.city || 'Bhopal',
    state: settings.state || 'Madhya Pradesh',
    pincode: settings.pincode || '462011',
    gstin: settings.gstin || '',
    pan: settings.pan || '',
    defaultTaxRate: settings.defaultTaxRate || 18,
    bankName: settings.bankName || 'HDFC Bank Ltd',
    accountNumber: settings.accountNumber || '',
    ifscCode: settings.ifscCode || '',
    upiId: settings.upiId || '',
  });

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim()) {
      setError('Please enter your business or company name');
      return;
    }

    setupBusiness({
      ...formData,
      businessName: formData.businessName.trim(),
      gstin: formData.gstin.trim().toUpperCase(),
      pan: formData.pan.trim().toUpperCase(),
    });

    onClose();
  };

  const handleSkip = () => {
    setupBusiness({
      businessName: formData.businessName.trim() || 'My Business',
      isConfigured: true,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[999] overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-left relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-none flex items-center justify-center shadow-inner">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Initial Setup
              </span>
              <h2 className="text-xl font-black tracking-tight">Welcome to StockIN</h2>
            </div>
          </div>
          <p className="text-xs text-blue-100 mt-1 max-w-md">
            Configure your business profile to start managing warehouse inventory, issuing GST invoices, and tracking customer payments.
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Business / Store Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => {
                  setFormData({ ...formData, businessName: e.target.value });
                  setError('');
                }}
                placeholder="e.g. Acme Enterprise & Co."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@business.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Billing Street Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Plot/Shop No, Street, Commercial Area"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="23AABCV9812M1Z8"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PAN (Optional)</label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                placeholder="AABCV9812M"
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Skip & explore first
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <span>Complete Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
