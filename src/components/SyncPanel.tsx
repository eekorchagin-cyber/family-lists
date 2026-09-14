import { useEffect, useRef, useState } from 'react'
import type { AccessInfo } from '../data/sync/api'
import { formatCode, joinUrl, kindFromCode, pairUrl } from '../data/sync/codes'
import { saveSupabaseConfig } from '../data/sync/client'
import type { HomeMember, SyncSession } from '../data/sync/session'
import { CodeJoinDialog } from './CodeJoinDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { ConnectSteps } from './ConnectSteps'
import { NameDialog } from './NameDialog'
import { QrImage } from './QrImage'
import { SyncPhoneGuide } from './SyncPhoneGuide'

type SyncPanelProps = {
  configured: boolean
  session: SyncSession | null
  members: HomeMember[]
  inviteCode: string | null
  pairingCode: string | null
  accessInfo: AccessInfo | null
  busy: boolean
  error: string | null
  initialCode?: string | null
  onConnect: (code: string, name?: string) => Promise<'need-name' | 'error' | 'already' | void>
  onCreateInvite: () => void
  onCreateAccess: () => void
  onCreatePairing: () => void
  onExclude: (userId: string) => void
  onReclaim: () => void
  onLeave: () => void
  onRetry: () => void
  onClearCode: () => void
  onClearError: () => void
}

