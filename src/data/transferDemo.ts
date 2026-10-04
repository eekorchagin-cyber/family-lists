import type { AppData, Item, Store } from '../types'
import { SCHEMA_VERSION, emptyStoreFields } from './defaults'

export const TRANSFER_DEMO_FLAG = 'pokupki-transfer-demo'
export const TRANSFER_DEMO_DATA_KEY = 'pokupki-data-demo'

export function activateTransferDemoFromUrl(): boolean {
  try {
    if (new URLSearchParams(location.search).has('transferDemo')) {
      sessionStorage.setItem(TRANSFER_DEMO_FLAG, '1')
      sessionStorage.removeItem(TRANSFER_DEMO_DATA_KEY)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function isTransferDemo(): boolean {
  try {
    return sessionStorage.getItem(TRANSFER_DEMO_FLAG) === '1'
  } catch {
    return false
  }
}

const at = '2026-10-04T00:00:00.000Z'

function store(
  id: string,
  name: string,
  categoryOrder: string[],
): Store {
  return {
    id,
    name,
    ...emptyStoreFields(categoryOrder),
    visibility: 'private',
    updatedAt: at,
  }
}

function item(
  id: string,
  storeId: string,
  name: string,
  categoryId: string,
): Item {
  return {
    id,
    storeId,
    name,
    categoryId,
    qty: 1,
    unit: 'шт',
    bought: false,
    updatedAt: at,
  }
}

/** Локальный сценарий «командировка → магазины», без облака и без семейных данных. */
export function createTransferDemoData(): AppData {
  const tripId = 'demo-trip'
  const sportId = 'demo-sport'
  const pharmacyId = 'demo-pharmacy'
  const dnsId = 'demo-dns'

  const clothes = 'filecat-30'
  const shoes = 'filecat-28'
  const meds = 'filecat-60'
  const docs = 'filecat-12'
  const electronics = 'filecat-48'
  const other = 'filecat-13'

  return {
    version: SCHEMA_VERSION,
    stores: [
      store(tripId, 'Вещи в командировку', [clothes, shoes, meds, docs, electronics, other]),
      store(sportId, 'Спортмастер', [clothes, shoes]),
      store(pharmacyId, 'Аптека', [meds]),
      store(dnsId, 'DNS', [electronics]),
    ],
    groups: [],
    items: [
      item('demo-i1', tripId, 'Футболка', clothes),
      item('demo-i2', tripId, 'Кроссовки', shoes),
      item('demo-i3', tripId, 'Аспирин', meds),
      item('demo-i4', tripId, 'Паспорт', docs),
      item('demo-i5', tripId, 'Зарядка', electronics),
      item('demo-i6', tripId, 'Зонт (уже есть)', other),
      item('demo-i7', tripId, 'Витамины', meds),
      item('demo-i8', tripId, 'Билеты', docs),
      item('demo-i9', tripId, 'Powerbank', electronics),
      item('demo-i10', tripId, 'Наушники', electronics),
      item('demo-i11', tripId, 'Адаптер', electronics),
      item('demo-i12', tripId, 'Книга в дорогу', other),
      item('demo-i13', tripId, 'Маска для сна', other),
      item('demo-i14', tripId, 'Беруши', other),
      item('demo-i15', tripId, 'Зубная щётка', other),
    ],
    categories: [],
    catalog: [],
    settings: { theme: 'light', fontSize: 'm' },
    templateFolders: [],
  }
}
