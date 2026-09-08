import type { RemoteVersion } from '../hooks/useAppUpdate'

type UpdateBannerProps = {
  remote: RemoteVersion
  stuck: boolean
  alreadyCurrent: boolean
  standalone: boolean
  onReload: () => void
  onDismiss: () => void
}

export function UpdateBanner({
  remote,
  stuck,
  alreadyCurrent,
  standalone,
  onReload,
  onDismiss,
}: UpdateBannerProps) {
  return (
    <div className="update-banner" role="status">
      <p className="update-banner-title">{remote.title?.trim() || 'Новая версия'}</p>
      {stuck ? (
        <>
          <p className="update-banner-text">
            Версия не сменилась. Полностью закройте «Покупки» (смахните вверх из списка программ) и
            откройте снова{standalone ? ' с «Домой»' : ''}. Ярлык не удаляйте.
          </p>
          {standalone ? (
            <p className="update-banner-text">
              Если номер внизу экрана всё ещё старый — откройте ту же ссылку в Safari и обновите
              страницу. Потом зайдите с ярлыка. Код семьи вводите только внутри ярлыка.
            </p>
          ) : null}
          <div className="update-banner-actions">
            <button type="button" className="button-primary" onClick={onDismiss}>
              Понятно
            </button>
          </div>
        </>
      ) : alreadyCurrent ? (
        <>
          {remote.notes?.trim() ? (
            <p className="update-banner-text">{remote.notes.trim()}</p>
          ) : (
            <p className="update-banner-text">Программа уже обновлена.</p>
          )}
          <div className="update-banner-actions">
            <button type="button" className="button-primary" onClick={onDismiss}>
              Понятно
            </button>
          </div>
        </>
      ) : (
        <>
          {remote.notes?.trim() ? (
            <p className="update-banner-text">{remote.notes.trim()}</p>
          ) : null}
          <p className="update-banner-text">
            Нажмите «Обновить». Если цифра версии внизу экрана не изменится — полностью закройте
            программу и откройте снова. Ярлык не удаляйте.
          </p>
          <div className="update-banner-actions">
            <button type="button" className="button-primary" onClick={onReload}>
              Обновить
            </button>
            <button type="button" className="button-secondary" onClick={onDismiss}>
              Позже
            </button>
          </div>
        </>
      )}
    </div>
  )
}
