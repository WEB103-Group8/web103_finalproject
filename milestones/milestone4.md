# Milestone 4

This document should be completed and submitted during **Unit 8** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

- [ ] Update the completion percentage of each GitHub Milestone. The milestone for this unit (Milestone 4 - Unit 8) should be 100% completed when you submit for full points.
- [ ] In `readme.md`, check off the features you have completed in this unit by adding a ✅ emoji in front of the feature's name.
  - [ ] Under each feature you have completed, include a GIF showing feature functionality.
- [x] In this document, complete all five questions in the **Reflection** section below.

## Reflection

### 1. What went well during this unit?

The core of Orbit came together this unit. The database is seeded with sample data for all 50 states and Washington, DC, and the API covers groups, venues, events, RSVPs, profiles, map pins, and filters. Hosts can create, edit, and delete events and groups, and anyone can browse events and groups with filters and pages. The home page map shows nearby events, while event details, profiles, and group pages adapt to visitors, attendees, and hosts. GitHub OAuth is now connected to the Orbit pages, including onboarding for new users and sign-out. Writing the plan and tests first helped us keep each page's behavior clear, and the API documentation, confirmation messages, loading indicators, time-zone handling, and 404 page made the app easier to use.

### 2. What were some challenges your group faced in this unit?

The biggest challenge was integrating GitHub OAuth with pages that had initially been built around a separate session check. We had to make sure login, onboarding, page access, and sign-out all agree about who is logged in; after connecting those flows, we could remove the temporary test-login page and API. Other challenges were keeping the data model and entity relationship diagram consistent as the design changed, respecting the address lookup service's one-request-per-second limit, preventing two people from taking the last place at an event, showing times in the right time zone, and testing a map in a test environment that has no screen.

### Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?

We finished the planned core work: the database and data, API, GitHub login and onboarding, event and group pages and forms, RSVPs, profiles, map, filters, and documentation. Remaining work includes checking every page at phone width, updating the entity relationship diagram if it no longer matches the schema, deploying to Render, and recording the feature GIFs for the README. We would prioritize deployment and a full end-to-end check, then mobile layout fixes, then the diagram and GIFs.

### Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?

The features at the most risk are the two extras that are not started: Collections and Saved Events, and Comments and Likes. Deployment is also at risk until the live environment variables, GitHub OAuth callback, database connection, and public address-lookup behavior are verified. If time runs short, we would focus on deploying and validating the core features—creating events and groups, browsing and filtering, RSVPs, and profiles—before attempting either extra.

### 5. What additional support will you need in upcoming units as you continue to work on your final project?

We would appreciate advice on using a free address-lookup service responsibly on a public site. A review of the shared filters, forms, and API documentation—and feedback from people trying the app on their phones—would help us catch issues before submission.
