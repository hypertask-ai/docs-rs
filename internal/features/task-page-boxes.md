# Task page boxes: one outline and corner style

Every content box on a task page uses one outline and corner style, and cards share the look across all visual themes.

## Observable behavior

Each content box on a task page uses a single outline per theme.

| Theme     | Outline thickness | Corner radius |
| --------- | ----------------- | ------------- |
| Porcelain | 1px (hairline)    | 5px           |
| Graphite  | 1px (hairline)    | 5px           |
| AMOLED    | 1px (hairline)    | 5px           |
| Dia       | 1px (hairline)    | 10px          |

The affected boxes are:

- Task description
- Posted comments
- Comment input
- Details panel

## Visual consistency

There are no half states for the outline. It applies to all four sides of a box or to none of them.

This unifies interactive elements and gives the task screen one visual language.

## Default behavior

No setting or toggle changes this. The style applies automatically.
