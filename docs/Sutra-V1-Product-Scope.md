# Sūtra — V1 Product Scope

## Status

**Scope:** Finalized V1  
**Purpose:** Product/UX source of truth before implementation  
**Product:** Sūtra — professional communication workspace

---

# 1. Product Thesis

Sūtra is a professional communication workspace for teams of different shapes.

It is **not a Slack clone** and is not intended to reproduce Slack's UI/UX or enterprise feature set.

The core problem Sūtra solves is:

> Professional communication becomes difficult to manage when it is scattered across personal messaging apps, endless group chats, disconnected conversations, and different work contexts.

Sūtra gives an organization one organized home for professional communication, structured around the work people actually do.

This should work for:

- agencies
- startups
- small businesses
- teams
- solo/freelance setups
- organizations with multiple products, projects, clients, or teams

The product should be:

- simple by default
- opinionated where useful
- communication-first
- progressive in complexity
- production-oriented
- mobile-first as a first-class client
- functional before visually elaborate

---

# 2. The Initial Wedge

The first real-world validation target is small-to-medium teams, especially agencies, that currently use WhatsApp as their primary professional communication tool.

Typical problems:

- personal and professional communication are mixed
- dozens or hundreds of WhatsApp groups accumulate
- new groups are created for every small project or issue
- important decisions disappear into chat history
- information is trapped inside individual people's conversations
- it is difficult to know what requires attention
- finding old context is painful
- project/client/team communication lacks a persistent organizational home

Sūtra does **not** initially attempt to replace WhatsApp, Instagram, LinkedIn, email, etc.

Instead, V1 provides the internal professional source of truth where relevant work context and communication can live.

External communication integrations are future scope.

---

# 3. Core Product Model

The central abstraction is:

```text
Organization
    ↓
Space
    ↓
Conversation
    ↓
Messages
```

Supporting concepts:

```text
User
Membership
Conversation Member
Thread
Reaction
Notification
```

## Organization

A professional communication environment.

It can represent:

- an agency
- a startup
- a small company
- a team
- a solo/freelance setup

Do not create separate product modes such as "Agency Mode" or "Startup Mode."

The same primitives should adapt naturally to different organizational structures.

## Space

A Space represents a **work context**.

Examples:

- Engineering
- Design
- QA
- Operations
- Founder's Office
- Client A
- Client A → Website
- Product
- Marketing
- a temporary initiative

A Space is primarily an organizational container for communication.

It is **not** a project-management container in V1.

A Space has:

- name
- description
- icon/avatar
- public/private visibility
- members
- conversations
- unread state

### V1 hierarchy

Keep hierarchy shallow:

```text
Organization
    ↓
Space
    ↓
Conversation
    ↓
Messages
```

Do not introduce an elaborate project tree.

## Conversation

A Conversation is where actual communication occurs.

Example:

```text
Acme Website
    ├── General
    ├── Design
    └── Development
```

A smaller team may simply have:

```text
Engineering
    └── General
```

Core capabilities:

- create conversation
- join/leave
- conversation members
- messages
- unread state
- mentions

The purpose is to eliminate the "create another WhatsApp group" problem.

---

# 4. V1 Product Pillars

Sūtra V1 is built around three pillars.

## Pillar 1 — Organized Communication

- Spaces
- Conversations
- Messages
- Threads
- DMs
- Mentions
- Reactions

## Pillar 2 — Attention Management

- Home
- unread state
- mentions
- replies
- notifications
- push notifications

The first screen should help answer:

> What needs my attention?

## Pillar 3 — Professional Boundary

- work identity
- organization membership
- internal/external members
- workspace-scoped communication

Professional communication should have a dedicated home instead of being mixed with personal messaging.

---

# 5. Authentication

The backend already provides the authentication foundation.

Existing capabilities include:

- OAuth
- access JWTs
- refresh JWTs
- PostgreSQL sessions
- refresh-token hashing
- refresh-token rotation
- reuse detection
- session revocation
- logout
- `/v1/auth/me`
- `/v1/auth/refresh-token`
- `/v1/auth/logout`
- OAuth initiation/callback/session establishment

The clients must build their UX around this existing authentication model.

## V1 client authentication flow

```text
Open Sūtra
    ↓
Authenticated?
 ├── Yes → Home
 └── No
      ↓
    Sign in
      ↓
    OAuth
      ↓
    Callback
      ↓
    Session established
      ↓
    Onboarding
```

V1 must handle:

- sign in
- OAuth
- session persistence
- token refresh
- logout
- expired sessions
- authentication errors
- deep-link return from OAuth

Do not invent a parallel authentication model.

---

# 6. Onboarding

Keep onboarding intentionally small.

## New user

