'use strict';

const { getMessages, addMessage, dailyReset } = require('../lib/db');

const VALID_CATEGORIES = ['Advice','Confession','Dream','Memory','Story','Gratitude','Random Thought'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      await dailyReset(); // no-op if already run today; seeds on first hit of a new day
      const messages = await getMessages();
      return res.status(200).json(messages);
    }

    if (req.method === 'POST') {
      const { text, category } = req.body || {};

      if (!text || typeof text !== 'string' || text.trim().length === 0)
        return res.status(400).json({ error: 'Message text is required.' });

      if (!VALID_CATEGORIES.includes(category))
        return res.status(400).json({ error: 'Invalid category.' });

      const result = await addMessage(text, category);
      return res.status(201).json(result);
    }

    res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
