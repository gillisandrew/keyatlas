import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Eye, EyeOff, GripVertical, Search } from 'lucide-react'
import type { Cheatsheet, Section } from '@/data/types'
import type { FontSize, HeadingOverrides, LayoutOverrides } from '@/routes/$appSlug'
import { EntryRow } from './EntryRow'
import { useHiddenEntries } from '@/context/HiddenEntriesContext'

const fontSizeEm: Record<FontSize, string> = {
  sm: '0.85em',
  md: '1em',
  lg: '1.15em',
}

interface VisibleSection {
  section: Section
  sectionIndex: number
  height: number
}

function balanceSections(sections: VisibleSection[], columnCount: number): VisibleSection[][] {
  if (columnCount <= 1) return [sections]

  const totalHeight = sections.reduce((sum, s) => sum + s.height, 0)
  const target = totalHeight / columnCount

  const columns: VisibleSection[][] = []
  let currentColumn: VisibleSection[] = []
  let currentHeight = 0

  for (const section of sections) {
    if (
      currentColumn.length > 0 &&
      columns.length < columnCount - 1 &&
      currentHeight + section.height / 2 > target
    ) {
      columns.push(currentColumn)
      currentColumn = []
      currentHeight = 0
    }
    currentColumn.push(section)
    currentHeight += section.height
  }

  if (currentColumn.length > 0) {
    columns.push(currentColumn)
  }

  // Pad with empty columns if needed
  while (columns.length < columnCount) {
    columns.push([])
  }

  return columns
}

function applySectionOverrides(
  sections: VisibleSection[],
  columnCount: number,
  overrides: LayoutOverrides,
): VisibleSection[][] {
  // Start with balanced layout
  const balanced = balanceSections(sections, columnCount)

  // Check if any overrides actually apply to visible sections
  const visibleIndices = new Set(sections.map((s) => s.sectionIndex))
  const hasApplicableOverrides = Object.keys(overrides).some((k) => visibleIndices.has(Number(k)))
  if (!hasApplicableOverrides) return balanced

  // Build columns from overrides
  const columns: VisibleSection[][] = Array.from({ length: columnCount }, () => [])

  // First pass: place sections that have overrides
  const placed = new Set<number>()
  for (const section of sections) {
    const col = overrides[section.sectionIndex]
    if (col !== undefined && col >= 0 && col < columnCount) {
      columns[col].push(section)
      placed.add(section.sectionIndex)
    }
  }

  // Second pass: place remaining sections using balanced approach
  const remaining = sections.filter((s) => !placed.has(s.sectionIndex))
  if (remaining.length > 0) {
    // Put remaining sections in the columns with least content
    for (const section of remaining) {
      const shortest = columns.reduce(
        (minIdx, col, idx) =>
          col.reduce((s, sec) => s + sec.height, 0) <
          columns[minIdx].reduce((s, sec) => s + sec.height, 0)
            ? idx
            : minIdx,
        0,
      )
      columns[shortest].push(section)
    }
  }

  return columns
}

