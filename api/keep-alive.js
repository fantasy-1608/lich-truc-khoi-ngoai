export default function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    return res.status(200).json({ status: 'skipped', reason: 'Supabase not configured' });
  }

  // Simple ping to keep Supabase database active and prevent free-tier auto-pause
  // This endpoint is called by Vercel Cron every 5 days
  return fetch(`${supabaseUrl}/rest/v1/schedule_base?id=eq.default&select=id`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
      Authorization: `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''}`,
    },
  })
    .then((response) => {
      res.status(200).json({
        status: 'ok',
        supabaseStatus: response.status,
        timestamp: new Date().toISOString(),
      });
    })
    .catch((error) => {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    });
}
