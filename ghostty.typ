#import "template/cheatsheet.typ": cheatsheet, keybinding-sections

#let data = yaml("data/ghostty.yaml")

#show: cheatsheet.with(
  title: data.app,
  subtitle: data.at("subtitle", default: none),
  paper: data.at("paper", default: "us-letter"),
  columns: data.at("columns", default: 3),
)

#keybinding-sections(data)
