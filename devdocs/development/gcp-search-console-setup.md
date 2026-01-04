# Google Cloud Platform Setup for Search Console API

This guide walks through setting up a GCP project to access the Google Search Console API via OAuth2.

## Prerequisites

- A Google account
- At least one website verified in [Google Search Console](https://search.google.com/search-console)

---

## Step 1: Create a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Click the project dropdown at the top of the page

3. Click **New Project**

4. Enter project details:
   - **Project name:** `seo-solver` (or your preference)
   - **Organization:** Leave as default or select your org
   - **Location:** Leave as default

5. Click **Create**

6. Wait for the project to be created, then select it from the project dropdown

---

## Step 2: Enable the Search Console API

1. In your new project, go to **APIs & Services** > **Library**
   - Or direct link: https://console.cloud.google.com/apis/library

2. Search for "Google Search Console API"

3. Click on **Google Search Console API**

4. Click **Enable**

5. Wait for the API to be enabled

---

## Step 3: Configure OAuth Consent Screen

Before creating credentials, you must configure the consent screen that users see when authorizing your app.

1. Go to **APIs & Services** > **OAuth consent screen**
   - Or direct link: https://console.cloud.google.com/apis/credentials/consent

2. Select **User Type**:
   - **Internal:** Only users in your Google Workspace org (if applicable)
   - **External:** Any Google account (select this for personal use)

3. Click **Create**

4. Fill in the **App information**:
   - **App name:** `SEO Solver`
   - **User support email:** Your email
   - **App logo:** Optional (skip for now)

5. **App domain** (optional, can skip):
   - Leave blank for development

6. **Developer contact information:**
   - Add your email address

7. Click **Save and Continue**

### Add Scopes

1. Click **Add or Remove Scopes**

2. Search for and select:
   - `https://www.googleapis.com/auth/webmasters.readonly` - View Search Console data

3. Click **Update**

4. Click **Save and Continue**

### Test Users (External apps only)

If you selected "External" user type, your app will be in "Testing" mode:

1. Click **Add Users**

2. Add email addresses of users who can test (including yourself)

3. Click **Save and Continue**

4. Review the summary and click **Back to Dashboard**

> **Note:** In Testing mode, only added test users can authorize. To allow anyone, you'd need to publish the app and go through Google's verification process.

---

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
   - Or direct link: https://console.cloud.google.com/apis/credentials

2. Click **Create Credentials** > **OAuth client ID**

3. Select **Application type:** `Web application`

4. Enter a **Name:** `SEO Solver OAuth Client`

5. **Authorized JavaScript origins:**
   - For local development: `http://localhost:3000`
   - For deployed API: `https://your-api-gateway-url.amazonaws.com`

6. **Authorized redirect URIs:**
   - For local development: `http://localhost:3000/auth/google/callback`
   - For deployed API: `https://your-api-gateway-url.amazonaws.com/dev/auth/google/callback`

   > **Important:** You'll update these URIs after deploying. For now, add localhost versions.

7. Click **Create**

8. A dialog will show your credentials:
   - **Client ID:** `xxxxx.apps.googleusercontent.com`
   - **Client secret:** `GOCSPX-xxxxx`

9. Click **Download JSON** to save the credentials file

10. Click **OK**

---

## Step 5: Store Credentials Securely

**Never commit credentials to git!**

### Option A: Environment Variables (Development)

Create a `.env` file in `implementations/aws-typescript/`:

```bash
# .env (gitignored)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Option B: AWS SSM Parameter Store (Production)

```bash
# Store credentials in SSM
aws ssm put-parameter \
  --name "/seo-solver/dev/google-client-id" \
  --value "xxxxx.apps.googleusercontent.com" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/seo-solver/dev/google-client-secret" \
  --value "GOCSPX-xxxxx" \
  --type "SecureString"
```

---

## Step 6: Verify Setup

Test that your credentials work by making a simple OAuth request:

```bash
# Generate the authorization URL
CLIENT_ID="your-client-id"
REDIRECT_URI="http://localhost:3000/auth/google/callback"
SCOPE="https://www.googleapis.com/auth/webmasters.readonly"

echo "https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&access_type=offline&prompt=consent"
```

Open the URL in a browser. You should see Google's consent screen asking to allow "SEO Solver" to view your Search Console data.

---

## API Limits

| API | Limit | Notes |
|-----|-------|-------|
| URL Inspection API | 2,000 requests/day/property | Per Search Console property |
| Search Analytics API | 25,000 requests/day | Aggregated queries |

---

## Troubleshooting

### "Access blocked: This app's request is invalid"

- Check that your redirect URI exactly matches what's configured in GCP
- Ensure the URI includes the correct protocol (http vs https)
- Verify there are no trailing slashes mismatches

### "Error 403: access_denied"

- For External apps in Testing mode, ensure the user is added as a test user
- Check that the Search Console API is enabled
- Verify the correct scopes are configured

### "Invalid client" error

- Double-check the client ID and secret
- Ensure you're using the Web application credentials (not Desktop or other types)

### "Redirect URI mismatch"

- The redirect URI in your request must exactly match one configured in GCP
- Check for http vs https, trailing slashes, port numbers

---

## Next Steps

Once you have your credentials:

1. Add them to your local `.env` file
2. Add the API Gateway URL to GCP authorized redirect URIs after first deploy
3. Store production credentials in AWS SSM Parameter Store

---

## Reference Links

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools)
- [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Search Console API Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#searchconsole)
