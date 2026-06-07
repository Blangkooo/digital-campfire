'use strict';

const { injectDailyMessages } = require('../../lib/db');

module.exports = async (req, res) => {
  // Vercel automatically passes CRON_SECRET in the Authorization header
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const count = await injectDailyMessages();
    res.status(200).json({ ok: true, injected: count });
  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: 'Cron failed.' });
  }
};
