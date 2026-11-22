# Flags and feedback

Flag details show inline, and a search box stays visible for finding related flags.

## Flag cards with inline labels

**Feature.** Each flag now carries an inline label, **Bug**, **Feature** or **Improvement**, so its intent and scope are clear at a glance.

- **Bug:** a regression or unexpected side effect.
- **Feature:** a new capability, surface or integration.
- **Improvement:** an enhancement that does not preserve existing behavior.

Related flags appear on the card, so dependencies and edge cases read in one view.

## Always-visible search

**Feature.** The search box stays at the top while you scan flags. Use it to find flags by title, description or label. A search stays focused, so you can type and filter without moving the cursor.

## Reaction lifecycles on flags

**Security.** Flag-based triggers respect reaction lifecycles. A thumbs-up or other emoji on a flag comment never counts toward a decision after someone edits that comment.

- **Before an edit:** reactions on a flag comment contribute to flag-based workflow decisions.
- **After an edit:** reactions on that comment no longer apply, and only edits to unedited comments count.

This stops an agent from reusing an earlier reaction after someone refines the comment, while a flag owner can still update their reasoning without losing supportive reactions.
