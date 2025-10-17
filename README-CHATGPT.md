# 🤖 GetTranscribe MCP Server - ChatGPT Setup Guide

Connect GetTranscribe to ChatGPT to create, search, and manage video transcriptions from Instagram, TikTok, YouTube, and Meta directly in your conversations.

> **Note:** ChatGPT requires OAuth 2.0 authentication and uses Dynamic Client Registration (RFC 7591).

## 🚀 Quick Setup

### Step 1: Get Your GetTranscribe API Key
1. Go to [gettranscribe.ai](https://www.gettranscribe.ai)
2. Sign up or log in to your account
3. Navigate to your account settings or API section
4. Copy your API key (starts with `gtr_`)

### Step 2: Add GetTranscribe Connector to ChatGPT
1. Open ChatGPT
2. Click on your profile → **Settings** → **Developer mode**
3. Enable **"Developer mode"** if not already enabled
4. Click **"Add connector"**
5. Fill in the connector details:

```
Name: GetTranscribe
Description: Create and manage video transcriptions from social media platforms
MCP Server URL: https://gettranscribe-mcp-server.onrender.com/mcp
```

6. ChatGPT will automatically discover OAuth endpoints via `.well-known/oauth-authorization-server`
7. Click **"Save"** or **"Add connector"**

> **Note:** ChatGPT uses Dynamic Client Registration (RFC 7591) and will automatically get unique OAuth credentials.

### Step 3: Authorize the Connector
1. After adding the connector, you'll be prompted to authorize
2. ChatGPT will automatically register itself as an OAuth client
3. You'll be redirected to the GetTranscribe authorization page
4. Enter your GetTranscribe API key from Step 1 (starts with `gtr_`)
5. Click **"✅ Authorize Access"**
6. You'll be redirected back to ChatGPT

### Step 4: Enable in Conversations
1. Open a new chat in ChatGPT
2. Click the **+** button near the message composer
3. Choose **"Developer mode"**
4. Toggle **ON** the GetTranscribe connector in the list
5. The connector is now available for the assistant to use!

### Step 5: Test the Integration
To validate everything is working, try this prompt:

```
"Use the GetTranscribe connector to show my recent transcriptions"
```

ChatGPT will:
- Display the tool call payload in the UI
- Show the request being made to GetTranscribe
- Display the results from your account

> **📊 Debugging:** ChatGPT shows all tool-call payloads so you can confirm inputs and outputs. This is helpful for validating the integration.

## ✅ You're Ready!

Now you can use GetTranscribe directly in ChatGPT conversations:

> **💡 Pro Tip:** For initial testing, explicitly mention the connector: *"Use the GetTranscribe connector to show my transcriptions"*. Once working, ChatGPT will automatically use it when needed.

> **⚠️ Write Operations:** Creating transcriptions requires manual confirmation unless you choose "Remember this approval" for the conversation.

### 🎥 Create Transcriptions
```
"Use GetTranscribe to transcribe this Instagram reel: https://www.instagram.com/reel/..."
"Transcribe this TikTok: https://www.tiktok.com/..."
"Create a transcription from this YouTube video: https://www.youtube.com/watch?v=..."
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
