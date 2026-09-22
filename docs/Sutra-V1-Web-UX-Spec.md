# Sūtra — V1 Web UX & Screen Specification

**Status:** Frozen V1 baseline  
**Client:** `apps/web`  
**Platform:** Web / desktop-first, responsive  
**Stack:** Next.js + shadcn/ui  
**Purpose:** Product/UX source of truth for the Sūtra web application before implementation

---

## 1. Product Role

The Sūtra web application is the primary large-screen workspace for communication.

It shares the same product model as mobile but is optimized for:

> **persistent context → fast navigation → information density → parallel work**

The web application should not simply be a larger version of the mobile app.

Desktop has enough space to keep navigation, context, and the active conversation visible at the same time.

The web V1 must feel production-grade:

- real loading states
- real empty states
- errors and retry
- optimistic mutations where appropriate
- realtime updates
- reconnecting/offline behavior
- permission boundaries
- deep links
- keyboard shortcuts
- responsive behavior
- session handling
- accessible interactions

Visual polish follows functional completeness, but the baseline UI should still feel intentional and coherent.

---

# 2. Core Product Model

The shared product model is:

```text
Organization
    ↓
Spaces
    ↓
Conversations
    ↓
Messages
    ↓
Threads
```

Supporting concepts:

```text
User
Membership
Conversation Member
Direct Messages
Notifications
Reactions
Attachments
Subscription / Entitlements
```

The UI should use familiar terminology.

Do not introduce special Sūtra vocabulary in V1.

---

# 3. Desktop Information Architecture

The core desktop shell is:

```text
┌─────────────────────────────────────────────────────────────┐
│ Organization / global controls                              │
├──────────────┬──────────────────┬───────────────────────────┤
│ Primary Nav  │ Context Nav      │ Main Content              │
│              │                  │                           │
│ Home         │ Current Space    │ Conversation / Home      │
│ Spaces       │                  │                           │
│ Inbox        │ Conversations    │                           │
│ Search       │                  │                           │
│              │                  │                           │
│              │                  │                           │
├──────────────┴──────────────────┴───────────────────────────┤
│ Account / profile                                            │
└─────────────────────────────────────────────────────────────┘
```

This is the default mental model, not a requirement that every screen must render three visible columns.

The shell adapts based on context.

---

# 4. Primary Navigation

The primary navigation is:

```text
Home
Spaces
Inbox
Search
```

Secondary areas:

```text
Organization
Members
Settings
Billing
Profile
Preferences
```

The primary navigation should remain quickly accessible.

Do not hide the major communication surfaces behind a hamburger menu on normal desktop widths.

---

# 5. Organization Switcher

The current organization should be visible in the application shell.

The organization switcher allows:

- switching organizations
- viewing organization identity
- entering organization settings when permitted

Flow:

```text
Organization switcher
    ↓
Organization list
    ↓
Select organization
    ↓
Home for selected organization
```

Switching organization should reset organization-scoped navigation safely.

Do not accidentally carry a conversation route from one organization into another.

---

# 6. Global Search

Search should be accessible globally.

Suggested entry point:

```text
Search
[ Search messages, people, Spaces... ]
```

Keyboard shortcut should be supported where practical.

Desktop users should be able to invoke search without first navigating away from their current work.

Search should support:

- messages
- conversations
- Spaces
- people

Advanced filters can progressively appear after the basic search interaction.

---

# 7. Home

Home answers:

> **What is happening and what should I look at next?**

Suggested structure:

```text
Home

Needs attention
────────────────────────────

Mention
Engineering
"Can you review this?"

Thread reply
Acme Website
"Design B is ready"

Recent
────────────────────────────

Acme Website
Engineering
Design
Operations
```

Home is not intended to become a generic activity feed.

Information hierarchy:

1. things requiring attention
2. relevant/recent work
3. entry points into Spaces and conversations

---

# 8. Home States

## Loading

Use structured skeletons.

Avoid a completely blank application shell while data loads.

## Empty

For a new organization:

```text
Welcome to Sūtra

Create your first Space or invite your team to get started.
```

Provide a clear next action.

## Error

Explain what failed and offer retry.

## Partial data

Render available sections when possible.

Do not block the entire home screen because one secondary request failed.

