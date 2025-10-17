import { useState } from 'react';
import {
	useCallTool,
	useDisplayMode,
	useMaxHeight,
	useOpenExternal,
	useRequestDisplayMode,
	useSendFollowUpMessage,
	useTheme,
	useToolOutput,
	useWidgetState
} from './hooks';
import type { Transcription, TranscriptionListOutput, TranscriptionWidgetState } from './types';

export function TranscriptionList() {
  const toolOutput = useToolOutput<TranscriptionListOutput>();
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const callTool = useCallTool();
  const sendFollowUp = useSendFollowUpMessage();
  const openExternal = useOpenExternal();
  const requestDisplayMode = useRequestDisplayMode();
  
  const [widgetState, setWidgetState] = useWidgetState<TranscriptionWidgetState>({
    selectedId: null,
    expandedIds: []
  });

  const [copiedId, setCopiedId] = useState<number | null>(null);

  const transcriptions = toolOutput?.data || [];
  const selectedId = widgetState?.selectedId || null;
  const expandedIds = widgetState?.expandedIds || [];

  const selectTranscription = async (id: number) => {
    // Load full transcription details
    const response = await callTool('get_transcription', { transcription_id: id });
    setWidgetState({
      ...widgetState,
      selectedId: id
    });
  };

  const goBack = () => {
    setWidgetState({
      ...widgetState,
      selectedId: null
    });
  };

  const toggleExpand = (id: number) => {
    const newExpandedIds = expandedIds.includes(id)
      ? expandedIds.filter((expandedId: number) => expandedId !== id)
      : [...expandedIds, id];
    
    setWidgetState({
      ...widgetState,
      expandedIds: newExpandedIds
    });
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openTranscription = (transcription: Transcription) => {
    if (transcription.video_url) {
      openExternal(transcription.video_url);
    }
  };

  const createReplicationTemplate = (transcription: Transcription) => {
    const template = `Create a video script similar to this transcription:\n\nOriginal Transcription:\n${transcription.transcription || 'N/A'}\n\nPlease help me create a new version with:\n- My niche/topic: [YOUR NICHE]\n- Target audience: [YOUR AUDIENCE]\n- Key message: [YOUR MESSAGE]\n\nMaintain the same structure, hooks, and storytelling techniques.`;
    sendFollowUp(template);
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: '📸',
      tiktok: '🎵',
      youtube: '🎥',
      meta: '📘'
    };
    return icons[platform] || '🎬';
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#EAEAEA' : '#EAEAEA';
  const textColor = isDark ? '#EAEAEA' : '#081428';
  const secondaryTextColor = isDark ? 'rgba(234,234,234,0.6)' : 'rgba(8,20,40,0.6)';
  const borderColor = isDark ? 'rgba(234,234,234,0.1)' : 'rgba(8,20,40,0.1)';
  const cardBg = isDark ? '#2a2a2a' : '#ffffff';
  const brandPurple = '#6942e2';
  const brandTeal = '#28e7c5';
  const headerBg = '#081428';

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: bgColor,
      color: textColor,
      minHeight: '100vh',
      maxHeight: displayMode === 'inline' ? `${maxHeight}px` : 'none',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: headerBg,
        margin: '-20px -20px 24px -20px',
        padding: '16px 20px',
        borderBottom: `1px solid rgba(8,20,40,0.2)`,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {/* Logo Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgb(40, 231, 197)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: '24px',
              height: '24px',
              flexShrink: 0
            }}
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
          
          {/* Logo Text */}
          <span style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            GetTranscribe
          </span>
        </div>
        
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '13px', 
          color: 'rgba(234,234,234,0.7)'
        }}>
          {toolOutput?.total || 0} transcriptions total
        </p>
      </div>
      
      <div style={{ padding: '0 20px 20px 20px' }}>

        {/* Transcriptions List */}
        {transcriptions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: cardBg,
            borderRadius: '16px',
            border: `1px solid ${borderColor}`
          }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>🎬</p>
            <p style={{ fontSize: '18px', margin: '0 0 8px 0', fontWeight: '600', color: textColor }}>
              No transcriptions yet
            </p>
            <p style={{ fontSize: '14px', margin: 0, color: secondaryTextColor }}>
              Create one by sharing a video URL with ChatGPT
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {transcriptions.map((transcription) => {
              const isExpanded = expandedIds.includes(transcription.id);
              const wordCount = transcription.word_count || 0;
              
              return (
                <div
                  key={transcription.id}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Thumbnail and Header Row */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '12px'
                  }}>
                    {/* Thumbnail */}
                    {transcription.thumbnail_url && (
                      <div style={{
                        width: '120px',
                        height: '90px',
                        flexShrink: 0,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: isDark ? 'rgba(234,234,234,0.05)' : 'rgba(8,20,40,0.03)'
                      }}>
                        <img 
                          src={transcription.thumbnail_url} 
                          alt="Video thumbnail"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Header Info */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        {/* Platform Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          backgroundColor: `${brandPurple}20`,
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: brandPurple,
                          textTransform: 'uppercase'
                        }}>
                          <span>{getPlatformIcon(transcription.platform)}</span>
                          <span>{transcription.platform}</span>
                        </div>
                        
                        {/* Date */}
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: secondaryTextColor
                        }}>
                          {formatDate(transcription.created_at)}
                        </p>
                      </div>
                      
                      {/* Stats */}
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '12px',
                        color: secondaryTextColor,
                        flexWrap: 'wrap'
                      }}>
                        {transcription.duration && (
                          <span>⏱️ {Math.round(transcription.duration / 60)}:{String(transcription.duration % 60).padStart(2, '0')}</span>
                        )}
                        {wordCount > 0 && (
                          <span>📝 {wordCount.toLocaleString()} words</span>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Transcription Preview/Full */}
                <div style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: isDark ? 'rgba(234,234,234,0.05)' : 'rgba(8,20,40,0.03)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: textColor,
                  maxHeight: isExpanded ? 'none' : '120px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {transcription.transcription ? (
                    <>
                      {isExpanded ? transcription.transcription : truncateText(transcription.transcription, 200)}
                      {!isExpanded && transcription.transcription.length > 200 && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '40px',
                          background: isDark 
                            ? 'linear-gradient(to bottom, transparent, rgba(42, 42, 42, 1))'
                            : 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 1))'
                        }} />
                      )}
                    </>
                  ) : (
                    <span style={{ color: secondaryTextColor, fontStyle: 'italic' }}>No transcription text available</span>
                  )}
                </div>

                {/* Expand/Collapse Button */}
                {transcription.transcription && transcription.transcription.length > 200 && (
                  <button
                    onClick={() => toggleExpand(transcription.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'transparent',
                      color: brandPurple,
                      border: `1px solid ${brandPurple}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '16px'
                    }}
                  >
                    {isExpanded ? '▲ Show Less' : '▼ Show Full Transcription'}
                  </button>
                )}

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => copyToClipboard(transcription.transcription || '', transcription.id)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: copiedId === transcription.id ? brandTeal : 'transparent',
                      color: copiedId === transcription.id ? '#081428' : textColor,
                      border: `1px solid ${copiedId === transcription.id ? brandTeal : borderColor}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copiedId === transcription.id ? '✓ Copied!' : '📋 Copy Text'}
                  </button>
                  
                  <button
                    onClick={() => openTranscription(transcription)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: 'transparent',
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    🔗 Open Video
                  </button>
                  
                  <button
                    onClick={() => createReplicationTemplate(transcription)}
                    style={{
                      padding: '10px 16px',
                      background: `linear-gradient(135deg, ${brandPurple} 0%, ${brandTeal} 100%)`,
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    ✨ Create Replication Template
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {transcriptions.length > 0 && toolOutput?.total && toolOutput.total > transcriptions.length && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: cardBg,
            borderRadius: '12px',
            border: `1px solid ${borderColor}`,
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: secondaryTextColor }}>
              Showing {transcriptions.length} of {toolOutput.total} transcriptions
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: secondaryTextColor }}>
              Ask ChatGPT to "show more transcriptions" or "load next page"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

