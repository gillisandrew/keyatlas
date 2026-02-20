#import "@preview/keyle:0.2.0": config, themes

#let kbd = config(theme: themes.standard)

#let cheatsheet(
  title: "Cheat Sheet",
  subtitle: none,
  accent-color: rgb("#4a90d9"),
  paper: "us-letter",
  columns: 3,
  font-scale: 1.0,
  orientation: "landscape",
  version: none,
  body,
) = {
  let base-size = 8.5pt * font-scale
  set document(title: title)
  set page(
    paper: paper,
    flipped: orientation == "landscape",
    margin: (x: 1cm, y: 0.8cm),
    columns: columns,
    footer: if version != none {
      align(right, text(size: 6pt * font-scale, fill: luma(200), [keyatlas v#version]))
    },
    background: {
      // Large decorative title — semi-transparent behind content
      place(
        top + left,
        dx: 0.6cm,
        dy: 0.4cm,
        text(
          size: 48pt * font-scale,
          weight: "bold",
          fill: accent-color.lighten(85%),
          title,
        ),
      )
    },
  )
  set text(font: "Inter Variable", size: base-size)
  set par(leading: 0.5em)

  // Title block
  block(
    width: 100%,
    inset: (bottom: 6pt),
    {
      text(size: 14pt * font-scale, weight: "bold", fill: accent-color, title)
      if subtitle != none {
        h(8pt)
        text(size: 8pt * font-scale, fill: luma(140), subtitle)
      }
      v(4pt)
      line(length: 100%, stroke: 0.75pt + accent-color.lighten(40%))
    },
  )
  v(2pt)

  body
}

#let render-keys(keys) = {
  // Detect chord: if first element is an array, treat as multi-step
  if type(keys.first()) == array {
    keys.map(step =>
      step.map(k => box(baseline: 30%, kbd(k))).join(
        box(inset: (left: 3pt, right: 2pt), text(size: 1.06em, fill: luma(140), "+"))
      )
    ).join(
      box(inset: (left: 4pt, right: 3pt), text(size: 1.06em, fill: luma(140), ","))
    )
  } else {
    keys.map(k => box(baseline: 30%, kbd(k))).join(
      box(inset: (left: 3pt, right: 2pt), text(size: 1.06em, fill: luma(140), "+"))
    )
  }
}

#let render-entry(entry, bg, accent-color: rgb("#4a90d9")) = {
  block(
    width: 100%,
    fill: bg,
    inset: (x: 6pt, y: 2.5pt),
    radius: 1.5pt,
    grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      gutter: 6pt,
      text(size: 1.18em, entry.action),
      {
        render-keys(entry.keys)
        if "alt_keys" in entry {
          box(inset: (left: 3pt, right: 2pt), text(size: 1.06em, fill: luma(160), "/"))
          render-keys(entry.alt_keys)
        }
        if "range" in entry {
          box(inset: (left: 3pt, right: 2pt), text(size: 1.06em, fill: luma(160), "–"))
          render-keys(entry.range)
        }
      },
    ),
  )
}

#let keybinding-section(name, entries, accent-color: rgb("#4a90d9")) = {
  let peek = calc.min(entries.len(), 2)
  block(
    width: 100%,
    breakable: false,
    {
      // Section header — left accent stripe, uppercase with tracking
      block(
        width: 100%,
        stroke: (left: 2.5pt + accent-color),
        inset: (left: 8pt, y: 3pt, right: 5pt),
        text(
          weight: "bold",
          size: 1.06em,
          fill: accent-color.darken(10%),
          tracking: 0.05em,
          upper(name),
        ),
      )
      v(3pt)
      for i in range(peek) {
        let bg = if calc.rem(i, 2) == 0 { accent-color.lighten(95%) } else { white }
        render-entry(entries.at(i), bg, accent-color: accent-color)
      }
    },
  )
  for i in range(peek, entries.len()) {
    let bg = if calc.rem(i, 2) == 0 { accent-color.lighten(95%) } else { white }
    render-entry(entries.at(i), bg, accent-color: accent-color)
  }
  v(6pt)
}

#let keybinding-sections(data, accent-color: rgb("#4a90d9")) = {
  for section in data.sections {
    keybinding-section(section.name, section.entries, accent-color: accent-color)
  }
}
