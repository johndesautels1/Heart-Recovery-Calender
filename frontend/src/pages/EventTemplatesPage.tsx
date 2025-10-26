import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

interface EventTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  defaultDuration: number;
  defaultLocation?: string;
  color?: string;
  requiresPatientAcceptance: boolean;
  isActive: boolean;
}

interface CreateEventTemplateInput {
  name: string;
  description?: string;
  category: string;
  defaultDuration: number;
  defaultLocation?: string;
  color?: string;
  requiresPatientAcceptance: boolean;
}

const categories = [
  { value: 'therapy', label: 'Therapy Sessions' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'checkup', label: 'Checkups' },
  { value: 'assessment', label: 'Assessments' },
  { value: 'exercise', label: 'Exercise Sessions' },
  { value: 'education', label: 'Education' },
  { value: 'group_session', label: 'Group Sessions' },
  { value: 'follow_up', label: 'Follow-up' },
];

export function EventTemplatesPage() {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EventTemplate[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { user } = useAuth();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateEventTemplateInput>();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedCategory]);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/event-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load event templates');

      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load event templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  const onSubmit = async (data: CreateEventTemplateInput) => {
    try {
      const token = localStorage.getItem('token');
      const url = editingTemplate
        ? `/api/event-templates/${editingTemplate.id}`
        : '/api/event-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save template');

      toast.success(editingTemplate ? 'Template updated successfully' : 'Template added successfully');
      setIsAddModalOpen(false);
      setEditingTemplate(null);
      reset();
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleEdit = (template: EventTemplate) => {
    setEditingTemplate(template);
    reset({
      name: template.name,
      description: template.description || '',
      category: template.category,
      defaultDuration: template.defaultDuration,
      defaultLocation: template.defaultLocation || '',
      color: template.color || '#3B82F6',
      requiresPatientAcceptance: template.requiresPatientAcceptance,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/event-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete template');

      toast.success('Template deleted successfully');
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleToggleActive = async (template: EventTemplate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/event-templates/${template.id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to toggle template status');

      toast.success('Template ' + (template.isActive ? 'deactivated' : 'activated') + ' successfully');
      await loadTemplates();
    } catch (error) {
      console.error('Error toggling template status:', error);
      toast.error('Failed to update template status');
    }
  };

  const handleAddNew = () => {
    setEditingTemplate(null);
    reset({
      name: '',
      description: '',
      category: 'therapy',
      defaultDuration: 60,
      defaultLocation: '',
      color: '#3B82F6',
      requiresPatientAcceptance: true,
    });
    setIsAddModalOpen(true);
  };

  // Only therapists and admins can access this page
  if (user?.role !== 'therapist' && user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass rounded-xl p-12 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Therapist/Admin Access Only</h3>
          <p style={{ color: 'var(--ink)' }} className="opacity-70">
            Only therapists and administrators can access Event Templates
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: 'var(--ink)' }}>Loading templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Event Templates</h1>
          <p style={{ color: 'var(--ink)' }} className="text-sm">
            Manage event templates for patient scheduling
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-5 w-5 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--accent)' }} />
            <input
              type="text"
              placeholder="Search templates..."
              className="glass-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="glass-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>
          Showing {filteredTemplates.length} of {templates.length} templates
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>No templates found</h3>
          <p style={{ color: 'var(--ink)' }} className="mb-6 opacity-70">
            {searchTerm || selectedCategory
              ? 'Try adjusting your filters'
              : 'Add your first template to get started'}
          </p>
          {!searchTerm && !selectedCategory && (
            <Button onClick={handleAddNew}>
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="glass rounded-xl p-6 hover:scale-[1.02] transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: template.color || '#3B82F6' }}
                    />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{template.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {categories.find(c => c.value === template.category)?.label}
                    </span>
                    <span className={'text-xs px-2 py-1 rounded-full ' + (template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    title="Edit template"
                  >
                    <Edit2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {template.description && (
                <p className="text-sm mb-4" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                  {template.description.length > 100 ? template.description.substring(0, 100) + '...' : template.description}
                </p>
              )}

              <div className="space-y-2 mb-4 text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{template.defaultDuration} minutes</span>
                </div>
                {template.defaultLocation && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{template.defaultLocation}</span>
                  </div>
                )}
                {template.requiresPatientAcceptance && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Requires patient acceptance</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleToggleActive(template)}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                style={{
                  backgroundColor: template.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: template.isActive ? '#dc2626' : '#10b981',
                }}
              >
                {template.isActive ? (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Activate</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTemplate(null);
          reset();
        }}
        title={editingTemplate ? 'Edit Event Template' : 'Add New Event Template'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Template Name *
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g., Cardio Session, Therapy Appointment"
              {...register('name', { required: 'Template name is required' })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Category *
              </label>
              <select
                className="glass-input"
                {...register('category', { required: 'Category is required' })}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Duration (minutes) *
              </label>
              <input
                type="number"
                className="glass-input"
                min="1"
                placeholder="e.g., 60"
                {...register('defaultDuration', { required: 'Duration is required', valueAsNumber: true, min: 1 })}
              />
              {errors.defaultDuration && (
                <p className="text-red-500 text-sm mt-1">{errors.defaultDuration.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Description
            </label>
            <textarea
              className="glass-input"
              rows={3}
              placeholder="Brief description of the event..."
              {...register('description')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Default Location
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g., Cardiac Rehab Center"
              {...register('defaultLocation')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Color
            </label>
            <input
              type="color"
              className="glass-input h-12"
              {...register('color')}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="requiresAcceptance"
              className="rounded"
              {...register('requiresPatientAcceptance')}
            />
            <label htmlFor="requiresAcceptance" className="text-sm" style={{ color: '#ffffff' }}>
              Requires patient acceptance/decline
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingTemplate(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingTemplate ? 'Update Template' : 'Add Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
