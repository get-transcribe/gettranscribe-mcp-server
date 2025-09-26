# 🤖 GetTranscribe MCP Server - ChatGPT Setup Guide

Connect GetTranscribe to ChatGPT to search and fetch video transcriptions from Instagram, TikTok, YouTube, and Meta directly in your conversations.

> **Note:** ChatGPT requires OAuth 2.0 authentication. For OpenAI API with custom headers, see the main [README.md](README.md).

## 🚀 Quick Setup

### Step 1: Get Your GetTranscribe API Key
1. Go to [gettranscribe.ai](https://gettranscribe.ai)
2. Sign up or log in to your account
3. Navigate to API settings
4. Copy your API key (starts with `gtr_`)

### Step 2: Add GetTranscribe Connector to ChatGPT
1. Open ChatGPT
2. Go to **Settings** → **Features** → **Third-party plugins/connectors**
3. Click **"Add Connector"**
4. Fill in the connector details:

```
Name: GetTranscribe
Description: Search and fetch video transcriptions from social media platforms
Server URL: https://gettranscribe-mcp-server.onrender.com/mcp
Authentication: OAuth 2.0

OAuth Settings:
- Authorization URL: https://gettranscribe-mcp-server.onrender.com/oauth/authorize
- Token URL: https://gettranscribe-mcp-server.onrender.com/oauth/token
- Client ID: gettranscribe-mcp
- Client Secret: mcp-secret-2024
```

### Step 3: Authorize Access
1. After adding the connector, click **"Connect"**
2. You'll be redirected to GetTranscribe authorization page
3. Enter your GetTranscribe API key (from Step 1)
4. Click **"Authorize Access"**
5. You'll be redirected back to ChatGPT

## ✅ You're Ready!

Now you can use GetTranscribe directly in ChatGPT:

### 🔍 Search Transcriptions
```
"Search for transcriptions about marketing"
"Find Instagram videos about cooking"
"Show me recent TikTok transcriptions"
```

### 📄 Get Full Transcription
```
"Get the full transcription for ID 490"
"Fetch transcription content for video 525"
```

### 🎯 Advanced Usage
```
"Search for transcriptions and summarize the key points"
"Find cooking videos and create a recipe list"
"Get transcription 490 and translate it to Spanish"
```

## 🛠️ Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `search` | Find transcriptions by keywords | "Search for fitness videos" |
| `fetch` | Get complete transcription content | "Fetch transcription 123" |
| `create_transcription` | Create new transcription from URL | "Transcribe this Instagram reel: [URL]" |
| `list_transcriptions` | Browse your transcriptions | "Show my recent transcriptions" |

## 🔒 Privacy & Security

- Your API key is securely stored and encrypted
- Only you have access to your transcriptions
- All communication is encrypted (HTTPS)
- You can revoke access anytime from ChatGPT settings

## 🆘 Troubleshooting

### "Unable to connect to GetTranscribe"
- Check your API key is correct and active
- Make sure you have transcriptions in your account
- Try disconnecting and reconnecting the connector

### "API key invalid"
- Get a fresh API key from gettranscribe.ai
- Re-authorize the connection with the new key

### "No transcriptions found"
- Create some transcriptions first at gettranscribe.ai
- Try broader search terms

## 📞 Support

Need help? Contact us:
- 📧 Email: support@gettranscribe.ai
- 🌐 Website: [gettranscribe.ai](https://gettranscribe.ai)
- 📚 Documentation: [docs.gettranscribe.ai](https://docs.gettranscribe.ai)

---

**🎥 Start transcribing videos and unlock the power of searchable content with ChatGPT!**
