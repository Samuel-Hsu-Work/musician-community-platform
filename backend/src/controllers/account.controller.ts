import { Request, Response } from 'express';
import { accountService } from '../services/account.service';
import { USERNAME_TOO_SIMILAR_ERROR, USERNAME_HELD_ERROR } from '../utils/usernameAvailability';

export const getAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const account = await accountService.getAccount(req.user.userId);
    res.status(200).json(account);
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUsername = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = await accountService.updateUsername(
      req.user.userId,
      username
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Update username error:', error);

    if (
      error.message === 'User not found' ||
      error.message === 'Username is already taken' ||
      error.message === USERNAME_TOO_SIMILAR_ERROR ||
      error.message === USERNAME_HELD_ERROR ||
      error.message === 'Username is required' ||
      error.message === 'This username is reserved' ||
      error.message.includes('Username must be')
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { language, timezone } = req.body;

    const preferences = await accountService.updatePreferences(req.user.userId, {
      language,
      timezone,
    });

    res.status(200).json({ preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLearningStyle = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({
        error: 'categoryIds must be an array of category id strings',
      });
    }

    if (!categoryIds.every((id) => typeof id === 'string')) {
      return res.status(400).json({
        error: 'categoryIds must be an array of category id strings',
      });
    }

    const result = await accountService.updateLearningStyle(
      req.user.userId,
      categoryIds
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Update learning style error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message?.startsWith('Unknown learning style categories')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Password is required to delete your account',
      });
    }

    await accountService.deleteAccount(req.user.userId, password);

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Delete account error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }

    if (
      error.message === 'Incorrect password' ||
      error.message === 'Password is required to delete your account'
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};
