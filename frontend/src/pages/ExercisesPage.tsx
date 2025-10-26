import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Dumbbell,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Heart,
  Activity,
  Video,
  Image as ImageIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useView } from '../contexts/ViewContext';

interface Exercise {
  id: number;
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  equipmentNeeded?: string;
  videoUrl?: string;
  imageUrl?: string;
  minPostOpWeek?: number;
  maxPostOpWeek?: number;
  contraindications?: string;
  instructions?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  isActive: boolean;
  createdBy?: number;
}

interface CreateExerciseInput {
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  equipmentNeeded?: string;
  videoUrl?: string;
  imageUrl?: string;
  minPostOpWeek?: number;
  maxPostOpWeek?: number;
  contraindications?: string;
  instructions?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
}

const categories = [
  { value: 'upper_body', label: 'Upper Body', icon: '💪' },
  { value: 'lower_body', label: 'Lower Body', icon: '🦵' },
  { value: 'cardio', label: 'Cardio', icon: '❤️' },
  { value: 'flexibility', label: 'Flexibility', icon: '🤸' },
  { value: 'balance', label: 'Balance', icon: '⚖️' },
  { value: 'breathing', label: 'Breathing', icon: '🫁' },
  { value: 'core', label: 'Core', icon: '🎯' },
];

