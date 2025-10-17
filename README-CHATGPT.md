# 🤖 GetTranscribe MCP Server - ChatGPT Setup Guide

Connect GetTranscribe to ChatGPT to create, search, and manage video transcriptions from Instagram, TikTok, YouTube, and Meta directly in your conversations.

> **Note:** ChatGPT requires OAuth 2.0 authentication and uses Dynamic Client Registration (RFC 7591).

## 🚀 Quick Setup

### Step 1: Get Your GetTranscribe API Key
1. Go to [gettranscribe.ai](https://www.gettranscribe.ai)
2. Sign up or log in to your account
3. Navigate to your account settings or API section
4. Copy your API key (starts with `gtr_`)

### Step 2: Add GetTranscribe to ChatGPT
1. Open ChatGPT
2. Click on your profile → **Settings** → **Beta Features**
3. Enable **"Third-party GPT Actions"** if not already enabled
4. Create a new GPT or edit an existing one
5. In the GPT configuration, add an Action with these details:

**Option A: Use the base URL (Recommended)**
```
Base URL: https://gettranscribe-mcp-server.onrender.com
```

ChatGPT will automatically discover all OAuth endpoints via the `.well-known/oauth-authorization-server` endpoint.

**Option B: Manual Configuration**
```
Name: GetTranscribe
Description: Create and manage video transcriptions from social media
MCP Server URL: https://gettranscribe-mcp-server.onrender.com/mcp

OAuth 2.0 Settings (Dynamic Client Registration):
- Discovery URL: https://gettranscribe-mcp-server.onrender.com/.well-known/oauth-authorization-server
- Authorization URL: https://gettranscribe-mcp-server.onrender.com/oauth/authorize
- Token URL: https://gettranscribe-mcp-server.onrender.com/oauth/token
- Registration URL: https://gettranscribe-mcp-server.onrender.com/oauth/register

Note: Client ID and Secret are automatically generated via Dynamic Client Registration
```

### Step 3: Authorize Access
1. After adding the action, click **"Authenticate"** or **"Connect"**
2. ChatGPT will automatically register itself as an OAuth client
3. You'll be redirected to the GetTranscribe authorization page
4. Enter your GetTranscribe API key (from Step 1)
5. Click **"✅ Authorize Access"**
6. You'll be redirected back to ChatGPT with a success confirmation

## ✅ You're Ready!

Now you can use GetTranscribe directly in ChatGPT conversations:

### 🎥 Create Transcriptions
```
"Transcribe this Instagram reel: https://www.instagram.com/reel/..."
"Create a transcription from this TikTok: https://www.tiktok.com/..."
"Transcribe this YouTube video: https://www.youtube.com/watch?v=..."
```

### 📋 Browse & Search
```
"Show my recent transcriptions"
"List all my YouTube transcriptions"
"Show transcriptions from folder ID 5"
```

### 📄 Get Full Content
```
"Get the full transcription for ID 490"
"Show me transcription 525 with timestamps"
```

### 📁 Organize with Folders
```
"Create a new folder called 'Marketing Videos'"
"List all my folders"
"Show folder ID 3 contents"
```

### 🎯 Advanced AI Integration
```
"Transcribe this video and summarize the key points"
"Get transcription 490 and translate it to Spanish"
"Find all my cooking videos and create a recipe collection"
"Transcribe this video, extract main topics, and create bullet points"
```

## 🛠️ Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `create_transcription` | Create new transcription from video URL | "Transcribe https://instagram.com/reel/..." |
| `get_transcription` | Get complete transcription by ID | "Show transcription 123" |
| `list_transcriptions` | Browse and filter transcriptions | "List my Instagram transcriptions" |
| `create_transcription_folder` | Create a folder to organize transcriptions | "Create folder 'Interviews'" |
| `get_transcription_folder` | Get folder details and contents | "Show folder 5" |
| `list_transcription_folders` | List all your folders | "Show all my folders" |

## 🔒 Privacy & Security

- **Dynamic Client Registration**: Each ChatGPT connection gets unique OAuth credentials
- **Secure Token Exchange**: Your API key is never exposed to ChatGPT directly
- **Encrypted Communication**: All requests use HTTPS/TLS encryption
- **Access Tokens**: Short-lived tokens (24 hours) with automatic refresh
- **Revocable Access**: Disconnect anytime from your ChatGPT GPT settings
- **Your Data**: Only you have access to your transcriptions via your API key

## 🆘 Troubleshooting

### "Token exchange failed" or "400 Bad Request"
- This was a known issue that has been fixed in the latest version
- Make sure the server has the `express.urlencoded()` middleware
- The server should be running version 1.2.3 or higher

### "Unable to connect to GetTranscribe"
- Verify your API key is correct and active at [gettranscribe.ai](https://www.gettranscribe.ai)
- Check that the server URL is correct: `https://gettranscribe-mcp-server.onrender.com`
- Try disconnecting and reconnecting the GPT Action

### "API key invalid" or "Authorization failed"
- Get a fresh API key from your GetTranscribe account
- Make sure your API key starts with `gtr_`
- Re-authorize the connection by clicking "Authenticate" in ChatGPT

### "No transcriptions found"
- Create some transcriptions first at [gettranscribe.ai](https://www.gettranscribe.ai)
- Or use ChatGPT to create transcriptions: "Transcribe this video: [URL]"
- Try using `list_transcriptions` without filters first

### OAuth Registration Issues
- The server supports Dynamic Client Registration (RFC 7591)
- ChatGPT automatically registers and gets unique credentials
- If registration fails, check server logs for detailed error messages

## 📞 Support

Need help? Contact us:
- 📧 Email: support@gettranscribe.ai
- 🌐 Website: [gettranscribe.ai](https://gettranscribe.ai)
- 📚 Documentation: [docs.gettranscribe.ai](https://docs.gettranscribe.ai)

---

**🎥 Start transcribing videos and unlock the power of searchable content with ChatGPT!**
