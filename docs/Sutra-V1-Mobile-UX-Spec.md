# Sūtra — V1 Mobile UX & Screen Specification

**Status:** Frozen V1 baseline  
**Client:** `apps/native`  
**Platform:** Android first  
**Stack:** React Native + Expo + Expo Router  
**Purpose:** Product/UX source of truth for the Sūtra mobile application before implementation

---

## 1. Product Role

The Sūtra mobile app is a first-class companion client for the Sūtra communication platform.

It is not a shrunken web application.

Mobile is optimized around:

> **attention → context → conversation → action**

The primary mobile job is to let a user quickly understand what needs attention, enter the correct work context, communicate, and return later without losing context.

The app must feel production-grade from V1:

- real loading states
- real empty states
- errors and retry
- optimistic actions
- reconnecting/offline behavior
- permission boundaries
- deep links
- keyboard-aware interaction
- Android back behavior
- push notifications
- safe session handling

Visual polish is important, but functional completeness and reliability come first.

---

# 2. Core Product Model

The mobile app exposes the same underlying product model as the web client:

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

The mobile UI should use familiar terminology.

No special Sūtra vocabulary is required for V1.

---

# 3. Primary Mobile Navigation

The V1 root navigation is:

```text
Home
Spaces
Inbox
Search
Profile
```

This is the primary mobile navigation.

## Home

Purpose:

> Give the user a fast understanding of what is happening and what needs attention.

## Spaces

Purpose:

> Navigate into work contexts and their conversations.

## Inbox

Purpose:

> Show things that specifically require the user's attention.

Inbox includes:

- mentions
- thread replies
- relevant notifications
- direct-message activity where appropriate

## Search

Purpose:

> Find messages, conversations, Spaces, and people.

## Profile

Purpose:

> Personal profile, preferences, account/session management, and access to organization settings where permitted.

---

# 4. Global Interaction Principles

## 4.1 Progressive disclosure

Do not expose every possible action simultaneously.

Primary actions should be obvious.

Secondary actions should appear through:

- contextual menus
- bottom sheets
- long press
- overflow actions

## 4.2 Context preservation

Whenever a user opens something from a notification, search result, or Inbox item, take them as close as possible to the exact relevant message/thread.

Avoid forcing:

```text
notification
→ Space
→ Conversation
→ message
```

when the app can directly open:

```text
notification
→ exact message
```

## 4.3 Consistent navigation

The user should always understand:

- where they are
- what they opened
- how to go back
- what context they came from

## 4.4 Touch-first

Interactions must work comfortably on a phone.

Avoid tiny targets and desktop-style hover assumptions.

---

# 5. First Launch & Authentication Flow

## Screen: Launch / Session Bootstrap

Purpose:

Determine whether the user has a valid session.

States:

```text
Booting
    ↓
Authenticated → Home
    ↓
Unauthenticated → Sign In
```

The app must restore the existing authenticated session when possible.

It must not show the sign-in screen briefly while a valid session is being restored.

---

# 6. Authentication Screens

## Screen: Welcome / Sign In

Purpose:

Provide the primary entry point.

Contains:

- Sūtra branding
- concise product value statement
- Sign in with Google
- other supported OAuth providers when available
- authentication error handling

Do not create a complicated account form if the backend's OAuth-first flow is the intended path.

## Screen: OAuth Transition

Handles:

- opening the OAuth flow
- deep-link return
- loading
- cancellation
- provider errors
- invalid/expired callback
- retry

The mobile client must integrate with the existing backend OAuth/session contract.

---

# 7. New User Onboarding

After authentication, determine whether the user:

```text
Already belongs to an organization
    → Home

Has a pending invitation
    → Invitation flow

Has no organization
    → Create organization
```

## Screen: Welcome / Onboarding

Purpose:

Briefly orient the user after authentication.

Keep it short.

The user should understand:

- Sūtra is their professional communication space
- they will either join an organization or create one

Do not use a long tutorial carousel.

---

# 8. Organization Creation

## Screen: Create Organization

Fields:

- organization name
- optional organization avatar/icon if useful

Primary action:

**Create organization**

States:

```text
Idle
Submitting
Success
Validation error
Server error
Retry
```

After creation:

```text
Create organization
    ↓
Profile setup
    ↓
Invite people / continue
    ↓
Home
```

---

