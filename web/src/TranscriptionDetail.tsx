import React, { useState } from 'react';
import {
  useToolOutput,
  useTheme,
  useDisplayMode,
  useMaxHeight,
  useSendFollowUpMessage,
  useOpenExternal
} from './hooks';
import type { Transcription } from './types';

export function TranscriptionDetail() {
  const toolOutput = useToolOutput<Transcription>();
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const sendFollowUp = useSendFollowUpMessage();
  const openExternal = useOpenExternal();

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const transcription = toolOutput;

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const createReplicationTemplate = () => {
    if (!transcription) return;
    const template = `Create a video script similar to this transcription:\n\nOriginal Transcription:\n${transcription.transcription || 'N/A'}\n\nPlease help me create a new version with:\n- My niche/topic: [YOUR NICHE]\n- Target audience: [YOUR AUDIENCE]\n- Key message: [YOUR MESSAGE]\n\nMaintain the same structure, hooks, and storytelling techniques.`;
    sendFollowUp(template);
  };

  const analyzeTranscription = () => {
    if (!transcription) return;
    sendFollowUp(`Analyze this transcription and provide:\n1. Hook analysis\n2. Script structure\n3. Psychological triggers used\n4. Content improvement suggestions\n\nTranscription ID: ${transcription.id}`);
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

  if (!transcription) {
    return (
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: bgColor,
        color: '#081428',
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: secondaryTextColor }}>No transcription data available</p>
      </div>
    );
  }

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
          gap: '6px',
          marginBottom: '8px'
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
          margin: 0, 
          fontSize: '13px', 
          color: 'rgba(234,234,234,0.7)'
        }}>
          Transcription #{transcription.id} • {transcription.video_title || `${transcription.platform} video`}
        </p>
      </div>
      
      <div style={{ padding: '0 20px 20px 20px' }}>

      {/* Video Info Card */}
      <div style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: textColor
        }}>
          Video Information
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: displayMode === 'fullscreen' ? 'repeat(2, 1fr)' : '1fr',
          gap: '16px'
        }}>
          {/* Platform */}
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: secondaryTextColor, fontWeight: '600' }}>
              PLATFORM
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: `${brandPurple}20`,
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              color: brandPurple,
              textTransform: 'uppercase'
            }}>
              <span>{getPlatformIcon(transcription.platform)}</span>
              <span>{transcription.platform}</span>
            </div>
          </div>

          {/* Duration */}
          {transcription.duration && (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: secondaryTextColor, fontWeight: '600' }}>
                DURATION
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: textColor }}>
                ⏱️ {Math.floor(transcription.duration / 60)}:{String(transcription.duration % 60).padStart(2, '0')}
              </p>
            </div>
          )}

          {/* Word Count */}
          {transcription.word_count && (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: secondaryTextColor, fontWeight: '600' }}>
                WORD COUNT
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: textColor }}>
                📝 {transcription.word_count.toLocaleString()} words
              </p>
            </div>
          )}

          {/* Language */}
          {transcription.language && (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: secondaryTextColor, fontWeight: '600' }}>
                LANGUAGE
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: textColor }}>
                🌐 {transcription.language.toUpperCase()}
              </p>
            </div>
          )}

          {/* Created Date */}
          <div style={{ gridColumn: displayMode === 'fullscreen' ? 'span 2' : 'span 1' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: secondaryTextColor, fontWeight: '600' }}>
              CREATED
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: textColor }}>
              📅 {formatDate(transcription.created_at)}
            </p>
          </div>
        </div>

        {/* Video URL */}
        {transcription.video_url && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${borderColor}` }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: secondaryTextColor, fontWeight: '600' }}>
              VIDEO URL
            </p>
            <button
              onClick={() => openExternal(transcription.video_url)}
              style={{
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: brandPurple,
                border: `1px solid ${brandPurple}`,
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                width: '100%',
                textAlign: 'left'
              }}
            >
              🔗 {transcription.video_url}
            </button>
          </div>
        )}
      </div>

      {/* Transcription Text Card */}
      <div style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: textColor
          }}>
            Transcription
          </h2>
          <button
            onClick={() => copyToClipboard(transcription.transcription || '', 'transcription')}
            style={{
              padding: '8px 14px',
              backgroundColor: copiedSection === 'transcription' ? brandTeal : 'transparent',
              color: copiedSection === 'transcription' ? '#081428' : textColor,
              border: `1px solid ${copiedSection === 'transcription' ? brandTeal : borderColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            {copiedSection === 'transcription' ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: isDark ? 'rgba(234,234,234,0.05)' : 'rgba(8,20,40,0.03)',
          borderRadius: '12px',
          fontSize: '14px',
          lineHeight: '1.7',
          color: textColor,
          maxHeight: '400px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}>
          {transcription.transcription || (
            <span style={{ color: secondaryTextColor, fontStyle: 'italic' }}>
              No transcription text available
            </span>
          )}
        </div>
      </div>

      {/* Actions Card */}
      <div style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '16px',
        padding: '20px',
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: textColor
        }}>
          Actions
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            onClick={createReplicationTemplate}
            style={{
              padding: '14px 20px',
              background: `linear-gradient(135deg, ${brandPurple} 0%, ${brandTeal} 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
          >
            ✨ Create Replication Template
          </button>

          <button
            onClick={analyzeTranscription}
            style={{
              padding: '14px 20px',
              backgroundColor: 'transparent',
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
          >
            🧠 Analyze with AI
          </button>

          {transcription.video_url && (
            <button
              onClick={() => openExternal(transcription.video_url)}
              style={{
                padding: '14px 20px',
                backgroundColor: 'transparent',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
            >
              🔗 Open Original Video
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}


