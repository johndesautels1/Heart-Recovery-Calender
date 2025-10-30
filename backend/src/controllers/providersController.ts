import { Request, Response } from 'express';
import Provider from '../models/Provider';
import { Op } from 'sequelize';

// GET /api/providers - Get all providers for the logged-in user
export const getProviders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const providers = await Provider.findAll({
      where: { userId },
      order: [
        ['isPrimary', 'DESC'],
        ['name', 'ASC'],
      ],
    });

    res.json({ data: providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/providers/:id - Get a specific provider
export const getProvider = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const provider = await Provider.findOne({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ data: provider });
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/providers - Add a new provider
export const addProvider = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Sanitize empty strings to null for optional fields
    const sanitizedData = { ...req.body };
    if (sanitizedData.specialty === '') sanitizedData.specialty = null;
    if (sanitizedData.phone === '') sanitizedData.phone = null;
    if (sanitizedData.email === '') sanitizedData.email = null;
    if (sanitizedData.address === '') sanitizedData.address = null;
    if (sanitizedData.nextAppointment === '') sanitizedData.nextAppointment = null;
    if (sanitizedData.notes === '') sanitizedData.notes = null;

    // If this is marked as primary, unset any existing primary providers
    if (sanitizedData.isPrimary) {
      await Provider.update(
        { isPrimary: false },
        { where: { userId, isPrimary: true } }
      );
    }

    const provider = await Provider.create({
      userId,
      ...sanitizedData,
    });

    res.status(201).json({ data: provider });
  } catch (error) {
    console.error('Error adding provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/providers/:id - Update a provider
export const updateProvider = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const provider = await Provider.findOne({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Sanitize empty strings to null for optional fields
    const sanitizedData = { ...req.body };
    if (sanitizedData.specialty === '') sanitizedData.specialty = null;
    if (sanitizedData.phone === '') sanitizedData.phone = null;
    if (sanitizedData.email === '') sanitizedData.email = null;
    if (sanitizedData.address === '') sanitizedData.address = null;
    if (sanitizedData.nextAppointment === '') sanitizedData.nextAppointment = null;
    if (sanitizedData.notes === '') sanitizedData.notes = null;

    // If this is being marked as primary, unset any existing primary providers
    if (sanitizedData.isPrimary && !provider.isPrimary) {
      await Provider.update(
        { isPrimary: false },
        { where: { userId, isPrimary: true } }
      );
    }

    await provider.update(sanitizedData);

    res.json({ data: provider });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/providers/:id - Delete a provider
export const deleteProvider = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const provider = await Provider.findOne({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await provider.destroy();

    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/providers/upcoming - Get providers with upcoming appointments
export const getUpcomingAppointments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const providers = await Provider.findAll({
      where: {
        userId,
        nextAppointment: {
          [Op.gte]: new Date(),
        },
      },
      order: [['nextAppointment', 'ASC']],
    });

    res.json({ data: providers });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