## Offline

Keep cached content visible where available and clearly communicate that it may be stale.

---

# 9. Spaces

## Screen: Spaces

Purpose:

Show the user's work contexts.

Example:

```text
Spaces

Your Spaces

Engineering
Design
Operations
Founder's Office
Acme Website
Client B

+ New Space
```

A Space row may show:

- name
- unread state
- mention/attention indicator
- optional icon

The list should remain simple.

---

# 10. Space

A Space represents a work context.

Example:

```text
Acme Website

Overview

Conversations
────────────────

General
Design
Development
```

A Space may show lightweight contextual information such as:

- description
- members
- recent activity

Do not turn V1 Spaces into full project-management dashboards.

The primary job of a Space is to organize communication.

---

# 11. Space Overview

The overview should remain intentionally lightweight.

Possible content:

```text
Acme Website

Description

Recent conversations

Members
```

The overview should help orient a user who enters the Space for the first time.

It should not compete with conversations for attention.

---

# 12. Conversation Navigation

Within a Space:

```text
Conversations

General
Design
Development
```

The context navigation should remain persistent on desktop while the user is working inside a Space.

Each conversation may show:

- unread state
- latest activity
- mention indicator
- latest message preview where useful

---

# 13. Create Space

## UI

Use a dialog or appropriate modal rather than a full page where possible.

Fields:

- name
- description
- visibility
- optional icon

V1 visibility:

- Public
- Private

States:

```text
Idle
Submitting
Success
Validation error
Server error
Retry
```

After creation, the user should enter the new Space or its default conversation according to the final product behavior.

---

# 14. Create Conversation

Use a dialog.

Fields:

- name
- description/topic where applicable
- visibility/access where applicable

Primary action:

**Create**

After successful creation, navigation should take the user into the useful resulting context.

Do not leave users wondering whether creation succeeded.

---

# 15. Conversation Screen

The conversation screen is the primary communication surface.

Desktop structure:

```text
Conversation header
────────────────────────────────────────────

Message history

Message history

Message history

────────────────────────────────────────────
Composer
```

When a thread is open:

```text
┌─────────────────────────────┬──────────────────────┐
│ Conversation                │ Thread               │
│                             │                      │
│ Messages                    │ Original message     │
│                             │                      │
│                             │ Replies              │
│                             │                      │
│                             │ Reply composer       │
└─────────────────────────────┴──────────────────────┘
```

The thread panel should preserve the main conversation context.

---

# 16. Conversation Header

Header contains:

- Space/conversation identity
- conversation description/topic when useful
- member/access information where useful
- conversation actions
- search/context actions where appropriate

Avoid filling the header with secondary controls.

Primary purpose:

> Tell the user exactly where they are.

---

# 17. Message Timeline

The message timeline supports:

- pagination
- grouped messages
- timestamps
- unread divider
- reactions
- mentions
- attachments
- links
- code formatting where supported
- thread indicators
- edited state
- deleted state
- failed state
- optimistic messages

Message rendering must remain performant with long conversations.

---

# 18. Message Grouping

Messages from the same user within a reasonable time window may be visually grouped.

A new group should appear when:

- author changes
- meaningful time passes
- system/context boundary occurs

Exact grouping thresholds are an implementation/design detail and may be tuned during visual design.

The information hierarchy must remain:

```text
Who
What
When
Context / reactions / replies
```

---

# 19. Message Actions

Primary actions:

- Reply
- React
- Copy
- Edit own message
- Delete own message
- Open thread
- Additional permitted actions

Desktop can use hover/contextual controls.

Do not permanently display a large action toolbar on every message.

Context menus should remain discoverable and keyboard accessible.

---

# 20. Message Composer

The composer is a persistent bottom interaction on conversation screens.

Base:

```text
[ + ] [ Message...                              ] [Send]
```

Supports:

- multiline text
- mentions
- emoji
- attachments
- reply context
- edit context
- send
- retry failed messages

Composer behavior must remain stable while the conversation scrolls.

---

# 21. Composer States

```text
Idle
Typing
Mention selection
Emoji selection
Attachment pending
Sending
Sent
Failed
Retrying
```

A failed message must remain visible.

The user must be able to retry without losing the content.

---