const difficulties = [
  { value: 'beginner', label: 'Beginner', color: 'green' },
  { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', color: 'red' },
];

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const { isTherapistView } = useView();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateExerciseInput>();

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchTerm, selectedCategory, selectedDifficulty]);

  const loadExercises = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/exercises', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load exercises');

      const data = await response.json();
      setExercises(data.data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;

    if (searchTerm) {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty);
    }

    setFilteredExercises(filtered);
  };

  const onSubmit = async (data: CreateExerciseInput) => {
    try {
      const token = localStorage.getItem('token');
      const url = editingExercise
        ? `/api/exercises/${editingExercise.id}`
        : '/api/exercises';
      const method = editingExercise ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save exercise');

      toast.success(editingExercise ? 'Exercise updated successfully' : 'Exercise added successfully');
      setIsAddModalOpen(false);
      setEditingExercise(null);
      reset();
      await loadExercises();
    } catch (error) {
      console.error('Error saving exercise:', error);
      toast.error('Failed to save exercise');
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    reset({
      name: exercise.name,
      description: exercise.description || '',
      category: exercise.category,
      difficulty: exercise.difficulty,
      equipmentNeeded: exercise.equipmentNeeded || '',
      videoUrl: exercise.videoUrl || '',
      imageUrl: exercise.imageUrl || '',
      minPostOpWeek: exercise.minPostOpWeek,
      maxPostOpWeek: exercise.maxPostOpWeek,
      contraindications: exercise.contraindications || '',
      instructions: exercise.instructions || '',
      defaultSets: exercise.defaultSets,
      defaultReps: exercise.defaultReps,
      defaultDuration: exercise.defaultDuration,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/exercises/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete exercise');

      toast.success('Exercise deleted successfully');
      await loadExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast.error('Failed to delete exercise');
    }
  };

  const handleToggleActive = async (exercise: Exercise) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/exercises/${exercise.id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to toggle exercise status');

      toast.success(`Exercise ${exercise.isActive ? 'deactivated' : 'activated'} successfully');
      await loadExercises();
    } catch (error) {
      console.error('Error toggling exercise status:', error);
      toast.error('Failed to update exercise status');
    }
  };

  const handleAddNew = () => {
    setEditingExercise(null);
    reset({
      name: '',
      description: '',
      category: 'cardio',
      difficulty: 'beginner',
      equipmentNeeded: '',
      videoUrl: '',
      imageUrl: '',
      minPostOpWeek: undefined,
      maxPostOpWeek: undefined,
      contraindications: '',
      instructions: '',
      defaultSets: undefined,
      defaultReps: undefined,
      defaultDuration: undefined,
    });
    setIsAddModalOpen(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    return categories.find(c => c.value === category)?.icon || '🏃';
  };

  // Only therapists can access this page
  if (!isTherapistView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass rounded-xl p-12 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Therapist Access Only</h3>
          <p style={{ color: 'var(--ink)' }} className="opacity-70">
            Please switch to Therapist View to access the Exercise Library
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: 'var(--ink)' }}>Loading exercises...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Exercise Library</h1>
          <p style={{ color: 'var(--ink)' }} className="text-sm">
            Manage exercises and create prescriptions for your patients
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-5 w-5 mr-2" />
          Add Exercise
        </Button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--accent)' }} />
            <input
              type="text"
              placeholder="Search exercises..."
              className="glass-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="glass-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              className="glass-input"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              {difficulties.map(diff => (
                <option key={diff.value} value={diff.value}>{diff.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>
          Showing {filteredExercises.length} of {exercises.length} exercises
        </div>
      </div>

      {/* Exercise Grid */}
      {filteredExercises.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Dumbbell className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>No exercises found</h3>
          <p style={{ color: 'var(--ink)' }} className="mb-6 opacity-70">
            {searchTerm || selectedCategory || selectedDifficulty
              ? 'Try adjusting your filters'
              : 'Add your first exercise to get started'}
          </p>
          {!searchTerm && !selectedCategory && !selectedDifficulty && (
            <Button onClick={handleAddNew}>
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Exercise
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <div key={exercise.id} className="glass rounded-xl p-6 hover:scale-[1.02] transition-transform">
              {/* Exercise Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full glass flex items-center justify-center text-2xl">
                    {getCategoryIcon(exercise.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{exercise.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: getDifficultyColor(exercise.difficulty) + '20',
                          color: getDifficultyColor(exercise.difficulty),
                        }}
                      >
                        {exercise.difficulty}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${exercise.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {exercise.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(exercise)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    title="Edit exercise"
                  >
                    <Edit2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(exercise.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="Delete exercise"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mb-3">
                <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent)' }}>
                  {categories.find(c => c.value === exercise.category)?.label}
                </span>
              </div>

              {/* Description */}
              {exercise.description && (
                <p className="text-sm mb-4" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                  {exercise.description.length > 120 ? `${exercise.description.substring(0, 120)}...` : exercise.description}
                </p>
              )}

              {/* Metadata */}
              <div className="space-y-2 mb-4 text-xs" style={{ color: 'var(--ink)', opacity: 0.7 }}>
                {exercise.equipmentNeeded && (
                  <div className="flex items-center space-x-2">
                    <Dumbbell className="h-3 w-3" />
                    <span>{exercise.equipmentNeeded}</span>
                  </div>
                )}
                {(exercise.minPostOpWeek !== null || exercise.maxPostOpWeek !== null) && (
                  <div className="flex items-center space-x-2">
                    <Activity className="h-3 w-3" />
                    <span>
                      Week {exercise.minPostOpWeek || '0'} - {exercise.maxPostOpWeek || '∞'}
                    </span>
                  </div>
                )}
                {(exercise.defaultSets || exercise.defaultReps || exercise.defaultDuration) && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      {exercise.defaultSets && `${exercise.defaultSets} sets`}
                      {exercise.defaultReps && ` × ${exercise.defaultReps} reps`}
                      {exercise.defaultDuration && ` • ${exercise.defaultDuration} min`}
                    </span>
                  </div>
                )}
              </div>

              {/* Media Icons */}
              <div className="flex items-center space-x-2 mb-4">
                {exercise.videoUrl && (
                  <div className="flex items-center space-x-1 text-xs" style={{ color: 'var(--accent)' }}>
                    <Video className="h-4 w-4" />
                    <span>Video</span>
                  </div>
                )}
                {exercise.imageUrl && (
                  <div className="flex items-center space-x-1 text-xs" style={{ color: 'var(--accent)' }}>
                    <ImageIcon className="h-4 w-4" />
                    <span>Image</span>
                  </div>
                )}
              </div>

              {/* Contraindications Warning */}
              {exercise.contraindications && (
                <div className="p-2 rounded-lg mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600">
                      {exercise.contraindications.length > 80 ? `${exercise.contraindications.substring(0, 80)}...` : exercise.contraindications}
                    </p>
                  </div>
                </div>
              )}

              {/* Toggle Active Button */}
              <button
                onClick={() => handleToggleActive(exercise)}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                style={{
                  backgroundColor: exercise.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: exercise.isActive ? '#dc2626' : '#10b981',
                }}
              >
                {exercise.isActive ? (
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
          setEditingExercise(null);
          reset();
        }}
        title={editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Exercise Name *
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g., Walking, Arm Raises"
              {...register('name', { required: 'Exercise name is required' })}
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
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Difficulty *
              </label>
              <select
                className="glass-input"
                {...register('difficulty', { required: 'Difficulty is required' })}
              >
                {difficulties.map(diff => (
                  <option key={diff.value} value={diff.value}>{diff.label}</option>
                ))}
              </select>
              {errors.difficulty && (
                <p className="text-red-500 text-sm mt-1">{errors.difficulty.message}</p>
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
              placeholder="Brief description of the exercise..."
              {...register('description')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Equipment Needed
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g., Dumbbells, Resistance Band"
              {...register('equipmentNeeded')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Min Post-Op Week
              </label>
              <input
                type="number"
                className="glass-input"
                min="0"
                placeholder="e.g., 1"
                {...register('minPostOpWeek', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Max Post-Op Week
              </label>
              <input
                type="number"
                className="glass-input"
                min="0"
                placeholder="e.g., 12 (leave empty for no limit)"
                {...register('maxPostOpWeek', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Default Sets
              </label>
              <input
                type="number"
                className="glass-input"
                min="1"
                placeholder="e.g., 3"
                {...register('defaultSets', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Default Reps
              </label>
              <input
                type="number"
                className="glass-input"
                min="1"
                placeholder="e.g., 10"
                {...register('defaultReps', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Duration (min)
              </label>
              <input
                type="number"
                className="glass-input"
                min="1"
                placeholder="e.g., 15"
                {...register('defaultDuration', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Video URL
            </label>
            <input
              type="url"
              className="glass-input"
              placeholder="https://youtube.com/watch?v=..."
              {...register('videoUrl')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Image URL
            </label>
            <input
              type="url"
              className="glass-input"
              placeholder="https://example.com/image.jpg"
              {...register('imageUrl')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Instructions
            </label>
            <textarea
              className="glass-input"
              rows={4}
              placeholder="Step-by-step instructions..."
              {...register('instructions')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Contraindications / Warnings
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="Medical contraindications or warnings..."
              {...register('contraindications')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingExercise(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingExercise ? 'Update Exercise' : 'Add Exercise'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
