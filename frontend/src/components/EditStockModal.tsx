import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PortfolioItem, UpdatePortfolioItemRequest } from '../types';

interface EditStockModalProps {
  item: PortfolioItem | null;
  onClose: () => void;
  onSave: (id: string, data: UpdatePortfolioItemRequest) => Promise<void>;
  isSaving: boolean;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({
  item,
  onClose,
  onSave,
  isSaving
}) => {
  const [formData, setFormData] = useState<{
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
  }>({
    quantity: 0,
    purchasePrice: 0,
    purchaseDate: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        purchaseDate: item.purchaseDate instanceof Date 
          ? item.purchaseDate.toISOString().split('T')[0]
          : new Date(item.purchaseDate).toISOString().split('T')[0]
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await onSave(item.id, formData);
      onClose();
    }
  };

  const handleInputChange = (field: keyof UpdatePortfolioItemRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit {item.symbol}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Symbol
            </label>
            <input
              type="text"
              value={item.symbol}
              disabled
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-gray-500 text-xs">(0 for watch only)</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price {formData.quantity === 0 && <span className="text-gray-500 text-xs">(N/A for watch)</span>}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={formData.quantity === 0 ? "N/A" : "150.00"}
              min="0.01"
              required={formData.quantity > 0}
              disabled={formData.quantity === 0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date {formData.quantity === 0 && <span className="text-gray-500 text-xs">(N/A for watch)</span>}
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={formData.quantity > 0}
              disabled={formData.quantity === 0}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 