# 22. Threads

On desktop, threads should normally open in a right-side panel.

Example:

```text
Conversation                  Thread
───────────────────          ───────────────

Original message             Original message

Messages                     Reply
                             Reply
                             Reply

                             Composer
```

The main conversation should remain visible.

The thread panel may have its own navigation/history where appropriate.

Closing the thread returns the user to the conversation without losing their scroll position.

---

# 23. Thread States

Support:

- loading
- loaded
- empty/no replies
- reply sending
- reply failure
- retry
- realtime reply
- reconnecting

A thread should always retain the identity of the original message.

---

# 24. Direct Messages

Direct messages are communication contexts rather than a separate product experience.

Desktop access can live under Inbox / messaging navigation.

The UI should support:

- 1:1 DMs
- group DMs

DM conversation screens should reuse the primary conversation/message components wherever possible.

Do not maintain two independent message systems.

---

# 25. Starting a DM

Entry points:

- Inbox
- user profile
- People/member list
- search

Flow:

```text
New message
    ↓
Select person/people
    ↓
Open DM
```

For group DMs:

```text
New message
    ↓
Select multiple people
    ↓
Open group DM
```

Keep selection fast.

---

# 26. Inbox

Inbox answers:

> **What needs me?**

This is different from Home.

Home:

> What's happening?

Inbox:

> What needs my attention?

Inbox may contain:

- mentions
- thread replies
- direct messages
- relevant notifications

Items should deep-link to exact context.

Example:

```text
Rahul mentioned you
    ↓
Exact message
```

Avoid forcing the user through multiple navigation levels.

---

# 27. Inbox Layout

Desktop can use a focused list:

```text
Inbox

Mentions
────────────────────────

Rahul mentioned you
Engineering
10 min ago

Replies
────────────────────────

Aisha replied to your message
Acme Website
1h ago

Direct
────────────────────────

Priya sent a message
```

Read/unread state should remain obvious.

---

# 28. Notifications

Notifications and unread state are distinct.

Sūtra should model:

```text
Unread
Attention
Notification
Push notification
```

Push is a delivery mechanism.

Inbox is the durable user-facing attention surface.

Desktop notifications may include:

- in-app indicators
- badges
- browser notifications where permission is granted

---

# 29. Search

Search is a first-class web feature.

## Search entry

Accessible from primary navigation and keyboard shortcut.

Example:

```text
Search

[ Acme design approval                         ]
```

## Results

Results can be grouped or filtered by:

```text
All
Messages
Conversations
Spaces
People
```

A message result should show enough context to understand why it matched.

Clicking a message result should navigate to the exact message.

---

# 30. Search Filters

V1 should provide useful filters without making advanced search syntax mandatory.

Potential filters:

- organization context
- Space
- conversation
- person
- date range
- result type

Exact filter depth can be limited for V1.

The default search experience must remain simple.

---

# 31. Search States

- initial
- loading
- results
- no results
- error
- stale/offline results where applicable

No-results state should explain what was searched and provide a useful next action.

---

# 32. People / Members

## Screen: People

Show:

- avatar
- name
- role where relevant
- presence/status where supported
- member type where relevant

Actions:

- open profile
- start DM
- administrative actions for permitted users

People is a communication utility, not a social network.

---

# 33. User Profile

A profile can be opened from:

- message author
- People
- DM
- search
- member management

Show:

- avatar
- display name
- presence/status
- basic profile information
- organization context where appropriate

Actions:

- message
- administrative actions where permitted

---

# 34. Organization Administration

Organization settings are separate from personal settings.

V1:

```text
Organization Settings

General
Members
Invitations
Spaces
Billing
```

Only authorized roles see administrative controls.

---

# 35. Member Management

V1 supports:

- view members
- invite members
- revoke pending invitations where supported
- remove members
- basic role management

Do not build enterprise IAM.

Permission checks must happen server-side.

The UI should reflect permissions but must never be the only security boundary.

---

# 36. Invitations

Invite flow:

```text
Invite members
    ↓
Enter email(s)
    ↓
Send
    ↓
Pending invitations
```

Handle:

- invalid email
- duplicate member
- already invited
- invitation failure
- rate limit
- resend where supported

Invitation status should be visible to administrators.

