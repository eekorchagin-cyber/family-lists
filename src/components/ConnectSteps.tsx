import type { CodeKind } from '../data/sync/codes'

type ConnectStepsProps = {
  forKind?: CodeKind | null
  role?: 'enter' | 'give-access' | 'give-family' | 'give-phone' | 'start-phone' | 'rejoin'
}

export function ConnectSteps({ forKind = null, role = 'enter' }: ConnectStepsProps) {
  if (role === 'give-access') {
    return (
      <ol className="connect-steps">
        <li>Нажмите «Создать код P».</li>
        <li>Передайте код новому человеку. Код одноразовый.</li>
        <li>Он ставит ярлык и вводит код P и имя.</li>
      </ol>
    )
  }

  if (role === 'give-family') {
    return (
      <ol className="connect-steps">
        <li>Передайте человеку код D или QR.</li>
        <li>Он ставит ярлык, вводит код D и своё имя.</li>
        <li>Пока он входит, покупки не отмечайте.</li>
      </ol>
    )
  }

  if (role === 'give-phone') {
    return (
      <ol className="connect-steps">
        <li>На другом своём iPhone откройте ярлык, не вкладку Safari.</li>
        <li>Введите этот код T. Имя не нужно.</li>
        <li>Код действует 15 минут. Пока списки подтягиваются, покупки не отмечайте.</li>
      </ol>
    )
  }

  if (role === 'start-phone') {
    return (
      <ol className="connect-steps">
        <li>Нажмите «Показать код» на этом телефоне.</li>
        <li>На другом своём iPhone откройте ярлык и введите код T.</li>
        <li>Код действует 15 минут. Имя не нужно.</li>
      </ol>
    )
  }

  if (role === 'rejoin') {
    return (
      <ol className="connect-steps">
        <li>Организатор нажимает «Вернуться в дом».</li>
        <li>Остальным нужен код T с телефона, где списки верные.</li>
        <li>Код D здесь не вводите: он приглашает нового человека и спросит имя.</li>
      </ol>
    )
  }

  if (forKind === 'access') {
    return (
      <ol className="connect-steps">
        <li>Введите код P и своё имя.</li>
        <li>Нажмите «Продолжить».</li>
        <li>Появятся ваши списки. Семью можно создать позже: Настройки → Семья.</li>
      </ol>
    )
  }

  if (forKind === 'invite') {
    return (
      <ol className="connect-steps">
        <li>Введите код D и своё имя. Имя не должно совпадать с теми, кто уже в семье.</li>
        <li>Нажмите «Продолжить».</li>
        <li>Подождите несколько секунд — подтянутся списки семьи.</li>
      </ol>
    )
  }

  if (forKind === 'pairing') {
    return (
      <ol className="connect-steps">
        <li>Код T — ваш второй iPhone. Имя не нужно.</li>
        <li>Нажмите «Продолжить».</li>
        <li>Подождите несколько секунд. Покупки пока не отмечайте.</li>
      </ol>
    )
  }

  return (
    <ol className="connect-steps">
      <li>Поставьте ярлык: в Safari «Поделиться» → «На экран Домой».</li>
      <li>Откройте программу с ярлыка. Код во вкладке Safari не сработает.</li>
      <li>Введите код: P — свои списки, D — семья, T — второй iPhone.</li>
    </ol>
  )
}
