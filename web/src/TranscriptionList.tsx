import React, { useState } from 'react';
import {
  useToolOutput,
  useWidgetState,
  useTheme,
  useDisplayMode,
  useMaxHeight,
  useCallTool,
  useSendFollowUpMessage,
  useOpenExternal,
  useRequestDisplayMode
} from './hooks';
import type { TranscriptionListOutput, TranscriptionWidgetState, Transcription } from './types';

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
    favorites: [],
    filters: {}
  });

  const transcriptions = toolOutput?.data || [];
  const favorites = widgetState?.favorites || [];

  const toggleFavorite = (id: number) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter(fav => fav !== id)
      : [...favorites, id];
    
    setWidgetState({
      ...widgetState,
      favorites: newFavorites
    });
  };

  const openTranscription = (transcription: Transcription) => {
    if (transcription.video_url) {
      openExternal(transcription.video_url);
    }
  };

  const viewFullscreen = () => {
    requestDisplayMode('fullscreen');
  };

  const summarizeTranscription = (transcription: Transcription) => {
    sendFollowUp(`Summarize transcription ${transcription.id} with key points`);
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

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: '#E4405F',
      tiktok: '#000000',
      youtube: '#FF0000',
      meta: '#1877F2'
    };
    return colors[platform] || '#6942e2';
  };

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#081428';
  const secondaryTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(8,20,40,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(8,20,40,0.1)';
  const cardBg = isDark ? '#2a2a2a' : '#ffffff';

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: bgColor,
      color: textColor,
      minHeight: '100vh',
      padding: displayMode === 'inline' ? '16px' : '24px',
      maxHeight: displayMode === 'inline' ? `${maxHeight}px` : 'none',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            🎥 My Transcriptions
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: secondaryTextColor }}>
            {toolOutput?.total || 0} transcriptions
          </p>
        </div>
        {displayMode === 'inline' && (
          <button
            onClick={viewFullscreen}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6942e2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Fullscreen ⛶
          </button>
        )}
      </div>

      {/* Transcriptions Grid */}
      {transcriptions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: secondaryTextColor
        }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>🎬</p>
          <p style={{ fontSize: '16px', margin: '0 0 8px 0', fontWeight: '500' }}>
            No transcriptions yet
          </p>
          <p style={{ fontSize: '14px', margin: 0 }}>
            Create one by sharing a video URL with ChatGPT
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: displayMode === 'fullscreen' 
            ? 'repeat(auto-fill, minmax(320px, 1fr))'
            : '1fr',
          gap: '16px'
        }}>
          {transcriptions.map((transcription) => {
            const isFavorite = favorites.includes(transcription.id);
            
            return (
              <div
                key={transcription.id}
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
              >
                {/* Platform Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  backgroundColor: getPlatformColor(transcription.platform) + '20',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginBottom: '12px',
                  color: getPlatformColor(transcription.platform)
                }}>
                  <span>{getPlatformIcon(transcription.platform)}</span>
                  <span>{transcription.platform}</span>
                </div>

                {/* Title */}
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {transcription.video_title || `Transcription ${transcription.id}`}
                </h3>

                {/* Metadata */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: secondaryTextColor
                }}>
                  {transcription.language && (
                    <span>🌐 {transcription.language.toUpperCase()}</span>
                  )}
                  {transcription.duration && (
                    <span>⏱️ {Math.round(transcription.duration / 60)}m</span>
                  )}
                  <span>📅 {new Date(transcription.created_at).toLocaleDateString()}</span>
                </div>

                {/* Transcription Preview */}
                {transcription.transcription && (
                  <p style={{
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: secondaryTextColor,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.5'
                  }}>
                    {transcription.transcription}
                  </p>
                )}

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => toggleFavorite(transcription.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isFavorite ? '#28e7c5' : 'transparent',
                      color: isFavorite ? '#081428' : textColor,
                      border: `1px solid ${isFavorite ? '#28e7c5' : borderColor}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isFavorite ? '⭐ Saved' : '☆ Save'}
                  </button>
                  
                  <button
                    onClick={() => openTranscription(transcription)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    🔗 Open Video
                  </button>
                  
                  <button
                    onClick={() => summarizeTranscription(transcription)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#6942e2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    ✨ Summarize
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer with favorites count */}
      {favorites.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#28e7c5' + '20',
          borderRadius: '12px',
          border: '1px solid #28e7c5',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#28e7c5', fontWeight: '500' }}>
            ⭐ {favorites.length} favorite{favorites.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      )}
    </div>
  );
}

