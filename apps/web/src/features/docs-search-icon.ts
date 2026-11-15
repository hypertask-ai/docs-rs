import type { HtmlBuilder } from "foldkit/html";

export const docsSearchIcon = <Message>(
  h: HtmlBuilder<Message>,
  className: string,
  size: number
) =>
  h.svg(
    [
      h.Class(className),
      h.Width(String(size)),
      h.Height(String(size)),
      h.ViewBox("0 0 24 24"),
      h.Fill("currentColor"),
      h.AriaHidden(true),
      h.Attribute("focusable", "false"),
    ],
    [
      h.path([
        h.D(
          "M21.71 20.29 18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a.999.999 0 0 0 1.42 0 1 1 0 0 0 0-1.39ZM11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
        ),
      ]),
    ]
  );