export function SyncPanel({
  configured,
  session,
  members,
  inviteCode,
  pairingCode,
  accessInfo,
  busy,
  error,
  initialCode,
  onConnect,
  onCreateInvite,
  onCreateAccess,
  onCreatePairing,
  onExclude,
  onReclaim,
  onLeave,
  onRetry,
  onClearCode,
  onClearError,
}: SyncPanelProps) {
  const [entering, setEntering] = useState(Boolean(initialCode))
  const [excluding, setExcluding] = useState<HomeMember | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [copied, setCopied] = useState<'code' | 'link' | 'pair' | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [cloudUrl, setCloudUrl] = useState('')
  const [cloudKey, setCloudKey] = useState('')
  const [cloudError, setCloudError] = useState<string | null>(null)

  async function copy(text: string, kind: 'code' | 'link' | 'pair') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
    } catch {
      setCopied(null)
    }
  }

  function saveCloudKeys() {
    const url = cloudUrl.trim().replace(/\/$/, '')
    const anonKey = cloudKey.trim()
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
      setCloudError('Нужен Project URL вида https://xxxx.supabase.co')
      return
    }
    if (anonKey.length < 20) {
      setCloudError('Вставьте anon public key из Supabase → Settings → API')
      return
    }
    saveSupabaseConfig({ url, anonKey })
    window.location.reload()
  }

  if (!configured) {
    return (
      <section className="settings-block">
        <p className="hint">
          Синхронизация на сайте выключена: в сборке нет ключей Supabase. Вставьте их ниже на
          обоих телефонах (это публичный anon-ключ). Почту подключать не нужно.
        </p>
        <label className="field">
          <span>Project URL</span>
          <input
            value={cloudUrl}
            onChange={(event) => {
              setCloudUrl(event.target.value)
              setCloudError(null)
            }}
            placeholder="https://xxxx.supabase.co"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <label className="field">
          <span>anon public key</span>
          <textarea
            value={cloudKey}
            onChange={(event) => {
              setCloudKey(event.target.value)
              setCloudError(null)
            }}
            placeholder="eyJhbGciOi..."
            rows={3}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        {cloudError ? <p className="hint sync-error">{cloudError}</p> : null}
        <button type="button" className="button-primary add-category" onClick={saveCloudKeys}>
          Включить синхронизацию
        </button>
      </section>
    )
  }

  if (session?.frozen || (session && !session.homeId)) {
    return (
      <>
        <section className="settings-block">
          {error ? (
            <p className="hint sync-error">
              {error}{' '}
              <button type="button" className="text-button" onClick={onClearError}>
                Скрыть
              </button>
            </p>
          ) : (
            <p className="hint">
              Этот браузер отключён от дома. Списки на устройстве на месте.
            </p>
          )}
          <ConnectSteps role="rejoin" />
          <button
            type="button"
            className="button-primary add-category"
            disabled={busy}
            onClick={onReclaim}
          >
            Вернуться в дом
          </button>
          <button
            type="button"
            className="button-secondary add-category"
            disabled={busy}
            onClick={onRetry}
          >
            Проверить снова
          </button>
          <button
            type="button"
            className="button-secondary add-category"
            disabled={busy}
            onClick={() => setEntering(true)}
          >
            У меня есть код
          </button>
          {entering && (
            <EnterCodeDialog
              initialCode={initialCode ?? ''}
              busy={busy}
              error={error}
              onClose={() => {
                setEntering(false)
                onClearCode()
              }}
              onConnect={onConnect}
            />
          )}
        </section>
        <PhoneGuideBlock
          open={guideOpen}
          onOpen={() => setGuideOpen(true)}
          onClose={() => setGuideOpen(false)}
        />
      </>
    )
  }

  if (!session) {
    return (
      <>
        <section className="settings-block">
          {error ? (
            <p className="hint sync-error">
              {error}{' '}
              <button type="button" className="text-button" onClick={onClearError}>
                Скрыть
              </button>
            </p>
          ) : (
            <p className="hint">Этот браузер ещё не в облаке. Введите код с ярлыка.</p>
          )}
          <ConnectSteps />
          <button
            type="button"
            className="button-primary add-category"
            disabled={busy}
            onClick={() => setEntering(true)}
          >
            У меня есть код
          </button>
          {entering && (
            <EnterCodeDialog
              initialCode={initialCode ?? ''}
              busy={busy}
              error={error}
              onClose={() => {
                setEntering(false)
                onClearCode()
              }}
              onConnect={onConnect}
            />
          )}
        </section>
        <PhoneGuideBlock
          open={guideOpen}
          onOpen={() => setGuideOpen(true)}
          onClose={() => setGuideOpen(false)}
        />
      </>
    )
  }

  const inviteLink = inviteCode ? joinUrl(inviteCode) : null
  const hasFamily = members.length > 1 || Boolean(inviteCode)

  return (
    <>
      <section className="settings-block">
        <p className="hint">
          {session.displayName}
          {session.isCreator ? ' · организатор' : ''}
        </p>
        {error ? (
          <p className="hint sync-error">
            {error}{' '}
            <button type="button" className="text-button" onClick={onClearError}>
              Скрыть
            </button>
          </p>
        ) : null}
      </section>

      {session.isAppAdmin && accessInfo ? (
        <section className="settings-block">
          <h2>Доступ к программе</h2>
          <p className="hint">
            Занято {accessInfo.used} из {accessInfo.max} человек. Второй iPhone одного человека слот
            не занимает.
          </p>
          <ConnectSteps role="give-access" />
          {accessInfo.codes.length > 0 ? (
            <ul className="member-list">
              {accessInfo.codes.map((item) => (
                <li key={item} className="member-row">
                  <span className="sync-code">{formatCode(item)}</span>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void copy(formatCode(item), 'code')}
                  >
                    {copied === 'code' ? 'Скопирован' : 'Копировать'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Нет неиспользованных кодов P.</p>
          )}
          <button
            type="button"
            className="button-secondary add-category"
            disabled={busy || accessInfo.used >= accessInfo.max}
            onClick={onCreateAccess}
          >
            Создать код P
          </button>
        </section>
      ) : null}

      {session.isCreator && (
        <section className="settings-block">
          <h2>{hasFamily ? 'Пригласить в семью' : 'Семья'}</h2>
          {hasFamily ? null : (
            <p className="hint">Списки в облаке. Семьи пока нет — вы одни.</p>
          )}
          {inviteCode ? <ConnectSteps role="give-family" /> : (
            <p className="hint">
              {hasFamily
                ? 'Создайте новый код D, чтобы пригласить человека.'
                : 'Чтобы пригласить других, нажмите «Создать семью» — появится код D.'}
            </p>
          )}
          {inviteCode && inviteLink ? (
            <>
              <p className="sync-code">{formatCode(inviteCode)}</p>
              <QrImage value={inviteLink} label="QR-код приглашения" />
              <button
                type="button"
                className="button-secondary add-category"
                onClick={() => void copy(formatCode(inviteCode), 'code')}
              >
                {copied === 'code' ? 'Код скопирован' : 'Скопировать код'}
              </button>
              <button
                type="button"
                className="button-secondary add-category"
                onClick={() => void copy(inviteLink, 'link')}
              >
                {copied === 'link' ? 'Ссылка скопирована' : 'Скопировать ссылку'}
              </button>
            </>
          ) : hasFamily ? (
            <p className="hint">Кода пока нет.</p>
          ) : null}
          <button
            type="button"
            className="button-secondary add-category"
            disabled={busy}
            onClick={onCreateInvite}
          >
            {inviteCode ? 'Новый код D' : hasFamily ? 'Создать код D' : 'Создать семью'}
          </button>
        </section>
      )}

      <section className="settings-block">
        <h2>Мой второй телефон</h2>
        {pairingCode ? (
          <>
            <ConnectSteps role="give-phone" />
            <p className="sync-code">{formatCode(pairingCode)}</p>
            <QrImage value={pairUrl(pairingCode)} label="QR-код второго телефона" />
            <button
              type="button"
              className="button-secondary add-category"
              onClick={() => void copy(formatCode(pairingCode), 'pair')}
            >
              {copied === 'pair' ? 'Код скопирован' : 'Скопировать код'}
            </button>
          </>
        ) : (
          <ConnectSteps role="start-phone" />
        )}
        <button
          type="button"
          className="button-secondary add-category"
          disabled={busy}
          onClick={onCreatePairing}
        >
          {pairingCode ? 'Новый код' : 'Показать код'}
        </button>
      </section>

      <section className="settings-block">
        <h2>Кто в доме</h2>
        {members.length <= 1 ? (
          <p className="hint">Пока только вы.</p>
        ) : (
          <ul className="member-list">
            {members.map((member) => {
              const sameName = members.filter(
                (other) =>
                  other.displayName.trim().toLowerCase() ===
                  member.displayName.trim().toLowerCase(),
              )
              const isDuplicate = sameName.length > 1
              const isNewest =
                isDuplicate &&
                sameName.every(
                  (other) => (member.createdAt ?? '') >= (other.createdAt ?? ''),
                )
              return (
              <li key={member.id} className="member-row">
                <span>
                  {member.displayName}
                  {member.isCreator ? ' · организатор' : ''}
                  {member.id === session.userId ? ' · вы' : ''}
                  {isNewest ? ' · новый вход' : ''}
                </span>
                {session.isCreator && member.id !== session.userId ? (
                  <button
                    type="button"
                    className="qty-button"
                    aria-label={`Исключить ${member.displayName}`}
                    onClick={() => setExcluding(member)}
                  >
                    ×
                  </button>
                ) : null}
              </li>
              )
            })}
          </ul>
        )}
      </section>

      {!session.isCreator ? (
        <section className="settings-block">
          <h2>Самостоятельный доступ</h2>
          <p className="hint">
            Выйти из этой семьи и вести свои списки отдельно. Общие списки семьи на этом телефоне
            останутся копией; дальше они не будут обновляться из семьи.
          </p>
          <button
            type="button"
            className="button-secondary add-category"
            disabled={busy}
            onClick={() => setLeaving(true)}
          >
            Выйти из семьи
          </button>
        </section>
      ) : (
        <section className="settings-block">
          <h2>Самостоятельный доступ</h2>
          <p className="hint">
            Организатор не может выйти из семьи. Чтобы разойтись, исключите участников или договоритесь
            о новом организаторе заранее.
          </p>
        </section>
      )}

      <PhoneGuideBlock
        open={guideOpen}
        onOpen={() => setGuideOpen(true)}
        onClose={() => setGuideOpen(false)}
      />

      {entering && (
        <AlreadyConnectedDialog
          name={session.displayName}
          onClose={() => {
            setEntering(false)
            onClearCode()
          }}
        />
      )}
      {excluding && (
        <ConfirmDialog
          title="Исключить из дома?"
          text={`${excluding.displayName} больше не увидит общие списки. Личные останутся у этого человека на телефоне.`}
          confirmLabel="Исключить"
          onClose={() => setExcluding(null)}
          onConfirm={() => {
            onExclude(excluding.id)
            setExcluding(null)
          }}
        />
      )}
      {leaving && (
        <ConfirmDialog
          title="Выйти из семьи?"
          text="Вы станете самостоятельным пользователем со своим домом. Списки семьи перестанут обновляться на этом телефоне. Слот доступа останется за вами."
          confirmLabel="Выйти"
          onClose={() => setLeaving(false)}
          onConfirm={() => {
            setLeaving(false)
            onLeave()
          }}
        />
      )}
    </>
  )
}

const autoAppliedCodes = new Set<string>()

function PhoneGuideBlock({
  open,
  onOpen,
  onClose,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <>
      <section className="settings-block">
        <h2>Телефон</h2>
        <p className="hint">
          Safari и ярлык на «Домой» хранят списки отдельно. Если покупки не совпадают или нужно
          подключить другой телефон — откройте инструкцию.
        </p>
        <button type="button" className="button-secondary add-category" onClick={onOpen}>
          Инструкция для телефона
        </button>
      </section>
      {open ? (
        <div className="overlay" role="presentation" onClick={onClose}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Коды на телефоне</h2>
            <div className="help-text">
              <SyncPhoneGuide />
            </div>
            <div className="dialog-actions dialog-actions-single">
              <button type="button" className="button-primary" onClick={onClose}>
                Понятно
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function AlreadyConnectedDialog({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Вы уже внутри</h2>
        <p className="hint">Вы уже подключены как {name}.</p>
        <div className="dialog-actions">
          <button type="button" className="button-primary" onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
}

function EnterCodeDialog({
  initialCode,
  busy,
  error,
  onClose,
  onConnect,
}: {
  initialCode: string
  busy: boolean
  error?: string | null
  onClose: () => void
  onConnect: (code: string, name?: string) => Promise<'need-name' | 'error' | 'already' | void>
}) {
  const [pendingNameFor, setPendingNameFor] = useState<string | null>(null)
  const [manual, setManual] = useState(!initialCode)
  const started = useRef(false)

  useEffect(() => {
    if (!initialCode || started.current || autoAppliedCodes.has(initialCode)) return
    started.current = true
    if (kindFromCode(initialCode) === 'invite' || kindFromCode(initialCode) === 'access') {
      setPendingNameFor(initialCode)
      return
    }
    autoAppliedCodes.add(initialCode)
    void onConnect(initialCode).then((result) => {
      if (result === 'need-name') setPendingNameFor(initialCode)
      else if (result === 'error') setManual(true)
      else onClose()
    })
  }, [initialCode, onClose, onConnect])

  if (pendingNameFor) {
    return (
      <NameDialog
        title="Как вас зовут"
        label="Имя"
        placeholder="Например, Маша"
        confirmLabel="Войти"
        onClose={onClose}
        onConfirm={(name) => {
          void onConnect(pendingNameFor, name).then((result) => {
            if (result !== 'need-name') onClose()
          })
        }}
      />
    )
  }

  if (!manual && initialCode) {
    return (
      <div className="overlay" role="status">
        <div className="dialog">
          <p className="hint">Подключаем по коду из ссылки…</p>
        </div>
      </div>
    )
  }

  return (
    <CodeJoinDialog
      title="Ввести код"
      codeLabel="Код"
      confirmLabel="Продолжить"
      busy={busy}
      error={error}
      initialCode={initialCode}
      onClose={onClose}
      onConfirm={(code) => {
        void onConnect(code).then((result) => {
          if (result === 'need-name') setPendingNameFor(code)
          else if (result !== 'error') onClose()
        })
      }}
    />
  )
}