---

# 37. External Members

V1 supports external members.

An external member can only access Spaces/conversations explicitly available to them.

The web UI must make access context understandable.

Do not build a separate client portal in V1.

---

# 38. Attachments

Web attachment flow:

```text
Composer
    ↓
Attach
    ↓
File picker / drag & drop
    ↓
Preview / upload
    ↓
Send
```

Support:

- image previews
- file metadata
- upload progress
- cancellation
- failure
- retry
- size/type validation

Drag-and-drop may be supported on desktop where practical.

---

# 39. Realtime

Web UX must support realtime updates for:

- new messages
- edits
- deletes
- reactions
- thread replies
- typing
- presence
- read state

The UI must remain coherent during:

- connection loss
- reconnect
- missed events
- duplicate events
- stale events
- resynchronization

Users should not see duplicate messages or lose their current context.

---

# 40. Unread State

Unread state should exist at multiple useful levels:

```text
Organization
    ↓
Space
    ↓
Conversation
    ↓
Message position
```

The UI should avoid excessive badge noise.

A user should be able to understand:

- what is unread
- where it is
- whether they were directly mentioned
- where to resume

An unread divider in a conversation is important.

---

# 41. Read State

Read state should be treated separately from notifications.

Reading a conversation may advance the user's read position.

The system should not assume that receiving a message means the user read it.

Read state must remain robust across:

- multiple browser tabs
- mobile + web
- reconnects
- stale sessions

---

# 42. Keyboard Shortcuts

V1 should support a small set of high-value shortcuts.

Potential examples:

```text
Search
New message
Navigate Home
Navigate Inbox
Navigate Spaces
Close modal/panel
Focus composer
```

Do not build a giant keyboard command system in V1.

Shortcuts should never be the only way to perform an action.

---

# 43. Browser / Desktop Behavior

The web app should support:

- browser refresh
- direct route entry
- back/forward navigation
- multiple tabs
- deep links
- responsive resizing
- reasonable narrow-window behavior

A refresh must not unexpectedly destroy local draft state where preservation is practical.

---

# 44. Routes vs Dialogs vs Sheets vs Panels

The following is the V1 interaction guideline.

## Full routes

Use for durable destinations:

- Home
- Spaces
- Search
- Inbox
- Profile
- Organization settings
- Billing
- People

## Dialogs

Use for focused creation/destructive actions:

- Create Space
- Create conversation
- Invite members
- Confirm delete
- Confirm leave/remove
- Rename/edit simple entities

## Popovers / menus

Use for:

- organization switcher
- user actions
- message actions
- filters
- small contextual controls

## Persistent side panel

Use for:

- Space/conversation navigation
- thread panel

## Temporary side sheet

Use where a contextual workflow benefits from more room without requiring a full route.

The exact implementation may evolve during development, but navigation semantics should remain stable.

---

# 45. Responsive Behavior

Desktop is the primary web target.

At smaller widths:

- collapse secondary navigation
- preserve primary navigation access
- convert persistent panels into temporary navigation
- convert thread panel into an appropriate overlay/route
- maintain composer usability
- never simply scale desktop UI until text becomes unusable

The web should remain usable on tablet-sized widths.

The mobile app remains the preferred small-screen experience.

---

# 46. Authentication

Web authentication uses the existing backend auth system.

Flow:

```text
Open Sūtra
    ↓
Session bootstrap
    ↓
Authenticated → destination
    ↓
Unauthenticated → Sign in
```

Support:

- OAuth
- session persistence
- access-token refresh
- logout
- expired session
- revoked session
- authentication errors
- OAuth callback/deep-link return

The client must use the existing backend contracts.

Do not create a second authentication model for web.

---

# 47. Onboarding

After authentication:

```text
Existing organization
    → Home

Pending invitation
    → Invitation flow

No organization
    → Create organization
```

Onboarding should be short.

## Create organization

Fields:

- organization name
- optional identity/avatar

## Profile setup

Required:

- display name

Optional:

- avatar

V1 can use generated avatars such as DiceBear rather than requiring avatar uploads.

---

# 48. First-Run Empty Organization

A newly created organization should not look broken.

Show:

```text
Welcome to [Organization]

Create your first Space
Invite your team
```

