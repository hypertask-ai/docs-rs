# Realtime monitoring

A live snapshot of a board, including human activity, at hypertask.app/realtime.

Use the realtime monitoring page to see a live, per-board view of the people currently inside the app. The page covers one board and excludes agents and anonymous sessions from the headline count.

Only signed-in people with events in the last 5 minutes appear in the headline. The page is read-only and offers no actions.

## What the page shows

| Metric | Description |
| --- | --- |
| Active humans (headline) | Distinct signed-in people with events in the last 5 minutes. |
| 30 minute actives | People who interacted in the last 30 minutes. |
| Today actives | People who interacted during the current day. |
| Anonymous and demo sessions | A count of anonymous or demo users, for context. |
| Board scope | The snapshot covers the selected board only. |

## How to get there

- From a board: open the board header to see the board page, which lists the realtime snapshot for that board.
- The realtime view appears below the board title when you open a board from the board switcher or a saved view.

## Scope and exclusions

- Agents and bots are excluded from every activity count.
- Anonymous and demo sessions appear only as a secondary stat and do not contribute to the headline.
- The view updates in real time as people move tasks, comment and edit.

## Composition and staleness

- Realtime fetches verify the subscription and the exact task identity before updating an open task, so an old response cannot overwrite a task opened during navigation.
- Tasks opened in the background fetch and merge comments they missed before their first live connection, so a task stays current when reopened straight after an agent comments. Visible opens still avoid an extra refresh, and real reconnects still catch up.

Use the page to spot a quiet board against a busy one, and to coordinate hand-offs.
