# 00_PROJECT_CONSTITUTION.md

Version: 1.0
Status: Draft
Priority: Highest

## Purpose
This document is the highest-priority governing document for SATHI.

## Project Identity
SATHI is a Trusted Companion & Local Experience Marketplace.
It is NOT a dating, escort, or matchmaking platform.

Mission:
- Platonic companionship
- Local experiences
- Tourism
- Hiking
- Language exchange
- Cultural exchange
- Community activities

## Documentation Precedence
1. PROJECT_CONSTITUTION.md
2. Existing Markdown documentation
3. Existing implementation
4. Git history
5. New prompts
6. AI assumptions

Existing Markdown files are the source of truth. Never replace them without explicit approval.

## AI Rules
- Read relevant Markdown before coding.
- Preserve architecture.
- Extend instead of rewrite.
- Update docs only when implementation changes.
- Create HANDOFF.md before ending if work is incomplete.

## Engineering Principles
- Preserve before replacing.
- Modular architecture.
- Secure by default.
- Scalable by default.
- Cloud Functions for sensitive logic.
- Firebase Auth + RBAC.
- Cursor pagination.
- Indexed Firestore queries.
- No hot documents.
- No growing arrays.

## Scalability
Design for:
- 10,000 concurrent users
- 100,000+ registered users
- Millions of bookings, chats and notifications.

## Product Evolution
Companions -> Local Guides -> Events -> Hotels -> Restaurants -> Adventure Partners -> Global Ecosystem

## Admin
Separate application:
admin.sathi.com

## User App
app.sathi.com
