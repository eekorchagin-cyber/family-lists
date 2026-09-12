import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppData } from '../types'
import {
  completePairing,
  createInviteCode,
  createPairingCode,
  excludeMember,
  joinHome,
  reclaimHome,
  loadInviteCode,
  loadMembers,
  loadMyProfile,
  pullRemote,
  pushLocal,
  recoverSessionFromAuth,
  restoreSession,
  signUpDevice,
} from '../data/sync/api'
import { supabaseConfigured } from '../data/sync/client'
import { kindFromCode } from '../data/sync/codes'
import { DIRTY_EVENT } from '../data/sync/dirty'
import { deletedItemIds, peekDeletes } from '../data/sync/deletes'
import { syncErrorMessage } from '../data/sync/errors'
import {
  adoptLocalStores,
  mergeByStoreName,
  mergePulledData,
  nowIso,
  visibleStoreUpdates,
} from '../data/sync/merge'
import {
  dataLooksPopulated,
  loadSession,
  loadUpdatedStoreIds,
  saveSession,
  saveUpdatedStoreIds,
  shouldReplaceWithCloud,
  type HomeMember,
  type SyncSession,
} from '../data/sync/session'

const POLL_MS = 5000
const SHARE_LISTS_KEY = 'pokupki-share-lists-v1'

export type MergeMode = 'cloud' | 'device' | 'merge'

type MergePending = {
  session: SyncSession
  local: AppData
  remote: AppData
}

