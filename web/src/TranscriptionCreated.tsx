import { useState } from 'react';
import {
	useDisplayMode,
	useMaxHeight,
	useOpenExternal,
	useSendFollowUpMessage,
	useTheme,
	useToolOutput
} from './hooks';
import type { Transcription } from './types';

export function TranscriptionCreated() {
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

  if (!transcription) {
    return (
      <div style={{
        fontFamily: 'all-round-gothic, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
      fontFamily: 'all-round-gothic, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      backgroundColor: bgColor,
      color: textColor,
      minHeight: '100vh',
      maxHeight: displayMode === 'inline' ? `${maxHeight}px` : 'none',
      overflow: 'auto',
      padding: '20px 16px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>

        {/* Success Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${brandPurple} 0%, ${brandTeal} 100%)`,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          color: 'white',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
            Transcription Created Successfully!
          </h2>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Your video has been transcribed and is ready to use
          </p>
        </div>

        {/* Video Preview Card */}
        {transcription.thumbnail_url && (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '20px',
            boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.08)'
          }}>
            <img 
              src={transcription.thumbnail_url} 
              alt="Video thumbnail"
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover'
              }}
            />
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
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
                {transcription.language && (
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: isDark ? 'rgba(234,234,234,0.1)' : 'rgba(8,20,40,0.05)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: secondaryTextColor
                  }}>
                    🌐 {transcription.language.toUpperCase()}
                  </div>
                )}
              </div>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '18px', 
                fontWeight: '600',
                color: textColor 
              }}>
                {transcription.video_title}
              </h3>
              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '13px',
                color: secondaryTextColor,
                flexWrap: 'wrap'
              }}>
                {transcription.duration && (
                  <span>⏱️ {Math.floor(transcription.duration / 60)}:{String(transcription.duration % 60).padStart(2, '0')}</span>
                )}
                {transcription.word_count && (
                  <span>📝 {transcription.word_count.toLocaleString()} words</span>
                )}
                <span>📅 {formatDate(transcription.created_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: displayMode === 'fullscreen' ? 'repeat(3, 1fr)' : '1fr',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🆔</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: brandPurple, marginBottom: '4px' }}>
              #{transcription.id}
            </div>
            <div style={{ fontSize: '12px', color: secondaryTextColor }}>
              Transcription ID
            </div>
          </div>
          
          {transcription.word_count && (
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>📝</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: brandTeal, marginBottom: '4px' }}>
                {transcription.word_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: secondaryTextColor }}>
                Words
              </div>
            </div>
          )}
          
          {transcription.duration && (
            <div style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>⏱️</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: brandPurple, marginBottom: '4px' }}>
                {Math.floor(transcription.duration / 60)}:{String(transcription.duration % 60).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '12px', color: secondaryTextColor }}>
                Duration
              </div>
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
              Full Transcription
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

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: displayMode === 'fullscreen' ? 'repeat(2, 1fr)' : '1fr',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <button
            onClick={createReplicationTemplate}
            style={{
              padding: '16px 20px',
              background: `linear-gradient(135deg, ${brandPurple} 0%, ${brandTeal} 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '20px' }}>✨</span>
            <span>Create Replication Template</span>
          </button>

          <button
            onClick={analyzeTranscription}
            style={{
              padding: '16px 20px',
              backgroundColor: 'transparent',
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '20px' }}>🧠</span>
            <span>Analyze with AI</span>
          </button>
        </div>

        {/* Video Link */}
        {transcription.video_url && (
          <button
            onClick={() => openExternal(transcription.video_url)}
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: cardBg,
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            <span style={{ fontSize: '20px' }}>🔗</span>
            <span>Open Original Video</span>
          </button>
        )}
      </div>
    </div>
  );
}