Provide clear actions.

Do not create fake conversations merely to make the UI look populated.

---

# 49. Profile / Personal Settings

Personal settings:

```text
Profile
Notifications
Appearance
Sessions
Account
```

Capabilities:

- display name
- avatar
- notification preferences
- appearance preferences
- session management
- logout
- account settings

Personal settings must remain separate from organization administration.

---

# 50. Organization Billing

Billing exists on the web as part of organization administration.

```text
Organization Settings
    ↓
Billing
```

Billing can expose:

- current plan
- entitlements
- member/seat usage
- billing period
- subscription status
- payment method
- invoices/history where applicable
- upgrade/downgrade
- cancellation
- payment failure/past-due state

The exact pricing model remains intentionally flexible.

The architecture must support:

```text
Plan
    ↓
Entitlements
    ↓
Organization Subscription / License
    ↓
Feature + Usage Limits
```

Hosted subscriptions are managed through the web/backend.

Self-hosted deployments use the separate licensing model.

The mobile app consumes entitlements but does not own subscription management.

---

# 51. Session Management

The web client must handle:

- access-token expiry
- refresh
- refresh failure
- revoked sessions
- logout
- multiple active sessions

A failed refresh must not cause infinite request loops.

Sensitive credentials must follow the established backend/client security model.

---

# 52. Error Handling

Every network-backed screen and mutation must have a user-facing recovery path.

Examples:

```text
Load
 ↓
Success / Error
             ↓
           Retry
```

Mutation:

```text
Action
 ↓
Optimistic where appropriate
 ↓
Success / Failure
             ↓
           Retry / rollback
```

Raw backend errors must not be shown directly to users.

---

# 53. Permission Boundaries

The server remains authoritative.

The web UI should:

- hide irrelevant controls where appropriate
- disable unavailable actions where appropriate
- explain permission restrictions
- handle permission changes while the user is active

If a user loses access to a Space or conversation:

```text
Existing screen
    ↓
Access revoked
    ↓
Clear explanation
    ↓
Safe fallback navigation
```

Do not leave the user on a broken/private screen.

---

# 54. Deep Links

V1 web routes should support direct access to:

- organization
- Space
- conversation
- thread
- message
- DM

A direct link must:

1. bootstrap authentication
2. validate authorization
3. load the destination
4. preserve context

If unauthenticated:

```text
Deep link
 ↓
Sign in
 ↓
Original destination
```

If unauthorized:

```text
Deep link
 ↓
Access denied / unavailable
```

No private content should leak through metadata or client-side rendering.

---

# 55. Draft Preservation

The composer should preserve unsent text where practical.

Important cases:

- accidental navigation
- thread opening
- modal opening
- temporary network failure
- browser refresh where technically safe

Drafts should be scoped correctly to avoid accidentally posting text into the wrong conversation.

---

# 56. Multi-tab Behavior

Users may have Sūtra open in multiple tabs.

The application should tolerate:

- read-state updates
- session refresh
- logout in another tab
- realtime events
- organization switching

Do not assume a single browser tab is the only active client.

---

# 57. Accessibility Baseline

V1 web must include:

- keyboard navigation
- visible focus states
- accessible labels
- semantic structure
- dialog focus management
- keyboard-accessible menus
- sufficient contrast
- no critical information conveyed only through color
- sensible screen-reader behavior

shadcn/ui components should be used with their accessibility patterns rather than stripped down into inaccessible custom controls.

---

# 58. Performance Baseline

Important surfaces must remain responsive with realistic data.

Pay attention to:

- long message lists
- thread panels
- image/file previews
- search results
- realtime updates
- optimistic messages
- navigation transitions
- multiple open panels
- large Spaces/conversation lists

Use pagination/virtualization where appropriate.

---

# 59. V1 Web Screen Inventory

## Entry

1. Session bootstrap
2. Sign in
3. OAuth callback/error

## Onboarding

4. Welcome/onboarding
5. Create organization
6. Invitation/join organization
7. Profile setup

## Primary

8. Home
9. Spaces
10. Space overview
11. Conversation
12. Thread panel
13. Inbox
14. Search
15. Search results
16. People
17. User profile

## Communication

