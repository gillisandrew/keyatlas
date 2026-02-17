#import "@preview/keyle:0.2.0": config, themes

#let kbd = config(theme: themes.standard)

#let cheatsheet(
  title: "Cheat Sheet",
  subtitle: none,
  accent-color: rgb("#4a90d9"),
  paper: "us-letter",
  columns: 3,
  body,
) = {
  set document(title: title)
  set page(
    paper: paper,
    flipped: true,
    margin: (x: 0.8cm, y: 0.6cm),
    columns: columns,
  )
  set text(font: "Helvetica Neue", size: 8.5pt)
  set par(leading: 0.45em)

  // Title block in first column
  block(
    width: 100%,
    inset: (bottom: 4pt),
    {
      text(size: 16pt, weight: "bold", fill: accent-color, title)
      if subtitle != none {
        linebreak()
        text(size: 9pt, fill: luma(100), subtitle)
      }
      v(2pt)
      line(length: 100%, stroke: 0.5pt + accent-color)
    },
  )

  body
}

#let render-keys(keys) = {
  // Detect chord: if first element is an array, treat as multi-step
  if type(keys.first()) == array {
    // Chord: render each step, join with comma separator
    keys.map(step =>
      step.map(k => box(baseline: 30%, kbd(k))).join(
        box(inset: (left: 3pt, right: 2pt), text(size: 9pt, fill: luma(140), "+"))
      )
    ).join(
      box(inset: (left: 4pt, right: 3pt), text(size: 9pt, fill: luma(140), ","))
    )
  } else {
    // Simple shortcut: join with +
    keys.map(k => box(baseline: 30%, kbd(k))).join(
      box(inset: (left: 3pt, right: 2pt), text(size: 9pt, fill: luma(140), "+"))
    )
  }
}

#let render-entry(entry, bg) = {
  block(
    width: 100%,
    fill: bg,
    inset: (x: 5pt, y: 2pt),
    radius: 1pt,
    grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      gutter: 4pt,
      text(size: 10pt, entry.action),
      {
        render-keys(entry.keys)
        if "alt_keys" in entry {
          box(inset: (left: 3pt, right: 2pt), text(size: 9pt, fill: luma(140), "/"))
          render-keys(entry.alt_keys)
        }
        if "range" in entry {
          box(inset: (left: 3pt, right: 2pt), text(size: 9pt, fill: luma(140), "–"))
          render-keys(entry.range)
        }
      },
    ),
  )
}

#let keybinding-section(name, entries, accent-color: rgb("#4a90d9")) = {
  // Keep header and first two entries together so the heading is never
  // stranded at the bottom of a column.
  let peek = calc.min(entries.len(), 2)
  block(
    width: 100%,
    breakable: false,
    {
      // Section header
      block(
        width: 100%,
        fill: accent-color.lighten(85%),
        inset: (x: 5pt, y: 3pt),
        radius: 2pt,
        text(weight: "bold", size: 10pt, fill: accent-color.darken(20%), name),
      )
      v(2pt)
      for i in range(peek) {
        let bg = if calc.rem(i, 2) == 0 { luma(248) } else { white }
        render-entry(entries.at(i), bg)
      }
    },
  )
  // Remaining entries can break freely across columns
  for i in range(peek, entries.len()) {
    let bg = if calc.rem(i, 2) == 0 { luma(248) } else { white }
    render-entry(entries.at(i), bg)
  }
  v(5pt)
}

#let keybinding-sections(data, accent-color: rgb("#4a90d9")) = {
  let paper = data.at("paper", default: "us-letter")
  let columns = data.at("columns", default: 3)
  for section in data.sections {
    keybinding-section(section.name, section.entries, accent-color: accent-color)
  }
}
