import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono();
const port = 3000;

// Serve static files from the current directory
app.use('/*', serveStatic({ root: './' }));

// Redirect / to component.html if needed, or just let serveStatic handle it if it's named index.html
// But here it's component.html, so let's add a route for it
app.get('/', (c) => c.redirect('/component.html'));

app.post('/feedback/:repo', async (c) => {
  const RepoName = c.req.param('repo');
  try {
    const { title, body, labels } = await c.req.json();
    
    // Get API Key from Environment Variables (Securely)
    const token = process.env.GITHUB_API_KEY;

    if (!token) {
      console.error("Missing GITHUB_API_KEY environment variable");
      return c.json({ error: 'Server configuration error: Missing API Key' }, 500);
    }

    const response = await fetch('https://api.github.com/repos/Luke-Jodice/'+RepoName+'/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Hono-Feedback-App'
      },
      body: JSON.stringify({ 
        title: title || 'No Title Provided', 
        body: body || 'No Description Provided', 
        labels: labels || ["Bug/Feat"] 
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return c.json({ success: true, issue: data });
    } else {
      const errorData = await response.json();
      return c.json({ error: 'GitHub API error', details: errorData }, response.status);
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// For local development, start the server
if (process.env.NODE_ENV !== 'production' && typeof Bun === 'undefined') {
  const { serve } = await import('@hono/node-server');
  serve({
    fetch: app.fetch,
    port: port
  }, (info) => {
    console.log(`🚀 Server running at http://localhost:${info.port}`);
  });
}

// For Vercel or Bun
export default app;
