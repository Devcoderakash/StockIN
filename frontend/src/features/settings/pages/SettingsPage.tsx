import React, { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  Building2,
  FileText,
  Percent,
  Bell,
  Palette,
  Users,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

type SettingsTab =
  | 'business'
  | 'invoice'
  | 'tax'
  | 'notifications'
  | 'appearance'
  | 'users'
  | 'danger';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, clearAllData, showToast } = useAppState();
  const { userDisplayName, userEmail } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('business');
  const [formData, setFormData] = useState({ ...settings });
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Notification toggles
  const [stockAlerts, setStockAlerts] = useState(true);
  const [invoiceAlerts, setInvoiceAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Settings & System Preferences"
        subtitle="Configure company details, GST compliance, invoice numbering prefixes, and layout preferences."
        actions={
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 min-w-0">
        {/* Settings Navigation Tabs */}
        <div className="md:col-span-3 flex md:flex-col overflow-x-auto no-scrollbar gap-1.5 md:gap-0 md:space-y-1 pb-1 md:pb-0 min-w-0">
          {[
            { id: 'business', label: 'Business Profile', icon: <Building2 className="w-4 h-4" /> },
            { id: 'invoice', label: 'Invoice & Billing', icon: <FileText className="w-4 h-4" /> },
            { id: 'tax', label: 'GST & Tax Rates', icon: <Percent className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
            { id: 'users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
            { id: 'danger', label: 'Clear All Data', icon: <AlertTriangle className="w-4 h-4 text-rose-500" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`shrink-0 md:shrink md:w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors whitespace-nowrap md:whitespace-normal cursor-pointer min-h-[42px] ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Tab Content (9 Cols) */}
        <div className="md:col-span-9 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs min-w-0">
          {/* 1. Business Profile Tab */}
          {activeTab === 'business' && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Business Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Trade Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 font-mono uppercase font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    className="w-full px-3 py-2 font-mono uppercase font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </form>
          )}

          {/* 2. Invoice & Billing Tab */}
          {activeTab === 'invoice' && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Invoice & Settlement Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-300 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">e.g. INV-, VR-2026-</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Payment Terms</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Footer Note</label>
                <textarea
                  rows={2}
                  value={formData.footerMessage}
                  onChange={(e) => setFormData({ ...formData, footerMessage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <h4 className="font-bold text-slate-800 pt-2 border-t border-slate-100">
                Bank Transfer Details (Printed on Invoice)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                    className="w-full px-3 py-2 font-mono uppercase font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business UPI ID</label>
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </form>
          )}

          {/* 3. GST & Tax Rates */}
          {activeTab === 'tax' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Goods and Services Tax (GST) Slabs
              </h3>
              <p className="text-slate-500">
                Standard Indian GST tax brackets applied automatically across inventory products and line items.
              </p>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {[
                  { slab: '0%', title: 'Exempt / Nil Rated', desc: 'Agricultural produce, books, raw grain' },
                  { slab: '5%', title: '5% GST Slab', desc: 'Essential items, basic ply, packaging materials' },
                  { slab: '12%', title: '12% GST Slab', desc: 'Standard wooden furniture, study desks, chalkboards' },
                  { slab: '18%', title: '18% GST Slab (Default)', desc: 'Office furniture, executive chairs, LED lights, steel racks' },
                  { slab: '28%', title: '28% Luxury / Sin Slab', desc: 'Luxury motorized furnishings, imported fixtures' },
                ].map((item) => (
                  <div key={item.slab} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-8 rounded-lg bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center text-xs border border-blue-100">
                        {item.slab}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Notification Preferences
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Low Stock Threshold Warnings</p>
                    <p className="text-[11px] text-slate-500">Alert when any product falls below minimum stock buffer</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={stockAlerts}
                    onChange={(e) => {
                      setStockAlerts(e.target.checked);
                      showToast('Notification preference updated');
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Overdue Invoice Notifications</p>
                    <p className="text-[11px] text-slate-500">Trigger alert when customer invoice passes due date</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={invoiceAlerts}
                    onChange={(e) => {
                      setInvoiceAlerts(e.target.checked);
                      showToast('Notification preference updated');
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Daily Sales Summary Digest</p>
                    <p className="text-[11px] text-slate-500">Deliver morning snapshot of sales receipts and collection</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={dailySummary}
                    onChange={(e) => {
                      setDailySummary(e.target.checked);
                      showToast('Notification preference updated');
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Theme & Layout Density
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Theme Palette</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border-2 border-blue-600 bg-blue-50/40 cursor-pointer">
                      <p className="font-bold text-blue-950">StockIN Blue (Active)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">High contrast corporate SaaS theme</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed">
                      <p className="font-bold text-slate-700">Dark Mode (Coming Soon)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Commercial light mode is recommended</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block font-semibold text-slate-700 mb-1.5">Table Density</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-blue-600 bg-blue-50/40 flex items-center justify-between">
                      <span className="font-bold text-slate-900">Comfortable (Standard)</span>
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="font-semibold text-slate-600">Compact (Dense Data)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Users & Roles */}
          {activeTab === 'users' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Team Roles & Access Control
              </h3>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {[
                  { name: `${userDisplayName} (You)`, email: userEmail || 'user@business.com', role: 'Business Owner / Super Admin' },
                ].map((user) => (
                  <div key={user.email} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-400">{user.email}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Danger Zone (Clear All Data) */}
          {activeTab === 'danger' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-rose-600 border-b border-slate-100 pb-3">
                Clear All Data & Fresh Start
              </h3>

              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-3">
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">Clear All System Records</h4>
                  <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                    This will permanently delete all stored products, customers, sales invoices, stock movements, and payment records from your browser. Your application will be returned to a completely fresh, clean zero-record state.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={clearAllData}
        title="Confirm Clear All Data"
        message="Are you sure you want to permanently delete all data? All products, customers, stock movements, and invoices will be erased, leaving a completely fresh workspace ready for your business."
        confirmText="Yes, Clear All Data"
      />
    </div>
  );
};
