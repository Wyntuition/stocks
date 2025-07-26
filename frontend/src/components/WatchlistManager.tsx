import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star, StarOff, X } from 'lucide-react';
import { listApi } from '../services/api';

interface List {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  _count: { portfolios: number };
  createdAt: string;
}

interface ListManagerProps {
  onListSelect?: (listId: string | null) => void;
  selectedListId?: string | null;
  onClose?: () => void;
}

export const ListManager: React.FC<ListManagerProps> = ({
  onListSelect,
  selectedListId,
  onClose
}) => {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const data = await listApi.getAllLists();
      setLists(data);
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || submitting) return;

    setSubmitting(true);
    try {
      const newList = await listApi.createList({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      });
      setLists(prev => [...prev, newList]);
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create list:', error);
      alert('Failed to create list. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingList || !formData.name.trim() || submitting) return;

    setSubmitting(true);
    try {
      const updatedList = await listApi.updateList(editingList.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      });
      setLists(prev => prev.map(w => w.id === editingList.id ? updatedList : w));
      setEditingList(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to update list:', error);
      alert('Failed to update list. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteList = async (list: List) => {
    if (list.isDefault) {
      alert('Cannot delete the default list.');
      return;
    }

    const confirmMessage = list._count.portfolios > 0
      ? `This will move ${list._count.portfolios} stocks to your default list. Continue?`
      : 'Are you sure you want to delete this list?';

    if (!confirm(confirmMessage)) return;

    try {
      await listApi.deleteList(list.id);
      setLists(prev => prev.filter(w => w.id !== list.id));
      if (selectedListId === list.id && onListSelect) {
        onListSelect(null);
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
      alert('Failed to delete list. Please try again.');
    }
  };

  const handleSetDefault = async (list: List) => {
    try {
      await listApi.setDefaultList(list.id);
      setLists(prev => prev.map(w => ({
        ...w,
        isDefault: w.id === list.id
      })));
    } catch (error) {
      console.error('Failed to set default list:', error);
      alert('Failed to set default list. Please try again.');
    }
  };

  const startEdit = (list: List) => {
    setEditingList(list);
    setFormData({ name: list.name, description: list.description || '' });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingList(null);
    setFormData({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Manage Lists</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Main Portfolio Option */}
      <div className="mb-4">
        <button
          onClick={() => onListSelect?.(null)}
          className={`w-full text-left p-3 rounded-lg border transition-colors ${
            selectedListId === null
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Main Portfolio</h3>
              <p className="text-sm text-gray-500">Your primary investment portfolio</p>
            </div>
          </div>
        </button>
      </div>

      {/* Lists */}
      <div className="space-y-3 mb-6">
        {lists.map((list) => (
          <div
            key={list.id}
            onClick={() => onListSelect?.(list.id)}
            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
              selectedListId === list.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {editingList?.id === list.id ? (
              <form onSubmit={handleUpdateList} className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="List name"
                  required
                />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description (optional)"
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{list.name}</h3>
                  <p className="text-xs text-gray-400 break-all">ID: {list.id}</p>
                  {list.description && (
                    <p className="text-sm text-gray-500">{list.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  {!list.isDefault && (
                    <button
                      onClick={() => handleDeleteList(list)}
                      className="text-red-600 hover:text-red-800 px-2 py-1 rounded"
                      title="Delete list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {!list.isDefault && (
                    <button
                      onClick={() => handleSetDefault(list)}
                      className="p-1 text-gray-400 hover:text-yellow-500"
                      title="Set as default"
                    >
                      <StarOff className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(list)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit list"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create New List */}
      {showCreateForm ? (
        <form onSubmit={handleCreateList} className="space-y-3 p-3 border border-gray-200 rounded-lg">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List name"
            required
            autoFocus
          />
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Description (optional)"
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({ name: '', description: '' });
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
        >
          <Plus className="h-4 w-4" />
          <span>Create New List</span>
        </button>
      )}
    </div>
  );
}; 