```text
Sign in
    ↓
Create organization OR accept invitation
    ↓
Basic profile
    ↓
Home
```

## Invited user

```text
Sign in
    ↓
Invitation
    ↓
Join organization
    ↓
Basic profile
    ↓
Home
```

Do not create a long onboarding wizard.

The first meaningful action should be getting into a work context and communicating.

---

# 7. Organization / Workspace Management

V1 organization capabilities:

- create organization
- organization name
- basic organization identity
- invite members
- view members
- remove members
- basic roles
- workspace switching
- basic workspace settings

V1 roles:

- Owner
- Admin
- Member

Do not build enterprise administration.

Out of V1:

- SCIM
- SSO
- audit logs
- advanced compliance
- retention policies
- granular enterprise permissions
- enterprise analytics

---

# 8. Spaces

V1:

- create Space
- rename Space
- description
- icon/avatar
- public/private visibility
- join/leave
- Space membership
- create/delete conversations
- basic Space settings
- unread state

Spaces are the persistent organizational home for work contexts.

---

# 9. Messaging

Messaging is the heart of Sūtra.

V1:

- send messages
- edit messages
- delete messages
- reply/thread
- mentions
- emoji reactions
- links
- basic rich text
- timestamps
- message grouping
- unread divider
- optimistic sending
- failed message state
- retry
- pagination
- loading states
- empty states

The messaging experience must be production-oriented rather than a static happy-path UI.

---

# 10. Threads

Threads are V1.

Purpose:

Keep discussion context attached to the message that started it.

```text
Message
    └── Thread
         ├── Reply
         ├── Reply
         └── Reply
```

V1:

- create thread/reply
- thread history
- unread thread state
- mentions
- reactions
- notifications

---

# 11. Direct Messages

V1:

- 1:1 DMs
- basic group DMs
- message history
- unread state
- mentions/replies where applicable

Do not overbuild DM functionality.

---

# 12. Home / Attention

Home is a major V1 product surface.

It should not simply be a channel list.

Its purpose is to answer:

> What needs my attention?

Conceptually:

```text
Home

Needs attention
────────────────
3 mentions
2 thread replies
1 conversation requiring attention

Recent
────────────────
Acme Website
Engineering
Design
```

The exact visual design is not yet finalized.

The product principle is:

> Home should tell the user what matters, not merely what happened.

---

# 13. Notifications

V1 explicitly distinguishes:

### Unread

There is content the user has not seen.

### Attention

Something specifically involves the user.

### Notification

The system actively alerts the user.

V1 notification capabilities:

- mentions
- DMs
- thread replies
- relevant conversation activity
- in-app notifications
- unread counts
- mobile push notifications
- basic notification preferences

---

# 14. Search

V1 search covers:

- messages
- conversations
- Spaces
- people

The primary job of search is:

> "I remember we discussed this somewhere. Find it."

Do not build advanced search syntax or comprehensive file-content search in V1.

---

# 15. People / Profiles

V1 profile capabilities:

- name
- avatar
- basic profile information
- presence/status
- organization membership
- role
- start DM from profile

Account/session settings:

- logout
- active sessions
- basic account settings

Presence should remain basic; it is not a major V1 feature.

---

# 16. Internal vs External Members

V1 should distinguish between:

```text
Internal member
External member
```

Example:

```text
Acme Website

Aditya — Internal
Rahul — Internal
Designer — Internal
John — External
```

External members should have restricted access to the relevant Space/conversations.

Do not build a full client portal in V1.

This distinction creates the foundation for future client collaboration without overbuilding permissions now.

---

# 17. Attachments

Basic attachments belong in V1 because a communication product without them will push users back toward WhatsApp.

V1:

- image upload
- common document/file upload
- preview where practical
- download
- upload progress
- failed upload
- retry
- reasonable file-size limits

Not V1:

- document management system
- sophisticated file library
- collaborative document editing

---

# 18. Realtime

V1 user-facing realtime behavior:

- new messages
- message edits
- message deletes
- reactions
- thread replies
- typing indicator
- reconnecting
- connection failure
- connection recovery

Duplicate/stale event handling must be reflected in the UX.

Presence can remain basic or be deferred as long as it does not block communication.

---

# 19. Mobile V1

Current native stack:

- Bun + Turborepo monorepo
- `apps/native`
- Expo
- React Native
- Expo Router
- HeroUI Native
- Uniwind
- Tailwind CSS
- TanStack Query
- Expo SecureStore
- Varlock
- Zod
- Reanimated
- Gesture Handler
- Safe Area Context

Development:

- Android first
- physical Android device
- USB/ADB
- local builds

Storage:

- SecureStore for sensitive credentials
- MMKV for appropriate persistent client-side data
- no AsyncStorage

