# Google Classroom Integration Setup Guide

## Overview

ClassFlow AI now supports Google Classroom integration, allowing teachers to:
- **Import class rosters** automatically from Google Classroom
- **Share activities** to Google Classroom as assignments
- **Sync grades** back to Google Classroom gradebook

## Prerequisites

- Google Workspace for Education account
- Access to Google Cloud Console
- Teacher permissions in Google Classroom

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "ClassFlow AI Integration"

### 2. Enable Google Classroom API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Google Classroom API"
3. Click **Enable**
4. Also enable "Google People API" for user profile information

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: External (or Internal if using Google Workspace)
   - **App name**: ClassFlow AI
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **Scopes**: Add the following scopes:
     - `https://www.googleapis.com/auth/classroom.courses.readonly`
     - `https://www.googleapis.com/auth/classroom.rosters.readonly`
     - `https://www.googleapis.com/auth/classroom.profile.emails`
     - `https://www.googleapis.com/auth/classroom.coursework.students`
     - `https://www.googleapis.com/auth/classroom.student-submissions.students.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - **Test users**: Add your email (if in testing mode)

4. Back in Credentials, create OAuth client ID:
   - **Application type**: Web application
   - **Name**: ClassFlow AI Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for development)
     - `https://your-production-domain.com`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/google/callback` (for development)
     - `https://your-production-api.com/api/google/callback`

5. Click **Create** and save your:
   - **Client ID**
   - **Client Secret**

### 4. Configure Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Google Classroom Integration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# For production, use your production URLs:
# GOOGLE_REDIRECT_URI=https://your-api-domain.com/api/google/callback
```

Also update your frontend environment:

```env
# In frontend .env
VITE_API_URL=http://localhost:3000

# For production:
# VITE_API_URL=https://your-api-domain.com
```

### 5. Restart the Server

After adding environment variables:

```bash
# In backend directory
npm run dev
```

### 6. Test the Integration

1. Login to ClassFlow AI as a teacher
2. Go to your dashboard
3. Look for the "Connect Google Classroom" section
4. Click "Connect with Google"
5. Authorize the app in Google OAuth screen
6. You should be redirected back with a success message

## Features

### Import Roster

1. After connecting Google Classroom
2. Create or open a session
3. In the Google Classroom section, select a course
4. Click "Import Students from Google Classroom"
5. Students will be automatically added to your session

### Share Activity

*Coming Soon* - Share ClassFlow activities as Google Classroom assignments

### Sync Grades

*Coming Soon* - Automatically sync student scores to Google Classroom gradebook

## Troubleshooting

### "Access blocked" error

- Make sure you've added your email to "Test users" in OAuth consent screen
- Or publish your app (requires verification for production use)

### "Redirect URI mismatch" error

- Verify that the redirect URI in Google Cloud Console exactly matches the one in your `.env` file
- Include the protocol (http:// or https://)
- Don't include trailing slashes

### "Invalid grant" error

- Delete and reconnect your Google Classroom account
- This usually means the refresh token has expired

### API quota exceeded

- Google Classroom API has usage limits
- For high-volume use, request quota increase in Google Cloud Console

## Security Best Practices

1. **Never commit credentials** - Keep `.env` files in `.gitignore`
2. **Use HTTPS in production** - OAuth requires secure connections
3. **Rotate credentials** - If compromised, regenerate in Google Cloud Console
4. **Limit scopes** - Only request permissions you need
5. **Review access** - Regularly audit which apps have access to Google Classroom

## Production Deployment

Before deploying to production:

1. Update OAuth consent screen to "Production" status
2. Complete Google's app verification process (if using sensitive scopes)
3. Update redirect URIs to production URLs
4. Enable rate limiting and monitoring
5. Set up error logging and alerts

## Support

For issues:
1. Check browser console for errors
2. Check backend logs for API errors
3. Verify OAuth credentials in Google Cloud Console
4. Review Google Classroom API documentation

## Additional Resources

- [Google Classroom API Documentation](https://developers.google.com/classroom)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
