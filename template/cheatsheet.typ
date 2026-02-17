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

  // Title block spanning all columns
  place(
    top + center,
    float: true,
    scope: "parent",
    {
      text(size: 16pt, weight: "bold", fill: accent-color, title)
      if subtitle != none {
        linebreak()
        text(size: 9pt, fill: luma(100), subtitle)
      }
      v(2pt)
      line(length: 100%, stroke: 0.5pt + accent-color)
      v(2pt)
    },
  )

  body
}

#let render-keys(keys) = {
  keys.map(k => box(baseline: 30%, kbd(k))).join(box(inset: (x: 1pt), text(fill: luma(140), "+")))
}

#let keybinding-section(name, entries, accent-color: rgb("#4a90d9")) = {
  block(
    width: 100%,
    inset: (bottom: 5pt),
    breakable: true,
    {
      // Section header
      block(
        width: 100%,
        fill: accent-color.lighten(85%),
        inset: (x: 5pt, y: 3pt),
        radius: 2pt,
        text(weight: "bold", size: 8.5pt, fill: accent-color.darken(20%), name),
      )
      v(2pt)
      // Entries
      for (i, entry) in entries.enumerate() {
        let bg = if calc.rem(i, 2) == 0 { luma(248) } else { white }
        block(
          width: 100%,
          fill: bg,
          inset: (x: 5pt, y: 2pt),
          radius: 1pt,
          grid(
            columns: (1fr, auto),
            align: (left + horizon, right + horizon),
            gutter: 4pt,
            text(size: 8pt, entry.action),
            {
              render-keys(entry.keys)
              if "alt_keys" in entry {
                text(size: 7pt, fill: luma(140), " / ")
                render-keys(entry.alt_keys)
              }
              if "range" in entry {
                text(size: 7pt, fill: luma(140), " – ")
                render-keys(entry.range)
              }
            },
          ),
        )
      }
    },
  )
}

#let keybinding-sections(data, accent-color: rgb("#4a90d9")) = {
  let paper = data.at("paper", default: "us-letter")
  let columns = data.at("columns", default: 3)
  for section in data.sections {
    keybinding-section(section.name, section.entries, accent-color: accent-color)
  }
}
