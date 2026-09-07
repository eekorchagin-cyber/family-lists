import { useEffect, useRef, useState } from 'react'
import { formatCode, joinUrl, kindFromCode, pairUrl } from '../data/sync/codes'
import type { HomeMember, SyncSession } from '../data/sync/session'
import { CodeJoinDialog } from './CodeJoinDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { NameDialog } from './NameDialog'
import { QrImage } from './QrImage'
import { SyncPhoneGuide } from './SyncPhoneGuide'

type SyncPanelProps = {
  configured: boolean
  session: SyncSession | null
  members: HomeMember[]
  inviteCode: string | null
  pairingCode: string | null
  busy: boolean
  error: string | null
  initialCode?: string | null
  onEnable: (name: string) => void
  onConnect: (code: string, name?: string) => Promise<'need-name' | 'error' | 'already' | void>
  onCreateInvite: () => void
  onCreatePairing: () => void
  onExclude: (userId: string) => void
  onReclaim: () => void
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
  busy,
  error,
  initialCode,
  onEnable,
  onConnect,
  onCreateInvite,
  onCreatePairing,
  onExclude,
  onReclaim,
  onRetry,
  onClearCode,
  onClearError,
}: SyncPanelProps) {
  const [enabling, setEnabling] = useState(false)
  const [entering, setEntering] = useState(Boolean(initialCode))
  const [excluding, setExcluding] = useState<HomeMember | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | 'pair' | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  async function copy(text: string, kind: 'code' | 'link' | 'pair') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
    } catch {
      setCopied(null)
    }
  }

  if (!configured) {
    return (
      <section className="settings-block">
        <p className="hint">
          Сейчас списки живут только на этом телефоне. Чтобы делиться ими дома, нужен проект
          Supabase и ключи в сборке сайта. Почту подключать не нужно.
        </p>
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
              Этот браузер отключён от дома. Списки на устройстве на месте. Организатор нажимает
              «Вернуться в дом». Чтобы вернуть этот телефон, нужен код на T (Мой второй телефон).
              Код на D приглашает нового человека и спросит имя — его здесь вводить не нужно.
            </p>
          )}
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
            <p className="hint">
              Этот браузер ещё не в семье. Если дом уже есть на другом устройстве — откройте там
              Семья → Мой второй телефон и введите код здесь. Не включайте синхронизацию заново:
              так появится второй дом.
            </p>
          )}
          <button
            type="button"
            className="button-primary add-category"
            disabled={busy}
            onClick={() => setEntering(true)}
          >
            У меня есть код
          </button>
          <button
            type="button"
            className="button-secondary add-category"
            disabled={busy}
            onClick={() => setEnabling(true)}
          >
            Включить синхронизацию
          </button>
          {enabling && (
            <NameDialog
              title="Как вас зовут"
              label="Имя"
              placeholder="Например, Маша"
              confirmLabel="Включить"
              onClose={() => setEnabling(false)}
              onConfirm={(name) => {
                onEnable(name)
                setEnabling(false)
              }}
            />
          )}
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

  return (
    <>
      <section className="settings-block">
        <p className="hint">
          {session.displayName}
          {session.isCreator ? ' · организатор дома' : ''}
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

      {session.isCreator && (
        <section className="settings-block">
          <h2>Пригласить в семью</h2>
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
          ) : (
            <p className="hint">Кода пока нет.</p>
          )}
          <button
            type="button"
            className="button-secondary add-category"
            disabled={busy}
            onClick={onCreateInvite}
          >
            {inviteCode ? 'Новый код' : 'Создать код'}
          </button>
        </section>
      )}

      <section className="settings-block">
        <h2>Мой второй телефон</h2>
        <p className="hint">Покажите этот код на другом своём устройстве. Действует 15 минут.</p>
        {pairingCode ? (
          <>
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
        ) : null}
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
        {members.length === 0 ? (
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
            <h2>Семья на телефоне</h2>
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
        <h2>Вы уже в семье</h2>
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
    if (kindFromCode(initialCode) === 'invite') {
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
      text="Код на T — этот же человек на другом телефоне. Код на D — новый человек в семье."
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
