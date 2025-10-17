import { formatTranscriptionList } from '../../component-helper.js';
import { API_URL, DEFAULT_API_KEY } from '../config/environment.js';
import { createClient } from '../utils/client.js';

export async function handleToolCall(name, args, httpApiKey = null) {
  try {
    console.error(`🚀 [MCP] Calling tool: ${name}`);

    const apiKey = httpApiKey || DEFAULT_API_KEY;

    if (!apiKey) {
      const errorMsg = httpApiKey !== null 
        ? `❌ API key required. Please provide x-api-key header when making requests to /mcp endpoint, or set GETTRANSCRIBE_API_KEY environment variable.`
        : `❌ API key required. Please set GETTRANSCRIBE_API_KEY environment variable.`;
      
      return {
        content: [{
          type: "text",
          text: errorMsg
        }],
        isError: true
      };
    }

    const client = createClient(apiKey);
    const cleanArgs = args || {};

    if (name === 'search') {
      const response = await client.post('/mcp', {
        method: 'tools/call',
        params: {
          name: 'list_transcriptions',
          arguments: {
            limit: 10,
            ...cleanArgs
          }
        }
      });

      const responseText = response.data?.content?.[0]?.text || '';
      const transcriptionMatches = responseText.match(/\*\*\d+\. ID: \d+\*\* \([^)]+\)[\s\S]*?🔗 [^\n.]+/g) || [];
      const results = transcriptionMatches.map(match => {
        const idMatch = match.match(/\*\*\d+\. ID: (\d+)\*\*/);
        const platformMatch = match.match(/\*\* \(([^)]+)\)/);
        const urlMatch = match.match(/🔗 ([^\n]+)/);
        
        const id = idMatch?.[1] || 'unknown';
        const platform = platformMatch?.[1] || 'unknown';
        const url = urlMatch?.[1]?.replace(/\.\.\.$/, '') || `${API_URL}/transcriptions/${id}`;
        
        return {
          id: id,
          title: `${platform} Transcription ${id}`,
          url: url
        };
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ results })
        }]
      };
    }

    if (name === 'fetch') {
      const transcriptionId = cleanArgs.id;
      const response = await client.post('/mcp', {
        method: 'tools/call',
        params: {
          name: 'get_transcription',
          arguments: {
            transcription_id: parseInt(transcriptionId)
          }
        }
      });

      const responseText = response.data?.content?.[0]?.text || '';
      const result = {
        id: String(transcriptionId),
        title: `Transcription ${transcriptionId}`,
        text: responseText,
        url: `${API_URL}/transcriptions/${transcriptionId}`,
        metadata: {
          source: 'gettranscribe_mcp'
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };
    }

    const response = await client.post('/mcp', {
      method: 'tools/call',
      params: {
        name,
        arguments: cleanArgs
      }
    });

    if ((name === 'list_transcriptions' || name === 'get_transcription' || name === 'create_transcription') && response.data?.content?.[0]?.text) {
      try {
        const responseText = response.data.content[0].text;
        let toolOutput;
        
        try {
          toolOutput = JSON.parse(responseText);
        } catch (parseError) {
          console.error('⚠️ Backend returned formatted text, not JSON. Skipping UI component.');
          return response.data;
        }
        
        let textSummary;
        if (name === 'list_transcriptions') {
          textSummary = formatTranscriptionList(toolOutput);
        } else if (name === 'get_transcription' || name === 'create_transcription') {
          const prefix = name === 'create_transcription' ? '✅ **Transcription Created!**\n\n📄 **Transcription #' : '📄 **Transcription #';
          textSummary = `${prefix}${toolOutput.id}**\n\n`;
          textSummary += `**Platform:** ${toolOutput.platform}\n`;
          if (toolOutput.duration) textSummary += `**Duration:** ${Math.floor(toolOutput.duration / 60)}:${String(toolOutput.duration % 60).padStart(2, '0')}\n`;
          if (toolOutput.word_count) textSummary += `**Word Count:** ${toolOutput.word_count}\n`;
          if (toolOutput.language) textSummary += `**Language:** ${toolOutput.language.toUpperCase()}\n`;
          textSummary += `**Created:** ${new Date(toolOutput.created_at).toLocaleDateString()}\n\n`;
          if (toolOutput.transcription) {
            textSummary += `**Transcription:**\n${toolOutput.transcription}\n\n`;
          }
          if (toolOutput.video_url) textSummary += `**URL:** ${toolOutput.video_url}`;
        }
        
        let outputTemplate, invoking, invoked;
        if (name === 'list_transcriptions') {
          outputTemplate = "ui://widget/transcription-list.html";
          invoking = "Loading transcriptions";
          invoked = "Transcriptions loaded";
        } else if (name === 'create_transcription') {
          outputTemplate = "ui://widget/transcription-created.html";
          invoking = "Creating transcription...";
          invoked = "Transcription created successfully!";
        } else {
          outputTemplate = "ui://widget/transcription-detail.html";
          invoking = "Loading transcription";
          invoked = "Transcription loaded";
        }
        
        return {
          content: [
            {
              type: "text",
              text: textSummary
            }
          ],
          structuredContent: toolOutput,
          _meta: {
            "openai/outputTemplate": outputTemplate,
            "openai/toolInvocation/invoking": invoking,
            "openai/toolInvocation/invoked": invoked,
            "openai/widgetAccessible": true,
            "openai/resultCanProduceWidget": true
          }
        };
      } catch (error) {
        console.error('⚠️ Failed to create UI component:', error);
        return response.data;
      }
    }

    return response.data;

  } catch (error) {
    console.error(`❌ [MCP] Error calling tool ${name}:`, error.message);
    
    return {
      content: [{
        type: "text",
        text: `❌ Error calling ${name}: ${error.response?.data?.message || error.message}`
      }],
      isError: true
    };
  }
}

