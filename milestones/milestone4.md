# Milestone 4

This document should be completed and submitted during **Unit 8** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

- [ ] Update the completion percentage of each GitHub Milestone. The milestone for this unit (Milestone 4 - Unit 8) should be 100% completed when you submit for full points.
- [ ] In `readme.md`, check off the features you have completed in this unit by adding a ✅ emoji in front of the feature's name.
  - [ ] Under each feature you have completed, include a GIF showing feature functionality.
- [ ] In this document, complete all five questions in the **Reflection** section below.

## Reflection

### 1. What went well during this unit?

The core of the app came together this unit. The database is seeded with sample data for all 50 states and Washington, DC, and the API now covers groups, venues, events, RSVPs, profiles, map pins, and filters, with each endpoint checked by tests (about 190 unit tests, plus 38 tests that call every route against a real database). On the client, hosts can create, edit, and delete events and groups, anyone can browse events and groups with filters and pages, and a map shows one pin per event. Writing the plan and the tests first helped a lot: each page had a clear list of what it should do for visitors, attendees, and hosts, and a single test file now checks that every page behaves correctly for all three. The API is also fully documented.

### 2. What were some challenges your group faced in this unit?

The biggest challenge was building around the login. Manav owns the GitHub login, and his pages were not in the repository yet, so I built the pages against the one thing I could rely on (`/api/users/me`) and added a temporary test login and a temporary page so I could try the app as a host and as an attendee. Those temporary pieces are listed for removal when the login pages are merged. Other challenges were keeping the data model and the ERD consistent while the design changed (for example, hosts now type only a venue name and address, and the server finds the map position, and categories can now be added by hosts), respecting the address lookup service's one-request-per-second limit by queueing lookups, making sure two people cannot take the last place at an event, and testing a map in a test environment that has no screen.

### Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?

I finished the planned core work: the database and data, the API, the pages and forms for events, groups, venues, RSVPs, and profiles, the map, the filters, and the documentation. What is left is joining the pages with Manav's login pages in `App.jsx` and deleting the temporary test login, checking every page at phone width in a real browser, deploying to Render, and recording the GIFs for the README. If time runs short I would do them in that order: join the login first, because everything else depends on it, then deploy, then the phone check, then the GIFs.

### Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?

The features at the most risk are the two extras that are not started: Collections and Saved Events, and Comments and Likes. A second risk is the login integration and deployment, since they depend on Manav's files, on the GitHub OAuth settings for the live address, and on the address lookup service's rules for a public site. If those stay at risk I would cut the two extras so the core features (creating events, browsing and filtering, RSVPs, and profiles) are solid and deployed, and then add one extra, such as likes, only if time remains.

### 5. What additional support will you need in upcoming units as you continue to work on your final project?

I would like help with deploying to Render: setting the environment variables, pointing the GitHub login at the live address, and keeping the database connection secure. I would also like advice on using a free address lookup service responsibly on a public site, since its rules limit how often it can be called. A code review from teammates on the shared pieces (the filter section, the forms, and the API documentation) would help catch anything that is unclear, and a few other people trying the app on their phones would help find layout problems before we submit.
