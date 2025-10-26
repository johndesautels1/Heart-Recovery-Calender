import { Request, Response } from 'express';
import EventTemplate from '../models/EventTemplate';
import { Op } from 'sequelize';

// GET /api/event-templates - Get all event templates with filters and search
export const getEventTemplates = async (req: Request, res: Response) => {
  try {
    const { category, requiresPatientAcceptance, isActive, search, limit } = req.query;
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (requiresPatientAcceptance !== undefined) {
      where.requiresPatientAcceptance = requiresPatientAcceptance === 'true';
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Autocomplete search by name or description
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const queryOptions: any = {
      where,
      order: [
        ['category', 'ASC'],
        ['name', 'ASC'],
      ],
    };

    // Limit results for autocomplete
    if (limit) {
      queryOptions.limit = parseInt(limit as string);
    }

    const templates = await EventTemplate.findAll(queryOptions);

    res.json({ data: templates });
  } catch (error) {
    console.error('Error fetching event templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/event-templates/:id - Get specific event template
export const getEventTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await EventTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ error: 'Event template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching event template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/event-templates - Create new event template (therapists/admins only)
export const createEventTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only therapists and admins can create event templates
    if (userRole !== 'therapist' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only therapists and admins can create event templates' });
    }

    const templateData = {
      ...req.body,
      createdBy: userId,
      isActive: true,
    };

    const template = await EventTemplate.create(templateData);

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating event template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/event-templates/:id - Update event template (therapists/admins only)
export const updateEventTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists and admins can update event templates
    if (userRole !== 'therapist' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only therapists and admins can update event templates' });
    }

    const template = await EventTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ error: 'Event template not found' });
    }

    await template.update(req.body);

    res.json(template);
  } catch (error) {
    console.error('Error updating event template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/event-templates/:id - Delete event template (therapists/admins only)
export const deleteEventTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists and admins can delete event templates
    if (userRole !== 'therapist' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only therapists and admins can delete event templates' });
    }

    const template = await EventTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ error: 'Event template not found' });
    }

    await template.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/event-templates/:id/toggle-active - Toggle template active status (therapists/admins only)
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists and admins can toggle template status
    if (userRole !== 'therapist' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only therapists and admins can update event templates' });
    }

    const template = await EventTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ error: 'Event template not found' });
    }

    await template.update({ isActive: !template.isActive });

    res.json(template);
  } catch (error) {
    console.error('Error toggling template status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/event-templates/categories/list - Get list of all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
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

    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/event-templates/stats - Get event template statistics
export const getEventTemplateStats = async (req: Request, res: Response) => {
  try {
    const totalTemplates = await EventTemplate.count({ where: { isActive: true } });

    const byCategory = await EventTemplate.findAll({
      attributes: [
        'category',
        [EventTemplate.sequelize!.fn('COUNT', EventTemplate.sequelize!.col('id')), 'count'],
      ],
      where: { isActive: true },
      group: ['category'],
    });

    const requiresAcceptance = await EventTemplate.count({
      where: { isActive: true, requiresPatientAcceptance: true },
    });

    res.json({
      totalTemplates,
      byCategory,
      requiresAcceptance,
    });
  } catch (error) {
    console.error('Error fetching event template stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
