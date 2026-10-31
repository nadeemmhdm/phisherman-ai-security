import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { EmailParserService } from '../services/emailParserService.js';
import { HeaderForensicsService } from '../services/headerForensicsService.js';
import { UrlAnalysisService } from '../services/urlAnalysisService.js';

export const emailRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Parse uploaded .eml file
emailRouter.post('/parse-eml', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No .eml file uploaded' });
    }

    const tempAnalysisId = crypto.randomUUID();
    const parsed = await EmailParserService.parseEml(req.file.buffer, tempAnalysisId);

    res.json({
      success: true,
      data: parsed,
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to parse .eml file: ${err.message}` });
  }
});

// Forensic inspection of raw headers
emailRouter.post('/headers', (req: Request, res: Response) => {
  try {
    const { rawHeaders, senderEmail, replyTo, returnPath } = req.body;
    if (!rawHeaders) {
      return res.status(400).json({ error: 'rawHeaders is required' });
    }

    const parsedHeaders = EmailParserService.parseRawHeaders(rawHeaders);
    const forensics = HeaderForensicsService.analyse(
      parsedHeaders,
      senderEmail || '',
      replyTo,
      returnPath
    );

    res.json({
      headers: parsedHeaders,
      forensics,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Inspection of URLs
emailRouter.post('/urls', (req: Request, res: Response) => {
  try {
    const { text, html } = req.body;
    if (!text && !html) {
      return res.status(400).json({ error: 'Text or HTML is required' });
    }

    const tempId = crypto.randomUUID();
    const result = UrlAnalysisService.extractAndInspect(text || '', html, tempId);

    res.json({
      urls: result.extractedUrls,
      inspections: result.detailedInspections,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
