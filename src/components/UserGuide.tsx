import { useEffect, type ReactNode } from 'react'
import {
  GUIDE_SECTIONS,
  guideSectionsByIds,
  type GuideBlock,
  type GuideSection,
} from '../data/guideContent'

type UserGuideProps = {
  /** Показать только эти разделы (контекстная подсказка). */
  sectionIds?: string[]
  /** Прокрутить к разделу при открытии полной справки. */
  focusId?: string
  /** Показать оглавление (по умолчанию — только для полной справки). */
  showToc?: boolean
  /** Кнопка перехода в Настройки → Семья (если справка открыта из настроек). */
  onOpenFamily?: () => void
}

function GuideJump({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault()
        const id = href.startsWith('#') ? href.slice(1) : href
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
    >
      {children}
    </a>
  )
}

function BlockView({ block }: { block: GuideBlock }) {
  if (block.type === 'p') return <p>{block.text}</p>
  if (block.type === 'ol') {
    return (
      <ol>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    )
  }
  return (
    <ul>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function SectionView({
  section,
  heading,
  onOpenFamily,
}: {
  section: GuideSection
  heading: 'h3' | 'h4'
  onOpenFamily?: () => void
}) {
  const Heading = heading
  const familyExtra: ReactNode =
    section.id === 'guide-family' && onOpenFamily ? (
      <p>
        <button type="button" className="qty-button" onClick={onOpenFamily}>
          Открыть «Семья»
        </button>
      </p>
    ) : null

  return (
    <>
      <Heading id={section.id}>{section.title}</Heading>
      {section.blocks.map((block, index) => (
        <BlockView key={`${section.id}-${index}`} block={block} />
      ))}
      {familyExtra}
      {section.children?.map((child) => (
        <SectionView
          key={child.id}
          section={child}
          heading="h4"
          onOpenFamily={onOpenFamily}
        />
      ))}
    </>
  )
}

export function UserGuide({
  sectionIds,
  focusId,
  showToc,
  onOpenFamily,
}: UserGuideProps) {
  const partial = Boolean(sectionIds?.length)
  const sections = partial ? guideSectionsByIds(sectionIds!) : GUIDE_SECTIONS
  const toc = showToc ?? !partial

  useEffect(() => {
    if (!focusId) return
    const timer = window.setTimeout(() => {
      document.getElementById(focusId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [focusId])

  return (
    <div className="sync-guide-body">
      {toc ? (
        <nav className="guide-toc" aria-label="Содержание справки">
          <p className="guide-toc-title">Содержание</p>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <GuideJump href={`#${section.id}`}>{section.title}</GuideJump>
                {section.children?.length ? (
                  <ol>
                    {section.children.map((child) => (
                      <li key={child.id}>
                        <GuideJump href={`#${child.id}`}>{child.title}</GuideJump>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {sections.map((section) => (
        <SectionView
          key={section.id}
          section={section}
          heading="h3"
          onOpenFamily={onOpenFamily}
        />
      ))}
    </div>
  )
}

/** Контекстная справка по id разделов — для кнопки «?» на экранах. */
export function GuideHelp({ sectionIds }: { sectionIds: string[] }) {
  return <UserGuide sectionIds={sectionIds} showToc={sectionIds.length > 1} />
}