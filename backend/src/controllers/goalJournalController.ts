import { Request, Response } from 'express';
import GoalJournalEntry from '../models/GoalJournalEntry';
import TherapyGoal from '../models/TherapyGoal';

export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.query;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const whereClause: any = { userId };

    if (goalId) {
      whereClause.goalId = goalId;
    }

    const entries = await GoalJournalEntry.findAll({
      where: whereClause,
      include: [
        {
          model: TherapyGoal,
          as: 'goal',
          attributes: ['id', 'goalTitle'],
        },
      ],
      order: [['entryDate', 'DESC']],
    });

    res.json(entries);
  } catch (error: any) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ message: 'Error fetching journal entries', error: error.message });
  }
};

export const getJournalEntryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const entry = await GoalJournalEntry.findOne({
      where: { id, userId },
      include: [
        {
          model: TherapyGoal,
          as: 'goal',
          attributes: ['id', 'goalTitle'],
        },
      ],
    });

    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    res.json(entry);
  } catch (error: any) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ message: 'Error fetching journal entry', error: error.message });
  }
};

export const createJournalEntry = async (req: Request, res: Response) => {
  try {
    const { goalId, entryDate, reflectionText, progressNotes, mood } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!goalId || !reflectionText) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify the goal belongs to the user
    const goal = await TherapyGoal.findOne({
      where: { id: goalId, userId },
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const entry = await GoalJournalEntry.create({
      goalId,
      userId,
      entryDate: entryDate || new Date(),
      reflectionText,
      progressNotes,
      mood,
    });

    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ message: 'Error creating journal entry', error: error.message });
  }
};

export const updateJournalEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { entryDate, reflectionText, progressNotes, mood } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const entry = await GoalJournalEntry.findOne({
      where: { id, userId },
    });

    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    await entry.update({
      entryDate,
      reflectionText,
      progressNotes,
      mood,
    });

    res.json(entry);
  } catch (error: any) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({ message: 'Error updating journal entry', error: error.message });
  }
};

export const deleteJournalEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const entry = await GoalJournalEntry.findOne({
      where: { id, userId },
    });

    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    await entry.destroy();

    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ message: 'Error deleting journal entry', error: error.message });
  }
};
