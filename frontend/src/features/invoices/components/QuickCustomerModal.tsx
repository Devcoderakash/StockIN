import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useAppState } from '@/context/AppStateContext';

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customerId: string) => void;
}

export const QuickCustomerModal: React.FC<QuickCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const { addCustomer } = useAppState();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    gstin: '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() && !formData.companyName.trim()) {
      setError('Please provide at least a contact name or company name');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Contact phone number is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const createdCustomer = await addCustomer({
        name: formData.name.trim() || formData.companyName.trim(),
        companyName: formData.companyName.trim() || formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || 'info@client.com',
        address: formData.address.trim() || 'Commercial Market',
        city: formData.city.trim() || 'Bhopal',
        state: formData.state.trim() || 'Madhya Pradesh',
        gstin: formData.gstin.trim() || '23AAAAA0000A1Z5',
        status: 'active',
      });

      if (createdCustomer?.id) {
        onCustomerCreated(createdCustomer.id);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create customer';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Customer"
      description="Create a new customer account directly from billing."
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? 'Creating...' : 'Create Customer'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {error && <p className="text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company / Firm Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Malwa Designs"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contact Person Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Chandra"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98260 00000"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@gmail.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Commercial street, Colony"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
            <input
              type="text"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              placeholder="23AAAAA0000A1Z5"
              className="w-full px-3 py-2 font-mono uppercase rounded-xl border border-slate-300 bg-white"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