function DroppableColumn({
  id,
  children,
  isOver,
}: {
  id: string
  children: React.ReactNode
  isOver?: boolean
}) {
  const { setNodeRef, isOver: dropping } = useDroppable({ id })
  const highlight = isOver || dropping

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] min-w-0 rounded-lg transition-colors ${
        highlight ? 'bg-blue-50 ring-2 ring-blue-200' : ''
      }`}
    >
      {children}
    </div>
  )
}

function DraggableSection({
  id,
  children,
  isDragging,
}: {
  id: string
  children: React.ReactNode
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`group mb-4 break-inside-avoid ${isDragging ? 'opacity-30' : ''}`}
    >
      <div className="relative">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className="toggle-btn absolute -left-5 top-0.5 cursor-grab text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        {children}
      </div>
    </div>
  )
}

function SectionContent({
  section,
  sectionIndex: si,
  slug,
  collapsed,
  color,
  searchQuery,
  displayName,
  onHeadingChange,
  toggleSection,
  isSectionAllHidden,
}: {
  section: Section
  sectionIndex: number
  slug: string
  collapsed: boolean
  color: string
  searchQuery?: string
  displayName: string
  onHeadingChange?: (sectionIndex: number, name: string) => void
  toggleSection: (slug: string, si: number, count: number) => void
  isSectionAllHidden: (slug: string, si: number, count: number) => boolean
}) {
  const allHidden = isSectionAllHidden(slug, si, section.entries.length)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(displayName)

  function startEditing() {
    setEditValue(displayName)
    setEditing(true)
  }

  function commitEdit() {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== displayName) {
      onHeadingChange?.(si, trimmed)
    }
  }

  return (
    <>
      <h3
        className="mb-2 flex items-center justify-between border-b-2 pb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ borderColor: color, color }}
      >
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full border-none bg-transparent p-0 text-sm font-semibold uppercase tracking-wide outline-none"
            style={{ color }}
          />
        ) : (
          <span
            onDoubleClick={onHeadingChange ? startEditing : undefined}
            className={onHeadingChange ? 'cursor-text' : ''}
            title={onHeadingChange ? 'Double-click to edit' : undefined}
          >
            {displayName}
          </span>
        )}
        <button
          onClick={() => toggleSection(slug, si, section.entries.length)}
          className="toggle-btn ml-2 shrink-0 opacity-40 hover:opacity-100"
          title={allHidden ? 'Show section' : 'Hide section'}
        >
          {allHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </h3>
      <div className="divide-y divide-gray-100">
        {section.entries.map((entry, ei) => (
          <EntryRow
            key={ei}
            entry={entry}
            entryId={`${si}-${ei}`}
            slug={slug}
            collapsed={collapsed}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </>
  )
}

export function CheatsheetView({
  cheatsheet,
  slug,
  collapsed,
  fontSize = 'md',
  columnCount,
  layoutOverrides = {},
  onLayoutChange,
  searchQuery = '',
  onSearchChange,
  headingOverrides = {},
  onHeadingChange,
}: {
  cheatsheet: Cheatsheet
  slug: string
  collapsed: boolean
  fontSize?: FontSize
  columnCount: number
  layoutOverrides?: LayoutOverrides
  onLayoutChange?: (overrides: LayoutOverrides) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  headingOverrides?: HeadingOverrides
  onHeadingChange?: (sectionIndex: number, name: string) => void
}) {
  const color = cheatsheet.color ?? '#4a90d9'
  const { isSectionAllHidden, toggleSection } = useHiddenEntries()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const visibleSections = useMemo(() => {
    const result: VisibleSection[] = []
    for (let si = 0; si < cheatsheet.sections.length; si++) {
      const section = cheatsheet.sections[si]
      const allHidden = isSectionAllHidden(slug, si, section.entries.length)
      if (allHidden && collapsed) continue
      result.push({ section, sectionIndex: si, height: section.entries.length + 1 })
    }
    return result
  }, [cheatsheet.sections, slug, collapsed, isSectionAllHidden])

  const columns = useMemo(() => {
    if (Object.keys(layoutOverrides).length > 0) {
      return applySectionOverrides(visibleSections, columnCount, layoutOverrides)
    }
    return balanceSections(visibleSections, columnCount)
  }, [visibleSections, columnCount, layoutOverrides])

  const activeSectionIndex = activeId ? Number(activeId.replace('section-', '')) : null
  const activeSection = activeSectionIndex !== null
    ? cheatsheet.sections[activeSectionIndex]
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const sectionIndex = Number(String(active.id).replace('section-', ''))
    const targetColumnStr = String(over.id)

    let targetColumn: number
    if (targetColumnStr.startsWith('column-')) {
      targetColumn = Number(targetColumnStr.replace('column-', ''))
    } else {
      // Dropped on another section — find which column that section is in
      const targetSectionIndex = Number(targetColumnStr.replace('section-', ''))
      targetColumn = columns.findIndex((col) =>
        col.some((s) => s.sectionIndex === targetSectionIndex),
      )
      if (targetColumn === -1) return
    }

    // Find current column
    const currentColumn = columns.findIndex((col) =>
      col.some((s) => s.sectionIndex === sectionIndex),
    )
    if (currentColumn === targetColumn) return

    const newOverrides = { ...layoutOverrides }

    // Set overrides for all sections based on current columns state
    for (let ci = 0; ci < columns.length; ci++) {
      for (const s of columns[ci]) {
        if (s.sectionIndex === sectionIndex) {
          newOverrides[s.sectionIndex] = targetColumn
        } else {
          newOverrides[s.sectionIndex] = ci
        }
      }
    }

    onLayoutChange?.(newOverrides)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{cheatsheet.app}</h1>
        {cheatsheet.subtitle && (
          <p className="mt-1 text-sm text-gray-500">{cheatsheet.subtitle}</p>
        )}
        {onSearchChange && (
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search actions..."
              className="w-full max-w-xs rounded border border-gray-200 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-gray-300 focus:outline-none"
            />
          </div>
        )}
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className="cheatsheet-columns grid gap-6"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, fontSize: fontSizeEm[fontSize] }}
        >
          {columns.map((colSections, ci) => (
            <DroppableColumn key={ci} id={`column-${ci}`}>
              {colSections.map(({ section, sectionIndex: si }) => (
                <DraggableSection
                  key={si}
                  id={`section-${si}`}
                  isDragging={activeId === `section-${si}`}
                >
                  <SectionContent
                    section={section}
                    sectionIndex={si}
                    slug={slug}
                    collapsed={collapsed}
                    color={color}
                    searchQuery={searchQuery}
                    displayName={headingOverrides[si] ?? section.name}
                    onHeadingChange={onHeadingChange}
                    toggleSection={toggleSection}
                    isSectionAllHidden={isSectionAllHidden}
                  />
                </DraggableSection>
              ))}
            </DroppableColumn>
          ))}
        </div>
        <DragOverlay>
          {activeSection && activeSectionIndex !== null && (
            <div className="rounded-lg border border-blue-200 bg-white p-3 shadow-lg">
              <h3
                className="mb-2 border-b-2 pb-1 text-sm font-semibold uppercase tracking-wide"
                style={{ borderColor: color, color }}
              >
                {activeSection.name}
              </h3>
              <p className="text-xs text-gray-400">{activeSection.entries.length} entries</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