# 9. Invitation / Join Organization

## Screen: Invitation

Show:

- organization name
- inviter
- invitation context
- accept
- decline/skip where appropriate

States:

- loading
- valid invitation
- expired invitation
- revoked invitation
- already accepted
- error

After acceptance:

```text
Join organization
    ↓
Profile setup if incomplete
    ↓
Home
```

---

# 10. Profile Setup

V1 should make profile setup extremely lightweight.

Required:

- display name

Optional:

- avatar

## Avatar

For V1, use generated avatars such as DiceBear rather than building an avatar-management system.

The important requirement is that every user gets a recognizable visual identity.

Future avatar upload/customization can be added later.

Profile setup should not block a user unnecessarily.

---

# 11. Home

Home is the most important mobile screen.

Its purpose is:

> **What needs my attention, and where should I go next?**

Suggested structure:

```text
Home

Good morning, Aditya

Needs attention
────────────────────

Mention
Engineering
"Can you review this?"

Thread reply
Acme Website
"Design B is ready"

Recent
────────────────────

Acme Website
Engineering
Design
Operations
```

The exact visual treatment is not frozen yet.

The information hierarchy is frozen:

1. attention
2. relevant/recent work
3. navigation into context

Home should not become a generic chronological activity feed.

---

# 12. Home States

## Loading

Use structured skeletons rather than a blank screen.

## Empty

For a new user:

```text
You're all set.

Create a Space or join a conversation to get started.
```

The user must have a clear next action.

## Error

Explain the problem and provide retry.

## Partial data

Render available content rather than blocking the whole screen.

## Offline

Clearly communicate that current data may be stale and that new actions may be queued/failed depending on the operation.

---

# 13. Spaces

## Screen: Spaces

Purpose:

Show the user's work contexts.

Possible structure:

```text
Spaces

Your Spaces
────────────

Engineering
Design
Operations
Founder's Office
Acme Website
Client B

+

Create Space
```

The list should surface:

- Space name
- unread indicator
- relevant mention/attention indicator where useful

Do not create unnecessary nested navigation.

---

# 14. Create Space

## Screen / Bottom Sheet: Create Space

Fields:

- name
- description (optional)
- visibility
- optional icon/avatar

V1 visibility:

- Public
- Private

After creation, the creator becomes a member/owner according to backend rules.

States:

- validation
- submitting
- success
- server failure
- retry

---

# 15. Space

## Screen: Space

A Space represents a work context.

Example:

```text
Acme Website

General
Design
Development
```

The screen should show:

- Space identity
- description when present
- conversations
- unread state
- basic member access
- create conversation action where permitted

Do not turn the Space screen into a project-management dashboard.

---

# 16. Conversation List

Within a Space:

```text
Conversations

General
Design
Development
```

Each conversation may show:

- unread count/state
- latest message preview
- latest activity
- mention indicator

Conversation navigation should be predictable and shallow.

---

# 17. Create Conversation

## Screen / Bottom Sheet: Create Conversation

Fields:

- name
- description/topic if applicable
- visibility/access if applicable

Primary action:

**Create**

The creator enters the conversation after successful creation unless product behavior later proves otherwise.

---

# 18. Conversation

This is the primary communication screen.

Structure:

```text
Conversation header
────────────────────

Message history

────────────────────
Composer
```

Header contains:

- back
- Space/conversation identity
- conversation actions

Message area supports:

- pagination
- message grouping
- timestamps
- unread divider
- reactions
- thread indicators
- mentions
- attachments
- failed messages
- loading states

---

# 19. Message Interaction

Primary message interactions:

- reply
- react
- copy
- edit own message
- delete own message
- open thread
- additional actions where permitted

On mobile, use contextual UI such as:

- long press
- bottom sheet
- action sheet

Do not overload every message with permanent action buttons.

---

# 20. Message Composer

The composer is one of the most important reusable mobile components.

Base:

```text
[ + ] [ Message... ] [Send]
```

Capabilities:

- multiline text
- mentions
- emoji
- attachments
- reply context
- edit context
- send
- failed send retry

Keyboard behavior must be carefully handled.

The composer must remain accessible while typing and when the keyboard changes screen size.

---

# 21. Sending State

Every message send follows:

```text
Idle
 ↓
Optimistic message
 ↓
Sending
 ├── Success
 └── Failure
       ↓
     Retry
```