State:

- TanStack Query for server state
- React/local state where sufficient
- dedicated client-state store only when justified

EAS:

- understand eventually
- not a current implementation priority

## Mobile UX requirements

- touch-friendly interactions
- keyboard-aware composer
- attachment picker
- touch-friendly message actions
- gestures where useful
- Android back behavior
- deep linking
- push notifications
- reconnect states
- optimistic messages
- failed-message retry
- practical offline/reconnection UX

Mobile should not simply be a shrunken web interface.

---


# 20. Billing, Payments & Commercial Entitlements

Sūtra V1 must include the **base commercial infrastructure** required for the product to be safely distributed as a real SaaS.

The exact pricing model is intentionally **not finalized in V1**. Pricing and plan experiments should be possible without changing the core product architecture.

The initial commercial direction may include a freemium model, for example:

```text
Free
    1 organization
    limited seats
        ↓
Paid
    additional capacity/features
```

The exact free-seat limit, paid tiers, pricing, and feature entitlements remain product/business decisions to be finalized later.

## Hosted Sūtra

Hosted organizations are subscribed through the Sūtra website.

```text
Website
    ↓
Pricing
    ↓
Checkout
    ↓
Subscription
    ↓
Organization entitlement
    ↓
Web / Mobile access
```

The mobile clients should not own the billing relationship.

Subscription management is web/backend based, including:

- plan selection
- checkout
- upgrade
- downgrade
- cancellation
- billing status
- payment failure handling

The mobile app should consume the resulting organization entitlement rather than implementing its own billing system.

## Self-hosted Sūtra

Sūtra should have a commercial/licensing model that can support self-hosted deployments.

Potential models include:

- one-time license
- recurring commercial license
- paid updates
- optional support/maintenance

The exact commercial model is not finalized in V1.

The architecture should nevertheless distinguish:

```text
Hosted subscription
vs
Self-hosted license
```

rather than assuming every organization is a SaaS subscription.

## Billing architecture

Model commercial access around:

```text
Plan
    ↓
Entitlements
    ↓
Organization Subscription / License
    ↓
Feature + Usage Limits
```

This is intentionally more flexible than hardcoding pricing rules throughout the application.

V1 should support the infrastructure necessary for:

- plans
- plan entitlements
- organization subscriptions
- subscription lifecycle/status
- seat/member limits
- trials where applicable
- monthly/yearly billing
- upgrades
- downgrades
- cancellation
- payment failure / past-due states
- billing history/invoices where applicable
- payment-provider webhooks
- entitlement enforcement
- self-hosted licensing foundation

## Billing principle

Core communication should not be artificially crippled merely to create a pricing wall.

The free tier should be capable of demonstrating the actual Sūtra communication experience.

The eventual commercial model can primarily evolve around:

- organization size
- capacity
- storage
- advanced capabilities
- additional limits
- support/licensing
- self-hosted requirements

The exact pricing matrix is deliberately deferred.

---

# 21. UX State Requirements

Every important V1 screen/interaction must account for:

- initial loading
- loaded
- empty
- error
- offline
- permission denied
- partial data
- retry
- optimistic update
- reconnecting

For message sending specifically:

```text
Idle
 ↓
Optimistic sending
 ├── Success
 └── Failure
       ↓
     Retry
```

For realtime:

```text
Connected
 ↓
Disconnected
 ↓
Reconnecting
 ├── Reconnected
 └── Failed
```

Production states are part of the product, not optional polish.

---

# 22. V1 Screen Inventory

## Authentication

1. Sign in
2. OAuth/loading/error
3. Session expired

## Onboarding

4. Create organization
5. Accept invitation
6. Basic profile setup

## Main application

7. Home
8. Space navigation/list
9. Space
10. Conversation
11. Thread
12. DM list
13. DM conversation
14. Search
15. Search results
16. Notifications
17. Profile

## Management

18. Members
19. Invite member
20. Space settings
21. Organization settings
22. Account/session settings

Many of these may be sheets, modals, nested routes, or states rather than standalone full-screen pages.

---

# 23. Explicitly Out of Scope for V1

Do not add these merely because they appear in Slack-like references or templates.

## External communication aggregation

- WhatsApp integration
- Instagram integration
- LinkedIn integration
- Twitter/X integration
- email aggregation

Sūtra does not need to replace every external channel initially.

## AI

- AI assistant
- AI summaries
- automatic action items
- automatic decision extraction
- AI catch-up

AI can be added after the communication/context foundation exists.

## Project management

- tasks
- milestones
- project dashboards
- calendars
- workflow management
- time tracking

Sūtra is not becoming ClickUp/Asana in V1.

## Collaboration