export function useSync(
  data: AppData,
  replaceData: (next: AppData, opts?: { takeCloudOrder?: boolean }) => void,
) {
  const dataRef = useRef(data)
  const replaceRef = useRef(replaceData)
  const dirtyRef = useRef(false)
  const busyRef = useRef(false)
  dataRef.current = data
  replaceRef.current = replaceData

  const [session, setSession] = useState<SyncSession | null>(() => loadSession())
  const [members, setMembers] = useState<HomeMember[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [updatedStoreIds, setUpdatedStoreIds] = useState<string[]>(() => loadUpdatedStoreIds())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mergePending, setMergePending] = useState<MergePending | null>(null)

  const configured = supabaseConfigured()

  useEffect(() => {
    saveUpdatedStoreIds(updatedStoreIds)
  }, [updatedStoreIds])

  const markStoresUpdated = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setUpdatedStoreIds((current) => [...new Set([...current, ...ids])])
  }, [])

  useEffect(() => {
    if (!configured) return
    if (loadSession()?.password) return
    void recoverSessionFromAuth()
      .then((recovered) => {
        // Без пароля loadSession потом вернёт null — не сохраняем «пустую» сессию.
        if (!recovered?.homeId || !recovered.password) return
        saveSession(recovered)
        setSession(recovered)
      })
      .catch(() => {})
  }, [configured])

  const freeze = useCallback((current: SyncSession) => {
    const next = { ...current, frozen: true }
    saveSession(next)
    setSession(next)
  }, [])

  const tick = useCallback(async () => {
    let current = loadSession()
    if (!configured || !current || mergePending) return
    if (busyRef.current) return
    busyRef.current = true
    try {
      await restoreSession(current)
      const profile = await loadMyProfile()
      if (!profile?.homeId) {
        if (!current.frozen) freeze(current)
        setError(
          'Синхронизация остановлена: этот телефон не в семье. Откройте Настройки → Семья.',
        )
        return
      }
      if (
        current.frozen ||
        current.homeId !== profile.homeId ||
        current.isCreator !== profile.isCreator
      ) {
        current = {
          ...current,
          homeId: profile.homeId,
          isCreator: profile.isCreator,
          displayName: profile.displayName || current.displayName,
          frozen: false,
        }
        saveSession(current)
        setSession(current)
      }
      let local = dataRef.current
      const userId = current.userId
      // Проставляем ownerId своим спискам, но visibility НЕ трогаем:
      // иначе «Только я» каждый тик сбрасывается в «Весь дом».
      {
        const stores = local.stores.map((store) => {
          if (store.ownerId) return store
          return { ...store, ownerId: userId }
        })
        if (stores.some((store, index) => store !== local.stores[index])) {
          local = { ...local, stores }
          replaceRef.current(local)
          dirtyRef.current = true
        }
        localStorage.setItem(SHARE_LISTS_KEY, userId)
      }
      // Раз за сессию принудительно пушим локальное — лечит «есть у меня, нет в облаке»
      // и уносит исправленную видимость (private) в облако.
      if (sessionStorage.getItem('pokupki-force-push') !== '5') {
        dirtyRef.current = true
        sessionStorage.setItem('pokupki-force-push', '5')
      }
      // Backup-сид и полностью чужой набор id — берём облако целиком (иначе 2-й iPhone
      // навсегда сидит на демо-списках без групп и без подсветки обновлений).
      if (sessionStorage.getItem('pokupki-adopt-cloud') !== '2') {
        const cloud = await pullRemote()
        if (cloud.stores.length > 0 || cloud.items.length > 0) {
          const before = dataRef.current
          const pending = peekDeletes()
          const gone = deletedItemIds(pending)
          const incoming = {
            ...cloud,
            settings: before.settings,
            stores: cloud.stores.filter((store) => !pending.stores.includes(store.id)),
            items: cloud.items.filter((item) => !gone.includes(item.id)),
            groups: cloud.groups,
          }
          sessionStorage.setItem('pokupki-adopt-cloud', '2')
          if (shouldReplaceWithCloud(before, incoming) || !dataLooksPopulated(before)) {
            markStoresUpdated(incoming.stores.map((store) => store.id))
            replaceRef.current(incoming, { takeCloudOrder: true })
            dirtyRef.current = true
          } else {
            const merged = mergePulledData(before, incoming, {
              lastPulledAt: current.lastPulledAt,
              userId: current.userId,
              deletedItemIds: gone,
              deletedStoreIds: pending.stores,
              deletedGroupIds: pending.groups,
            })
            if (merged.changed) {
              markStoresUpdated([
                ...visibleStoreUpdates(before, merged.next),
                ...merged.changedStoreIds,
              ])
              replaceRef.current(merged.next)
            }
            dirtyRef.current = true
          }
        } else {
          sessionStorage.setItem('pokupki-adopt-cloud', '2')
          setError(
            'В облаке пока нет списков. Откройте телефон, где списки на месте, на 15 секунд — затем повторите здесь.',
          )
        }
      }
      const remote = await pullRemote()
      local = dataRef.current
      const pending = peekDeletes()
      const { next, changed, changedStoreIds } = mergePulledData(local, remote, {
        lastPulledAt: current.lastPulledAt,
        userId: current.userId,
        deletedItemIds: deletedItemIds(pending),
        deletedStoreIds: pending.stores,
        deletedGroupIds: pending.groups,
      })
      if (changed) {
        markStoresUpdated([
          ...visibleStoreUpdates(local, next),
          ...changedStoreIds,
        ])
        replaceRef.current(next)
      }
      const toPush = changed ? next : dataRef.current
      if (dirtyRef.current || changed) {
        const pushed = await pushLocal(current, toPush)
        const withGroups = { ...toPush, groups: pushed.groups }
        if (JSON.stringify(pushed.groups) !== JSON.stringify(toPush.groups ?? [])) {
          replaceRef.current(withGroups)
        }
        // Если группы не записались — оставим dirty, чтобы повторить.
        dirtyRef.current = !pushed.groupsSaved
      }
      const saved = { ...current, lastPulledAt: nowIso(), displayName: profile.displayName }
      saveSession(saved)
      setSession(saved)
      setError(null)
    } catch (caught) {
      setError(syncErrorMessage(caught))
    } finally {
      busyRef.current = false
    }
  }, [configured, freeze, markStoresUpdated, mergePending])

  useEffect(() => {
    const onDirty = () => {
      dirtyRef.current = true
    }
    window.addEventListener(DIRTY_EVENT, onDirty)
    return () => window.removeEventListener(DIRTY_EVENT, onDirty)
  }, [])

  useEffect(() => {
    if (!configured) return
    void tick()
    const interval = window.setInterval(() => {
      void tick()
    }, POLL_MS)
    const onDirty = () => {
      window.setTimeout(() => {
        void tick()
      }, 800)
    }
    const onResume = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return
      void tick()
    }
    window.addEventListener(DIRTY_EVENT, onDirty)
    window.addEventListener('online', onResume)
    window.addEventListener('focus', onResume)
    window.addEventListener('pageshow', onResume)
    document.addEventListener('visibilitychange', onResume)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener(DIRTY_EVENT, onDirty)
      window.removeEventListener('online', onResume)
      window.removeEventListener('focus', onResume)
      window.removeEventListener('pageshow', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, [configured, tick])

  const refreshMembers = useCallback(async () => {
    const current = loadSession()
    if (!current || current.frozen) {
      setMembers([])
      return
    }
    try {
      setMembers(await loadMembers())
    } catch {
      setMembers([])
    }
  }, [])

  useEffect(() => {
    if (!session || session.frozen) {
      setMembers([])
      return
    }
    void refreshMembers()
  }, [refreshMembers, session])

  const finishConnect = useCallback(
    async (nextSession: SyncSession, mode: MergeMode | 'auto') => {
      const local = dataRef.current
      const remote = await pullRemote()
      let resolved: MergeMode | 'auto' = mode
      if (resolved === 'auto' && shouldReplaceWithCloud(local, remote)) {
        resolved = 'cloud'
      }
      if (resolved === 'auto' && dataLooksPopulated(local) && dataLooksPopulated(remote)) {
        setMergePending({ session: nextSession, local, remote })
        return
      }
      let next = local
      if (resolved === 'cloud') next = { ...remote, settings: local.settings }
      else if (resolved === 'device') next = adoptLocalStores(local, nextSession.userId, 'private')
      else if (resolved === 'merge') next = mergeByStoreName(local, remote)
      else if (!dataLooksPopulated(remote)) {
        next = adoptLocalStores(local, nextSession.userId, 'private')
      } else {
        next = { ...remote, settings: local.settings }
      }
      replaceRef.current(next)
      dirtyRef.current = true
      const pushed = await pushLocal(nextSession, next)
      if (JSON.stringify(pushed.groups) !== JSON.stringify(next.groups ?? [])) {
        replaceRef.current({ ...next, groups: pushed.groups })
      }
      const pulled = await pullRemote()
      const merged = mergePulledData(
        { ...next, groups: pushed.groups },
        pulled,
        {
          lastPulledAt: null,
          userId: nextSession.userId,
          deletedGroupIds: peekDeletes().groups,
        },
      )
      if (merged.changed) replaceRef.current(merged.next)
      const saved = { ...nextSession, lastPulledAt: nowIso() }
      saveSession(saved)
      setSession(saved)
      setMergePending(null)
      await refreshMembers()
    },
    [refreshMembers],
  )

  const enableHome = useCallback(
    async (displayName: string) => {
      if (!configured) return
      setBusy(true)
      setError(null)
      try {
        const nextSession = await signUpDevice(displayName)
        const adopted = adoptLocalStores(dataRef.current, nextSession.userId, 'home')
        replaceRef.current(adopted)
        saveSession(nextSession)
        setSession(nextSession)
        await pushLocal(nextSession, adopted)
        const code = await createInviteCode()
        setInviteCode(code)
        const saved = { ...nextSession, lastPulledAt: nowIso() }
        saveSession(saved)
        setSession(saved)
        await refreshMembers()
      } catch (caught) {
        setError(syncErrorMessage(caught))
      } finally {
        setBusy(false)
      }
    },
    [configured, refreshMembers],
  )

  const connectWithCode = useCallback(
    async (code: string, displayName?: string): Promise<'need-name' | 'error' | 'already' | void> => {
      if (!configured) return 'error'
      const existing = loadSession()
      if (existing && !existing.frozen) return 'already'
      const kind = kindFromCode(code)
      if (existing?.frozen && kind === 'invite') {
        setError(
          'Этот телефон уже был в семье. Нужен код на T (Мой второй телефон), а не приглашение на D.',
        )
        return 'error'
      }
      if (kind === 'invite' && !displayName?.trim()) return 'need-name'
      setBusy(true)
      setError(null)
      try {
        if (kind === 'pairing') {
          const nextSession = await completePairing(code)
          saveSession(nextSession)
          setSession(nextSession)
          await finishConnect(nextSession, 'auto')
          return
        }
        if (kind === 'invite') {
          const nextSession = await joinHome(code, displayName ?? '')
          saveSession(nextSession)
          setSession(nextSession)
          await finishConnect(nextSession, 'auto')
          return
        }
        try {
          const nextSession = await completePairing(code)
          saveSession(nextSession)
          setSession(nextSession)
          await finishConnect(nextSession, 'auto')
          return
        } catch {
          if (existing?.frozen) {
            setError(
              'Этот телефон уже был в семье. Нужен код на T (Мой второй телефон), а не приглашение на D.',
            )
            return 'error'
          }
          if (!displayName?.trim()) return 'need-name'
          const nextSession = await joinHome(code, displayName)
          saveSession(nextSession)
          setSession(nextSession)
          await finishConnect(nextSession, 'auto')
        }
      } catch (caught) {
        setError(syncErrorMessage(caught))
        return 'error'
      } finally {
        setBusy(false)
      }
    },
    [configured, finishConnect],
  )

  const resolveMerge = useCallback(
    async (mode: MergeMode) => {
      if (!mergePending) return
      setBusy(true)
      setError(null)
      try {
        await finishConnect(mergePending.session, mode)
      } catch (caught) {
        setError(syncErrorMessage(caught))
      } finally {
        setBusy(false)
      }
    },
    [finishConnect, mergePending],
  )

  const createInvite = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setInviteCode(await createInviteCode())
    } catch (caught) {
      setError(syncErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  const loadInvite = useCallback(async () => {
    try {
      setInviteCode(await loadInviteCode())
    } catch {
      setInviteCode(null)
    }
  }, [])

  useEffect(() => {
    if (!session?.isCreator || session.frozen) {
      setInviteCode(null)
      return
    }
    void loadInvite()
  }, [loadInvite, session])

  const createPairing = useCallback(async () => {
    const current = loadSession()
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      setPairingCode(await createPairingCode(current.email, current.password))
    } catch (caught) {
      setError(syncErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  const exclude = useCallback(
    async (userId: string) => {
      setBusy(true)
      setError(null)
      try {
        await excludeMember(userId)
        await refreshMembers()
      } catch (caught) {
        setError(syncErrorMessage(caught))
      } finally {
        setBusy(false)
      }
    },
    [refreshMembers],
  )

  const reclaim = useCallback(async () => {
    const current = loadSession()
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      await restoreSession(current)
      await reclaimHome()
      const profile = await loadMyProfile()
      if (!profile?.homeId) throw new Error('Не удалось вернуться в дом')
      const next = {
        ...current,
        homeId: profile.homeId,
        isCreator: profile.isCreator,
        displayName: profile.displayName || current.displayName,
        frozen: false,
      }
      saveSession(next)
      setSession(next)
      dirtyRef.current = true
      await tick()
    } catch (caught) {
      setError(syncErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }, [tick])

  const retry = useCallback(async () => {
    setError(null)
    await tick()
  }, [tick])

  return {
    configured,
    session,
    members,
    inviteCode,
    pairingCode,
    updatedStoreIds,
    dismissStoreUpdate: (storeId?: string) => {
      setUpdatedStoreIds((current) =>
        storeId ? current.filter((id) => id !== storeId) : [],
      )
    },
    error,
    busy,
    mergePending: mergePending !== null,
    enableHome,
    connectWithCode,
    resolveMerge,
    createInvite,
    createPairing,
    exclude,
    reclaim,
    retry,
    clearError: () => setError(null),
  }
}