Failed messages must be understandable.

Do not silently discard user messages.

The user should be able to retry without retyping the message.

---

# 22. Threads

## Screen: Thread

On mobile, a thread should generally be a dedicated screen or full-height sheet.

Structure:

```text
Thread

Original message
────────────────

Replies
────────────────

Reply composer
```

Capabilities:

- view original message
- read replies
- send reply
- mentions
- reactions
- attachments
- unread thread state

Opening a thread must preserve enough context to understand what is being discussed.

---

# 23. Direct Messages

## Screen: Inbox / Direct Messages

Direct messages should not require a completely separate product model.

They are communication contexts.

The user can access:

- 1:1 conversations
- group DMs

The DM list should surface:

- person/group name
- avatar
- latest message
- unread state
- relevant attention indicator

## Screen: DM Conversation

Use the same messaging experience as regular conversations wherever possible.

Avoid maintaining two independent message UIs.

---

# 24. Starting a DM

Entry points:

- Inbox
- user profile
- member list
- search

Flow:

```text
Start message
    ↓
Select person/people
    ↓
Open DM
```

Do not create unnecessary intermediate screens.

---

# 25. Inbox

Inbox is distinct from Home.

Mental model:

```text
Home
= What's happening?

Inbox
= What needs me?
```

Inbox sections may include:

- Mentions
- Replies
- DMs
- Other direct notifications

Every item should navigate directly to useful context.

Example:

```text
Rahul mentioned you
    ↓
Exact conversation/message
```

---

# 26. Inbox States

## Unread

Show clear unread state.

## Read

Item remains available where appropriate.

## Empty

```text
You're all caught up.
```

## Error

Retry.

## Offline

Do not pretend the list is current.

---

# 27. Notifications

Notifications and unread state are different concepts.

The app should support:

```text
Unread
Attention
Notification
Push notification
```

Push notifications are delivery mechanisms.

They do not replace the in-app Inbox.

Tapping a push notification should deep-link into the most precise available context.

---

# 28. Push Notification Flows

Examples:

```text
Mention
   ↓
Push
   ↓
Tap
   ↓
Conversation
   ↓
Exact message
```

```text
Thread reply
   ↓
Push
   ↓
Tap
   ↓
Thread
```

```text
DM
   ↓
Push
   ↓
Tap
   ↓
DM conversation
```

The app must handle:

- notification while app is closed
- notification while app is backgrounded
- notification while app is foregrounded
- duplicate notifications
- stale notification targets
- deleted/removed content
- revoked access

---

# 29. Search

## Screen: Search

Search is a primary navigation destination.

Base experience:

```text
Search Sūtra
[ Search... ]
```

Search across:

- messages
- conversations
- Spaces
- people

Do not force users to understand advanced search syntax.

## Search Results

Results should clearly show:

- result type
- relevant context
- matching content
- timestamp where useful

Tapping a message result should navigate to the exact message in context.

---

# 30. Search States

- initial
- typing
- loading
- results
- no results
- error
- offline/stale results where applicable

Empty query should not pretend to be a search.

---

# 31. People / Members

## Screen: People

Available from organization/Space contexts where appropriate.

Show:

- avatar
- name
- role
- presence/status if available
- internal/external distinction where relevant

Actions:

- open profile
- start DM
- relevant admin actions

---

# 32. User Profile

## Screen: Profile

Show:

- avatar
- name
- basic profile
- presence/status
- organization membership where appropriate

Actions:

- message
- profile/account settings

V1 should not turn profiles into social-network pages.

---

# 33. Profile / Account Settings

Sections:

```text
Profile
Notifications
Appearance
Sessions
Account
```

Capabilities:

- change display name
- avatar handling where supported
- notification preferences
- appearance preferences
- session management
- logout
- account settings

---

# 34. Organization Settings

Organization administration is separate from personal settings.

V1:

```text
Organization
──────────────

General
Members
Invitations
Spaces
Billing
```

Only users with appropriate permissions see administrative controls.

---

# 35. Member Management

Admin flow:

```text
Organization
    ↓
Members
    ↓
Member profile/actions
```

V1:

- view members
- invite
- revoke pending invitation where supported
- remove member
- basic role management

Do not build an enterprise permission matrix.

---

# 36. Invitations

## Screen / Flow: Invite Members

