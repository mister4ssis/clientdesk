interface OfflineSessionNoticeProps {
  visible: boolean;
}

export function OfflineSessionNotice({ visible }: OfflineSessionNoticeProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="offline-session-notice" role="status">
      Você está usando o ClientDesk offline. As alterações serão sincronizadas quando a sessão e a
      conexão forem restabelecidas.
    </div>
  );
}
