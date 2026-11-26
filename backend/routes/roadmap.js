import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import Roadmap from '../models/Roadmap.js';
import auth from '../middleware/auth.js';

const router = Router();

const SYSTEM = `You are a study-roadmap planner. Reply with ONLY valid JSON, no markdown, no commentary.
Schema: {"phases":[{"title":string,"period":string,"days":[{"day":string,"topic":string}]}]}
Rules:
- Split the full duration into phases by month (period like "Month 1").
- "day" is "Day 1", "Day 2", ... counted continuously across phases. Each topic is concrete and under 12 words, e.g. "Basics of Express and routing", "Controllers and services".
- Give one entry per day for the first 90 days. For longer plans, merge days into ranges like "Day 91-92" so no phase has more than 30 entries.
- Fit the content per day to the daily study hours, target level and learning style (theory = concepts, practical = projects and exercises, both = mix).
- Cover every stack the learner lists, in a sensible order. Finish with revision and a capstone project.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Tries each model up to 3 times when Google is busy (503) or rate limited (429)
async function generate(contents) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = [process.env.MODEL || 'gemini-3.8-flash', process.env.MODEL_FALLBACK].filter(Boolean);

  let lastErr;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM,
            responseMimeType: 'application/json',
            maxOutputTokens: 16000
          }
        });
      } catch (err) {
        lastErr = err;
        if (err.status !== 503 && err.status !== 429) throw err;
        await sleep(2000 * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

// Get the logged-in user's saved roadmap (null if none yet)
router.get('/', auth, async (req, res) => {
  try {
    const doc = await Roadmap.findOne({ user: req.userId });
    res.json(doc ? { form: doc.form, phases: doc.phases } : null);
  } catch (err) {
    console.error('LOAD ERROR:', err.message);
    res.status(500).json({ error: 'Could not load your roadmap.' });
  }
});

// Generate a new roadmap and save it (replaces the old one)
router.post('/', auth, async (req, res) => {
  const { duration, hours, level, style, stack } = req.body || {};

  if (!duration || !hours || !level || !style || !String(stack || '').trim()) {
    return res.status(400).json({ error: 'Please fill all fields.' });
  }

  try {
    const response = await generate(
      `Duration: ${duration} month(s)\nDaily study hours: ${hours}\nTarget level: ${level}\nLearning style: ${style}\nStack to learn: ${stack}`
    );

    const data = JSON.parse(response.text);
    if (!Array.isArray(data.phases)) throw new Error('The AI reply was not a valid roadmap.');

    const phases = data.phases.map((p) => ({
      title: String(p.title),
      period: String(p.period),
      days: (p.days || []).map((d) => ({ day: String(d.day), topic: String(d.topic), done: false }))
    }));

    const doc = await Roadmap.findOneAndUpdate(
      { user: req.userId },
      {
        user: req.userId,
        form: { duration: Number(duration), hours: Number(hours), level, style, stack },
        phases
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ form: doc.form, phases: doc.phases });
  } catch (err) {
    console.error('ROADMAP ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Tick or untick one day
router.patch('/day', auth, async (req, res) => {
  const { phase, day, done } = req.body || {};

  if (!Number.isInteger(phase) || !Number.isInteger(day) || phase < 0 || day < 0 || typeof done !== 'boolean') {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  try {
    const doc = await Roadmap.findOne({ user: req.userId });
    if (!doc || !doc.phases[phase] || !doc.phases[phase].days[day]) {
      return res.status(404).json({ error: 'Day not found.' });
    }

    doc.phases[phase].days[day].done = done;
    await doc.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('TICK ERROR:', err.message);
    res.status(500).json({ error: 'Could not save your progress.' });
  }
});

export default router;