Allow invitation from organization management.

Flow:

```text
Invite
    ↓
Enter email(s)
    ↓
Send
    ↓
Pending invitation
```

Handle:

- invalid email
- duplicate member
- already invited
- invitation failure
- rate limits
- resend where supported

---

# 37. External Members

V1 supports internal vs external organization membership.

External members should see only the Spaces/conversations they are permitted to access.

Mobile must clearly communicate context when the user is interacting with external members.

Do not build a separate client portal.

---

# 38. Attachments

Attachments are part of V1 communication.

Mobile upload flow:

```text
Composer
   ↓
+
   ↓
Photo / File
   ↓
Preview
   ↓
Send
```

Handle:

- permissions
- cancellation
- upload progress
- success
- failure
- retry
- unsupported file
- file-size limit
- network interruption

Images should have practical previews.

---

# 39. Offline & Reconnection

Mobile must assume connectivity can disappear.

## Connection states

```text
Connected
    ↓
Disconnected
    ↓
Reconnecting
 ├── Connected
 └── Failed / retry
```

The UI should make connection problems understandable without becoming noisy.

Cached server state may remain visible.

Do not represent stale data as freshly synchronized data.

---

# 40. Realtime UX

Realtime events may include:

- new messages
- message edits
- message deletes
- reactions
- thread replies
- typing
- presence
- read state

The client must tolerate:

- duplicate events
- out-of-order events
- stale events
- reconnects
- missed events followed by resynchronization

These are implementation concerns, but their user-facing result must be coherent.

---

# 41. Android Back Behavior

Back behavior must be intentional.

General expectation:

```text
Thread
 ↓ back
Conversation

Conversation
 ↓ back
Space / previous context

Space
 ↓ back
Spaces

Nested modal/sheet
 ↓ back
Dismiss
```

If a keyboard is open, Android back should first dismiss the keyboard where appropriate rather than unexpectedly navigating away.

Deep-linked screens must also have sensible back behavior.

---

# 42. Deep Links

V1 deep links should support navigation to useful contexts such as:

- organization
- Space
- conversation
- thread
- message
- DM

Notification taps should use the same routing model.

If the user is unauthenticated:

```text
Deep link
 ↓
Authentication
 ↓
Session established
 ↓
Original destination
```

If the user lacks permission:

```text
Deep link
 ↓
Access denied / unavailable
```

Do not expose private content through deep links.

---

# 43. Workspace / Organization Switching

Users may belong to multiple organizations.

Organization switching should be accessible from the profile/avatar area.

Flow:

```text
Profile / organization menu
    ↓
Organizations
    ↓
Select organization
    ↓
Home for selected organization
```

Do not make organization switching part of the primary bottom navigation.

---

# 44. Billing & Subscription on Mobile

The mobile app does not own subscription management.

Subscription lifecycle is handled through the Sūtra web/backend platform.

Mobile consumes organization entitlements.

Examples of mobile behavior:

```text
Feature available
    → allow

Seat limit reached
    → explain limitation
    → direct user to appropriate web-based management experience where permitted by platform rules
```

The mobile product should not implement an independent payment system.

Billing details live under organization administration on the web.

The exact App Store treatment and external-purchase UX must be validated against the current platform review rules before iOS launch.

---

# 45. Session Management

Sensitive credentials must use secure storage.

Direction:

- SecureStore for sensitive credentials
- MMKV for appropriate persistent non-sensitive client state
- no AsyncStorage

The app must handle:

- access token expiry
- refresh
- refresh failure
- revoked session
- logout
- session invalidation

A failed refresh should result in a clean transition to authentication rather than an infinite retry loop.

---

# 46. Error Handling

Every network-backed action should have a clear failure path.

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

Errors should be actionable and human-readable.

Do not expose raw server errors to users.

---

# 47. Permission Handling

Mobile must handle:

- notification permission
- camera/photo permission where applicable
- file/media access
- denied permission
- permanently denied permission

Permission requests should happen in context.

Do not ask for every permission immediately on first launch.

---

# 48. Accessibility Baseline

V1 must include:

- accessible touch targets
- readable text
- meaningful labels
- sensible focus behavior
- screen-reader-compatible interactive elements where practical
- sufficient contrast
- no critical information communicated by color alone

Accessibility is part of the production baseline.

---

# 49. Performance Baseline

