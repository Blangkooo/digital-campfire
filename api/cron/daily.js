'use strict';

const { dailyReset } = require('../../lib/db');

module.exports = async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const count = await dailyReset();
    res.status(200).json({ ok: true, injected: count });
  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: 'Cron failed.' });
  }
};