18. DM list
19. DM conversation
20. New DM
21. Message actions
22. Attachment/upload states

## Organization

23. Organization settings
24. Members
25. Invitations
26. Space settings
27. Billing

## Personal

28. Profile settings
29. Notification settings
30. Appearance settings
31. Session/account settings

Not every item requires a separate page. Some are panels, dialogs, popovers, or nested routes.

---

# 60. Founder Journey

The web founder journey must work end-to-end:

```text
Open Sūtra
    ↓
Sign in
    ↓
Create organization
    ↓
Set profile
    ↓
Create Space
    ↓
Invite team
    ↓
Create conversations
    ↓
Team communicates
    ↓
Open Home
    ↓
See attention items
    ↓
Open exact message
    ↓
Reply
    ↓
Open next Inbox item
    ↓
Search previous discussion
    ↓
Jump to exact message
    ↓
Manage members
    ↓
Manage organization
    ↓
View/manage billing
```

The founder should not need to navigate dozens of conversation groups just to determine what requires attention.

---

# 61. Team Member Journey

```text
Receive invitation
    ↓
Sign in
    ↓
Join organization
    ↓
Profile setup
    ↓
Home
    ↓
Open Space
    ↓
Open conversation
    ↓
Communicate
    ↓
Reply in thread
    ↓
Mention teammate
    ↓
Receive Inbox item
    ↓
Jump directly to context
```

---

# 62. External Client Journey

```text
Receive invitation
    ↓
Sign in
    ↓
Join organization
    ↓
See permitted Spaces/conversations
    ↓
Open client/project context
    ↓
Communicate
    ↓
Receive replies/mentions
    ↓
Return directly to relevant context
```

The client should not see unrelated internal agency communication.

No separate client portal is required for V1.

---

# 63. Web V1 Attention Loop

This is one of the most important Sūtra interaction loops:

```text
Open Sūtra
    ↓
Home / Inbox
    ↓
Identify what needs attention
    ↓
Open exact context
    ↓
Read
    ↓
Respond
    ↓
Return to Inbox
    ↓
Next item
```

This is a key differentiator from a system that merely stores hundreds of conversation groups.

---

# 64. Web V1 Must Not Become

Do not add these to V1 simply because mature communication products contain them:

- AI assistant
- AI summaries
- project management
- task management
- calendar
- video calls
- audio calls
- workflow automation
- bots
- integrations marketplace
- advanced enterprise administration
- enterprise compliance suite
- complex analytics
- elaborate presence systems
- social/profile feed
- excessive customization

The web V1 should remain focused on:

> **communication, context, attention, discovery, and organization.**

---

# 65. Web + Mobile Consistency Rules

The clients share:

- product terminology
- organization model
- Spaces
- conversations
- messages
- threads
- permissions
- API contracts
- server state
- realtime semantics
- entitlements

They do not share identical navigation.

### Mobile

```text
Attention
→ Context
→ Action
```

### Web

```text
Persistent Context
→ Navigation
→ Parallel Work
```

A user switching between web and mobile should feel like they are using the same product, not two unrelated products.

---

# 66. V1 Freeze Rules

Before adding a new web feature:

1. Is it required for the core communication loop?
2. Does it solve a real user problem?
3. Can an existing product concept represent it?
4. Does it require a backend change?
5. What happens during failure/offline/reconnect?
6. What happens if permissions change?
7. Does it work at realistic data volume?
8. Does it preserve user context?
9. Does it add unnecessary navigation complexity?
10. Can it safely be deferred?

If it is not required for a genuinely complete V1, defer it.

---

# 67. Definition of Web V1

Web V1 is complete when a real team can:

- authenticate
- create/join an organization
- set up profiles
- create/manage Spaces
- create/manage conversations
- communicate in conversations
- send/edit/delete messages
- reply in threads
- react
- mention people
- send/receive attachments
- use DMs
- receive and process Inbox items
- search content
- jump to exact message context
- manage members and invitations
- handle external members safely
- manage basic organization settings
- manage billing/subscription state
- switch organizations
- recover from errors
- operate through reconnects
- use direct links safely
- work efficiently with keyboard/mouse
- use the same account coherently across web and mobile

The result should feel like a **real communication workspace**, not a Slack clone demo.
