# LimeHelpDesk

A community-driven platform for bug reports, suggestions, and feature requests.

## Features

- Submit bug reports, suggestions, and feature requests
- Vote on submissions
- Comment and discuss with other users
- Admin status management
- Image and video link support
- Real-time updates

## Hosting on VM

### Prerequisites

- Node.js 18+ installed
- npm or bun package manager

### Deployment Commands

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in the 'dist' folder
# Serve the dist folder using any static file server

# Option 1: Using serve (install globally first)
npm install -g serve
serve -s dist -l 3000

# Option 2: Using nginx
# Copy dist folder contents to /var/www/html
# Configure nginx to serve the static files

# Option 3: Using PM2 with serve
npm install -g pm2 serve
pm2 start "serve -s dist -l 3000" --name limehelpdesk
```

### Environment Variables

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/limehelpdesk;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