Important mobile surfaces must remain responsive with realistic data.

Pay particular attention to:

- long message lists
- message rendering
- thread lists
- search results
- image previews
- optimistic messages
- navigation transitions
- keyboard interaction

Pagination and virtualization should be used where appropriate.

---

# 50. V1 Mobile Screen Inventory

## Entry

1. Launch / session bootstrap
2. Sign in
3. OAuth transition/error

## Onboarding

4. Welcome/onboarding
5. Create organization
6. Invitation / join organization
7. Profile setup

## Primary

8. Home
9. Spaces
10. Space
11. Conversation
12. Thread
13. Inbox
14. Search
15. Search results
16. Profile

## Communication

17. DM list
18. DM conversation
19. Start DM
20. Message actions
21. Attachment picker/preview

## People / Organization

22. People / members
23. User profile
24. Invite members
25. Organization settings
26. Space settings

## Personal

27. Profile settings
28. Notification settings
29. Appearance settings
30. Session/account settings

Some entries above are expected to be implemented as sheets, nested routes, dialogs, or reusable states rather than separate full-screen pages.

---

# 51. V1 Mobile Journey — Founder

A founder's primary journey must work end-to-end:

```text
Install / open
    ↓
Sign in
    ↓
Create organization
    ↓
Set profile
    ↓
Create first Space
    ↓
Invite team
    ↓
Create conversations
    ↓
Team communicates
    ↓
Receive mention
    ↓
Push notification
    ↓
Tap notification
    ↓
Exact message
    ↓
Reply
    ↓
Return to Inbox
    ↓
Handle next item
    ↓
Search old discussion
    ↓
Open exact message
    ↓
Continue work
```

This is the core product loop.

---

# 52. V1 Mobile Journey — Team Member

```text
Receive invitation
    ↓
Sign in
    ↓
Join organization
    ↓
Set profile
    ↓
Home
    ↓
Open Space
    ↓
Open conversation
    ↓
Read/send messages
    ↓
Reply in thread
    ↓
Mention teammate
    ↓
Receive reply
    ↓
Continue conversation
```

---

# 53. V1 Mobile Journey — External Member

```text
Invitation
    ↓
Sign in
    ↓
Join organization
    ↓
See permitted context only
    ↓
Open relevant Space
    ↓
Communicate in allowed conversations
```

The user must never accidentally see unrelated internal content.

---

# 54. What Mobile V1 Must Not Become

Do not add these to V1 mobile merely because they exist in mature communication products:

- AI assistant
- AI summaries
- project management
- tasks
- calendars
- video calls
- audio calls
- workflow automation
- bots
- integrations marketplace
- advanced admin
- enterprise compliance controls
- complex presence systems
- social/profile feeds
- elaborate customization

The mobile V1 should remain focused on:

> **communicating, finding context, and handling attention.**

---

# 55. V1 Freeze Rules

Before implementing a new mobile feature, ask:

1. Is it required for the core communication loop?
2. Does it solve a demonstrated user problem?
3. Can it be represented using an existing product concept?
4. Does it require a new backend capability?
5. What happens on failure/offline/reconnect?
6. What happens when permissions change?
7. Does it work on a physical Android device?
8. Does it preserve context?
9. Does it increase cognitive load?
10. Can it safely be deferred?

If the feature is not necessary for V1 completeness, defer it.

---

# 56. Relationship to Web UX

The web and mobile clients share:

- product model
- terminology
- permissions
- API contracts
- server state
- realtime semantics
- visual identity

They do **not** need identical navigation or interaction patterns.

Mobile is optimized for:

```text
Attention
→ Context
→ Action
```

Web is expected to be optimized for:

```text
Context
→ Navigation
→ Parallel work
```

The website UX will be defined in a separate specification.

---

# 57. Definition of Mobile V1

Mobile V1 is complete when a real team member can:

- authenticate
- join/create an organization
- set up a profile
- navigate Spaces
- enter conversations
- send/edit/delete messages
- reply in threads
- react
- mention people
- send/receive attachments
- use DMs
- receive notifications
- handle Inbox items
- search content
- open exact message context
- manage basic profile/settings
- work through poor connectivity
- recover from errors
- receive correct access boundaries
- switch organizations
- use the app reliably on Android

The app should feel like a **real communication product**, not a mobile demo of a web application.