- video calls
- audio calls
- collaborative documents
- advanced whiteboards

## Business systems

- billing
- CRM
- sales pipeline
- invoicing

## Enterprise

- SSO
- SCIM
- advanced compliance
- retention policies
- enterprise audit systems
- granular permission matrix

## Advanced communication features

- message scheduling
- advanced presence
- sophisticated status system
- bots
- workflow automation
- integrations marketplace
- advanced moderation
- extensive customization

---

# 24. What V1 Must Prove

A 20+ person agency should be able to complete this end-to-end:

```text
Founder creates Sūtra organization
        ↓
Invites team
        ↓
Creates internal Spaces:
    Engineering
    Design
    QA
    Operations
    Founder's Office
        ↓
Creates client/project Spaces:
    Client A
    Client B
    Client C
        ↓
Creates relevant Conversations
        ↓
Team communicates
        ↓
Replies happen in Threads
        ↓
People mention each other
        ↓
Founder opens Home
        ↓
Sees what needs attention
        ↓
Searches an old conversation
        ↓
Finds the relevant context
        ↓
Receives mobile notification
        ↓
Responds
```

If this works reliably, Sūtra has a real V1 product.

The V1 does not need AI, integrations, project management, or dozens of Slack-style features to be useful.

---

# 25. Product Experience Goal

WhatsApp organizes communication primarily around:

> people + groups

Sūtra organizes professional communication around:

> work context + people

The intended loop is:

```text
Open Sūtra
    ↓
See what needs attention
    ↓
Choose work context
    ↓
Enter conversation
    ↓
Communicate
    ↓
Context remains organized
    ↓
Return later
    ↓
Quickly catch up
```

The product should reduce:

- group sprawl
- lost context
- personal/professional mixing
- information trapped in individual conversations
- unnecessary notifications
- difficulty finding old discussions
- uncertainty about what needs attention

---

# 26. Product Principle for Future Features

Before adding any feature, ask:

1. What problem does it solve?
2. Is that problem actually present for Sūtra users?
3. Does it strengthen organized professional communication?
4. Does it reduce cognitive load or add complexity?
5. Can it be deferred without making V1 incomplete?
6. Does it belong in Sūtra, or are we turning Sūtra into another category of software?

Do not add features simply because Slack, Discord, Teams, or a reference Figma contains them.

---

# 27. Backend Alignment

Backend:

- Hono
- Bun
- Drizzle
- PostgreSQL
- Zod
- OpenAPI
- feature/module-oriented architecture

The backend route definitions and Zod/OpenAPI schemas are the API contract.

Mobile must:

- reuse existing backend contracts
- reuse generated/inferred types where appropriate
- avoid manually duplicating server types
- avoid inventing API shapes
- avoid duplicating validation logic unnecessarily
- separate client-only models from server models
- identify when a backend change is genuinely required

For each feature, reason through:

```text
UI
 ↓
Client state
 ↓
Server state
 ↓
API endpoint
 ↓
Backend module
 ↓
Database entities
 ↓
Realtime events
```

where applicable.

---

# 28. Implementation Order

The product should be implemented in this broad order:

## Phase 1 — Foundation

- authentication
- session persistence
- onboarding
- organization creation/join
- basic navigation

## Phase 2 — Communication Core

- Spaces
- Conversations
- message list
- composer
- send/edit/delete
- pagination
- optimistic sending
- errors/retry

## Phase 3 — Conversation Depth

- threads
- reactions
- mentions
- unread state
- read state

## Phase 4 — People / DMs

- profiles
- member management
- 1:1 DMs
- group DMs
- internal/external membership

## Phase 5 — Realtime

- WebSocket/event integration
- new messages
- edits/deletes
- reactions
- thread replies
- typing
- reconnect behavior

## Phase 6 — Attention

- Home
- mentions
- replies
- notifications
- unread counts
- push notifications

## Phase 7 — Discovery / Files

- search
- attachments
- upload failures/retry
- basic previews

## Phase 8 — Product Hardening

- permissions
- edge cases
- offline/reconnection behavior
- error states
- security review
- loading/empty states
- performance
- mobile polish
- production readiness

---

# 29. Definition of V1

V1 is complete when a real team can replace the majority of its **internal professional WhatsApp communication** with Sūtra without feeling that the product is merely a demo.

The primary success criteria are:

- communication is organized by work context
- conversations persist in meaningful places
- threads preserve context
- important activity surfaces naturally
- users can find old conversations
- realtime communication is reliable
- mobile communication works properly
- failures and reconnects are handled
- external members can participate safely
- the product feels coherent without requiring enterprise complexity

Visual polish comes after functional completeness.

The baseline visual system should still be intentional and consistent, but aesthetics should not delay proving that the product works.
