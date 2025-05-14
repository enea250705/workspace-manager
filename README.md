# Workforce Manager

## Deployment Instructions

This application is split into two parts:
- Backend: Deployed on Render
- Frontend: Deployed on Vercel

### Backend Deployment (Render)

1. Create a new account on [Render](https://render.com/) if you don't have one.
2. Connect your GitHub repository to Render.
3. Create a new Web Service and select your repository.
4. Use the following settings:
   - **Name**: workforce-manager-backend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
5. Add the following environment variables:
   - `NODE_ENV`: production
   - `SESSION_SECRET`: [your-session-secret]
   - `DATABASE_URL`: [your-database-url]
   - `SMTP_HOST`: [your-smtp-host]
   - `SMTP_PORT`: [your-smtp-port]
   - `SMTP_USER`: [your-smtp-username]
   - `SMTP_PASS`: [your-smtp-password]
   - `EMAIL_FROM`: [your-email-address]
6. Click "Create Web Service"

Alternatively, you can use the `render.yaml` file in this repository for deployment.

### Frontend Deployment (Vercel)

1. Create a new account on [Vercel](https://vercel.com/) if you don't have one.
2. Connect your GitHub repository to Vercel.
3. Create a new project and select your repository.
4. Configure the project with the following settings:
   - **Framework Preset**: Vite
   - **Root Directory**: client
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: dist
5. Add the following environment variables:
   - `VITE_API_URL`: https://workforce-manager-backend.onrender.com
   - `VITE_WS_URL`: wss://workforce-manager-backend.onrender.com
6. Click "Deploy"

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env` and fill in the values)
4. Start the development server:
   ```
   npm run dev
   ```

## Project Structure

- `/client`: Frontend React application
- `/server`: Backend Express server
- `/shared`: Shared types and utilities 