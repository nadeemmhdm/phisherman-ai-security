import { Router, Request, Response } from 'express';
import { OllamaService } from '../services/ollamaService.js';
import { settingsRepo } from '../db/database.js';

export const ollamaRouter = Router();

// Get status and available models
ollamaRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await OllamaService.checkStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: err.message,
    });
  }
});

// List installed models
ollamaRouter.get('/models', async (_req: Request, res: Response) => {
  try {
    const status = await OllamaService.checkStatus();
    res.json({
      connected: status.connected,
      endpoint: status.endpoint,
      models: status.models,
      selectedModel: status.selectedModel,
      secondaryModel: status.secondaryModel,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Switch active model
ollamaRouter.post('/select', (req: Request, res: Response) => {
  try {
    const { model, isSecondary } = req.body;
    if (!model) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    if (isSecondary) {
      settingsRepo.update({ secondary_model: model });
    } else {
      settingsRepo.update({ selected_model: model });
    }

    res.json({ success: true, model });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
