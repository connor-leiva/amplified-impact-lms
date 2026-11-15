# LMS lift, PR A (D-156): every route and state at 390 and 1280

From the fixture build (`pnpm --filter @ai/web preview:fixture`, persona `?as=`): fixture data only, no real accounts, no production data. Light theme unless the state says dark. JPEG at 1x. Shell pages are grown to their full scroll height; a state that opens a dialog, drawer or menu is shown at the device's own height.

`route-*` is every LMS route; `state-*` is every parity scenario (its persona, phase, theme, rail and actions), shown at 390 and 1280 whatever width the golden uses. A few states click something that exists only at desktop width (a sidebar row); at 390 those show the page without it.

These files live only in this one commit; the next commit removes them, so no image merges into `main`.

## Routes

### route-account

<img src="route-account-390.jpg" width="195" alt="route-account at 390"> <img src="route-account-1280.jpg" width="560" alt="route-account at 1280">

### route-admin-announcements

<img src="route-admin-announcements-390.jpg" width="195" alt="route-admin-announcements at 390"> <img src="route-admin-announcements-1280.jpg" width="560" alt="route-admin-announcements at 1280">

### route-admin-builder

<img src="route-admin-builder-390.jpg" width="195" alt="route-admin-builder at 390"> <img src="route-admin-builder-1280.jpg" width="560" alt="route-admin-builder at 1280">

### route-admin-builder-new

<img src="route-admin-builder-new-390.jpg" width="195" alt="route-admin-builder-new at 390"> <img src="route-admin-builder-new-1280.jpg" width="560" alt="route-admin-builder-new at 1280">

### route-admin-cohorts

<img src="route-admin-cohorts-390.jpg" width="195" alt="route-admin-cohorts at 390"> <img src="route-admin-cohorts-1280.jpg" width="560" alt="route-admin-cohorts at 1280">

### route-admin-crm-sync

<img src="route-admin-crm-sync-390.jpg" width="195" alt="route-admin-crm-sync at 390"> <img src="route-admin-crm-sync-1280.jpg" width="560" alt="route-admin-crm-sync at 1280">

### route-admin-curriculum

<img src="route-admin-curriculum-390.jpg" width="195" alt="route-admin-curriculum at 390"> <img src="route-admin-curriculum-1280.jpg" width="560" alt="route-admin-curriculum at 1280">

### route-admin-learners

<img src="route-admin-learners-390.jpg" width="195" alt="route-admin-learners at 390"> <img src="route-admin-learners-1280.jpg" width="560" alt="route-admin-learners at 1280">

### route-admin-overview

<img src="route-admin-overview-390.jpg" width="195" alt="route-admin-overview at 390"> <img src="route-admin-overview-1280.jpg" width="560" alt="route-admin-overview at 1280">

### route-admin-staff

<img src="route-admin-staff-390.jpg" width="195" alt="route-admin-staff at 390"> <img src="route-admin-staff-1280.jpg" width="560" alt="route-admin-staff at 1280">

### route-admin-tiers

<img src="route-admin-tiers-390.jpg" width="195" alt="route-admin-tiers at 390"> <img src="route-admin-tiers-1280.jpg" width="560" alt="route-admin-tiers at 1280">

### route-admin-vault

<img src="route-admin-vault-390.jpg" width="195" alt="route-admin-vault at 390"> <img src="route-admin-vault-1280.jpg" width="560" alt="route-admin-vault at 1280">

### route-course

<img src="route-course-390.jpg" width="195" alt="route-course at 390"> <img src="route-course-1280.jpg" width="560" alt="route-course at 1280">

### route-dashboard

<img src="route-dashboard-390.jpg" width="195" alt="route-dashboard at 390"> <img src="route-dashboard-1280.jpg" width="560" alt="route-dashboard at 1280">

### route-employee-marketing

<img src="route-employee-marketing-390.jpg" width="195" alt="route-employee-marketing at 390"> <img src="route-employee-marketing-1280.jpg" width="560" alt="route-employee-marketing at 1280">

### route-forgot-password

<img src="route-forgot-password-390.jpg" width="195" alt="route-forgot-password at 390"> <img src="route-forgot-password-1280.jpg" width="560" alt="route-forgot-password at 1280">

### route-invite

<img src="route-invite-390.jpg" width="195" alt="route-invite at 390"> <img src="route-invite-1280.jpg" width="560" alt="route-invite at 1280">

### route-sessions

<img src="route-sessions-390.jpg" width="195" alt="route-sessions at 390"> <img src="route-sessions-1280.jpg" width="560" alt="route-sessions at 1280">

### route-set-password

<img src="route-set-password-390.jpg" width="195" alt="route-set-password at 390"> <img src="route-set-password-1280.jpg" width="560" alt="route-set-password at 1280">

### route-sign-in

<img src="route-sign-in-390.jpg" width="195" alt="route-sign-in at 390"> <img src="route-sign-in-1280.jpg" width="560" alt="route-sign-in at 1280">

### route-skill-guide

<img src="route-skill-guide-390.jpg" width="195" alt="route-skill-guide at 390"> <img src="route-skill-guide-1280.jpg" width="560" alt="route-skill-guide at 1280">

### route-skill-library

<img src="route-skill-library-390.jpg" width="195" alt="route-skill-library at 390"> <img src="route-skill-library-1280.jpg" width="560" alt="route-skill-library at 1280">

### route-team

<img src="route-team-390.jpg" width="195" alt="route-team at 390"> <img src="route-team-1280.jpg" width="560" alt="route-team at 1280">

### route-team-tier

<img src="route-team-tier-390.jpg" width="195" alt="route-team-tier at 390"> <img src="route-team-tier-1280.jpg" width="560" alt="route-team-tier at 1280">

### route-vault

<img src="route-vault-390.jpg" width="195" alt="route-vault at 390"> <img src="route-vault-1280.jpg" width="560" alt="route-vault at 1280">

## States (the 53 parity scenarios)

### state-admin-announce

<img src="state-admin-announce-390.jpg" width="195" alt="state-admin-announce at 390"> <img src="state-admin-announce-1280.jpg" width="560" alt="state-admin-announce at 1280">

### state-admin-avault

<img src="state-admin-avault-390.jpg" width="195" alt="state-admin-avault at 390"> <img src="state-admin-avault-1280.jpg" width="560" alt="state-admin-avault at 1280">

### state-admin-builder

<img src="state-admin-builder-390.jpg" width="195" alt="state-admin-builder at 390"> <img src="state-admin-builder-1280.jpg" width="560" alt="state-admin-builder at 1280">

### state-admin-builder-locked

<img src="state-admin-builder-locked-390.jpg" width="195" alt="state-admin-builder-locked at 390"> <img src="state-admin-builder-locked-1280.jpg" width="560" alt="state-admin-builder-locked at 1280">

### state-admin-builder-marketing

<img src="state-admin-builder-marketing-390.jpg" width="195" alt="state-admin-builder-marketing at 390"> <img src="state-admin-builder-marketing-1280.jpg" width="560" alt="state-admin-builder-marketing at 1280">

### state-admin-cohorts

<img src="state-admin-cohorts-390.jpg" width="195" alt="state-admin-cohorts at 390"> <img src="state-admin-cohorts-1280.jpg" width="560" alt="state-admin-cohorts at 1280">

### state-admin-cohorts-edit

<img src="state-admin-cohorts-edit-390.jpg" width="195" alt="state-admin-cohorts-edit at 390"> <img src="state-admin-cohorts-edit-1280.jpg" width="560" alt="state-admin-cohorts-edit at 1280">

### state-admin-curriculum

<img src="state-admin-curriculum-390.jpg" width="195" alt="state-admin-curriculum at 390"> <img src="state-admin-curriculum-1280.jpg" width="560" alt="state-admin-curriculum at 1280">

### state-admin-learner-drawer

<img src="state-admin-learner-drawer-390.jpg" width="195" alt="state-admin-learner-drawer at 390"> <img src="state-admin-learner-drawer-1280.jpg" width="560" alt="state-admin-learner-drawer at 1280">

### state-admin-learners

<img src="state-admin-learners-390.jpg" width="195" alt="state-admin-learners at 390"> <img src="state-admin-learners-1280.jpg" width="560" alt="state-admin-learners at 1280">

### state-admin-learners-teams

<img src="state-admin-learners-teams-390.jpg" width="195" alt="state-admin-learners-teams at 390"> <img src="state-admin-learners-teams-1280.jpg" width="560" alt="state-admin-learners-teams at 1280">

### state-admin-overview

<img src="state-admin-overview-390.jpg" width="195" alt="state-admin-overview at 390"> <img src="state-admin-overview-1280.jpg" width="560" alt="state-admin-overview at 1280">

### state-admin-overview-dark

<img src="state-admin-overview-dark-390.jpg" width="195" alt="state-admin-overview-dark at 390"> <img src="state-admin-overview-dark-1280.jpg" width="560" alt="state-admin-overview-dark at 1280">

### state-admin-overview-laptop

<img src="state-admin-overview-laptop-390.jpg" width="195" alt="state-admin-overview-laptop at 390"> <img src="state-admin-overview-laptop-1280.jpg" width="560" alt="state-admin-overview-laptop at 1280">

### state-admin-staff

<img src="state-admin-staff-390.jpg" width="195" alt="state-admin-staff at 390"> <img src="state-admin-staff-1280.jpg" width="560" alt="state-admin-staff at 1280">

### state-admin-tiers

<img src="state-admin-tiers-390.jpg" width="195" alt="state-admin-tiers at 390"> <img src="state-admin-tiers-1280.jpg" width="560" alt="state-admin-tiers at 1280">

### state-admin-vault-upload

<img src="state-admin-vault-upload-390.jpg" width="195" alt="state-admin-vault-upload at 390"> <img src="state-admin-vault-upload-1280.jpg" width="560" alt="state-admin-vault-upload at 1280">

### state-dash-agent-dark

<img src="state-dash-agent-dark-390.jpg" width="195" alt="state-dash-agent-dark at 390"> <img src="state-dash-agent-dark-1280.jpg" width="560" alt="state-dash-agent-dark at 1280">

### state-dash-agent-eastern

<img src="state-dash-agent-eastern-390.jpg" width="195" alt="state-dash-agent-eastern at 390"> <img src="state-dash-agent-eastern-1280.jpg" width="560" alt="state-dash-agent-eastern at 1280">

### state-dash-agent-laptop

<img src="state-dash-agent-laptop-390.jpg" width="195" alt="state-dash-agent-laptop at 390"> <img src="state-dash-agent-laptop-1280.jpg" width="560" alt="state-dash-agent-laptop at 1280">

### state-dash-agent-live

<img src="state-dash-agent-live-390.jpg" width="195" alt="state-dash-agent-live at 390"> <img src="state-dash-agent-live-1280.jpg" width="560" alt="state-dash-agent-live at 1280">

### state-dash-agent-mobile

<img src="state-dash-agent-mobile-390.jpg" width="195" alt="state-dash-agent-mobile at 390"> <img src="state-dash-agent-mobile-1280.jpg" width="560" alt="state-dash-agent-mobile at 1280">

### state-dash-agent-post

<img src="state-dash-agent-post-390.jpg" width="195" alt="state-dash-agent-post at 390"> <img src="state-dash-agent-post-1280.jpg" width="560" alt="state-dash-agent-post at 1280">

### state-dash-agent-week0

<img src="state-dash-agent-week0-390.jpg" width="195" alt="state-dash-agent-week0 at 390"> <img src="state-dash-agent-week0-1280.jpg" width="560" alt="state-dash-agent-week0 at 1280">

### state-dash-owner-live

<img src="state-dash-owner-live-390.jpg" width="195" alt="state-dash-owner-live at 390"> <img src="state-dash-owner-live-1280.jpg" width="560" alt="state-dash-owner-live at 1280">

### state-emp-agent-database

<img src="state-emp-agent-database-390.jpg" width="195" alt="state-emp-agent-database at 390"> <img src="state-emp-agent-database-1280.jpg" width="560" alt="state-emp-agent-database at 1280">

### state-emp-agent-laptop

<img src="state-emp-agent-laptop-390.jpg" width="195" alt="state-emp-agent-laptop at 390"> <img src="state-emp-agent-laptop-1280.jpg" width="560" alt="state-emp-agent-laptop at 1280">

### state-emp-agent-marketing

<img src="state-emp-agent-marketing-390.jpg" width="195" alt="state-emp-agent-marketing at 390"> <img src="state-emp-agent-marketing-1280.jpg" width="560" alt="state-emp-agent-marketing at 1280">

### state-emp-agent-marketing-checklist

<img src="state-emp-agent-marketing-checklist-390.jpg" width="195" alt="state-emp-agent-marketing-checklist at 390"> <img src="state-emp-agent-marketing-checklist-1280.jpg" width="560" alt="state-emp-agent-marketing-checklist at 1280">

### state-emp-agent-marketing-prompt

<img src="state-emp-agent-marketing-prompt-390.jpg" width="195" alt="state-emp-agent-marketing-prompt at 390"> <img src="state-emp-agent-marketing-prompt-1280.jpg" width="560" alt="state-emp-agent-marketing-prompt at 1280">

### state-emp-agent-marketing-transcript

<img src="state-emp-agent-marketing-transcript-390.jpg" width="195" alt="state-emp-agent-marketing-transcript at 390"> <img src="state-emp-agent-marketing-transcript-1280.jpg" width="560" alt="state-emp-agent-marketing-transcript at 1280">

### state-emp-agent-mobile

<img src="state-emp-agent-mobile-390.jpg" width="195" alt="state-emp-agent-mobile at 390"> <img src="state-emp-agent-mobile-1280.jpg" width="560" alt="state-emp-agent-mobile at 1280">

### state-emp-agent-sales

<img src="state-emp-agent-sales-390.jpg" width="195" alt="state-emp-agent-sales at 390"> <img src="state-emp-agent-sales-1280.jpg" width="560" alt="state-emp-agent-sales at 1280">

### state-emp-owner-meetings

<img src="state-emp-owner-meetings-390.jpg" width="195" alt="state-emp-owner-meetings at 390"> <img src="state-emp-owner-meetings-1280.jpg" width="560" alt="state-emp-owner-meetings at 1280">

### state-sessions-agent

<img src="state-sessions-agent-390.jpg" width="195" alt="state-sessions-agent at 390"> <img src="state-sessions-agent-1280.jpg" width="560" alt="state-sessions-agent at 1280">

### state-sessions-owner-eastern

<img src="state-sessions-owner-eastern-390.jpg" width="195" alt="state-sessions-owner-eastern at 390"> <img src="state-sessions-owner-eastern-1280.jpg" width="560" alt="state-sessions-owner-eastern at 1280">

### state-shell-admin

<img src="state-shell-admin-390.jpg" width="195" alt="state-shell-admin at 390"> <img src="state-shell-admin-1280.jpg" width="560" alt="state-shell-admin at 1280">

### state-shell-agent

<img src="state-shell-agent-390.jpg" width="195" alt="state-shell-agent at 390"> <img src="state-shell-agent-1280.jpg" width="560" alt="state-shell-agent at 1280">

### state-shell-agent-dark

<img src="state-shell-agent-dark-390.jpg" width="195" alt="state-shell-agent-dark at 390"> <img src="state-shell-agent-dark-1280.jpg" width="560" alt="state-shell-agent-dark at 1280">

### state-shell-agent-laptop

<img src="state-shell-agent-laptop-390.jpg" width="195" alt="state-shell-agent-laptop at 390"> <img src="state-shell-agent-laptop-1280.jpg" width="560" alt="state-shell-agent-laptop at 1280">

### state-shell-agent-mobile

<img src="state-shell-agent-mobile-390.jpg" width="195" alt="state-shell-agent-mobile at 390"> <img src="state-shell-agent-mobile-1280.jpg" width="560" alt="state-shell-agent-mobile at 1280">

### state-shell-agent-mobile-drawer

<img src="state-shell-agent-mobile-drawer-390.jpg" width="195" alt="state-shell-agent-mobile-drawer at 390"> <img src="state-shell-agent-mobile-drawer-1280.jpg" width="560" alt="state-shell-agent-mobile-drawer at 1280">

### state-shell-agent-rail

<img src="state-shell-agent-rail-390.jpg" width="195" alt="state-shell-agent-rail at 390"> <img src="state-shell-agent-rail-1280.jpg" width="560" alt="state-shell-agent-rail at 1280">

### state-shell-locked-preview

<img src="state-shell-locked-preview-390.jpg" width="195" alt="state-shell-locked-preview at 390"> <img src="state-shell-locked-preview-1280.jpg" width="560" alt="state-shell-locked-preview at 1280">

### state-shell-owner

<img src="state-shell-owner-390.jpg" width="195" alt="state-shell-owner at 390"> <img src="state-shell-owner-1280.jpg" width="560" alt="state-shell-owner at 1280">

### state-shell-profile-menu

<img src="state-shell-profile-menu-390.jpg" width="195" alt="state-shell-profile-menu at 390"> <img src="state-shell-profile-menu-1280.jpg" width="560" alt="state-shell-profile-menu at 1280">

### state-team-owner

<img src="state-team-owner-390.jpg" width="195" alt="state-team-owner at 390"> <img src="state-team-owner-1280.jpg" width="560" alt="state-team-owner at 1280">

### state-team-owner-invite

<img src="state-team-owner-invite-390.jpg" width="195" alt="state-team-owner-invite at 390"> <img src="state-team-owner-invite-1280.jpg" width="560" alt="state-team-owner-invite at 1280">

### state-team-owner-member

<img src="state-team-owner-member-390.jpg" width="195" alt="state-team-owner-member at 390"> <img src="state-team-owner-member-1280.jpg" width="560" alt="state-team-owner-member at 1280">

### state-tier-agent

<img src="state-tier-agent-390.jpg" width="195" alt="state-tier-agent at 390"> <img src="state-tier-agent-1280.jpg" width="560" alt="state-tier-agent at 1280">

### state-vault-agent

<img src="state-vault-agent-390.jpg" width="195" alt="state-vault-agent at 390"> <img src="state-vault-agent-1280.jpg" width="560" alt="state-vault-agent at 1280">

### state-vault-agent-exec

<img src="state-vault-agent-exec-390.jpg" width="195" alt="state-vault-agent-exec at 390"> <img src="state-vault-agent-exec-1280.jpg" width="560" alt="state-vault-agent-exec at 1280">

### state-vault-owner-exec

<img src="state-vault-owner-exec-390.jpg" width="195" alt="state-vault-owner-exec at 390"> <img src="state-vault-owner-exec-1280.jpg" width="560" alt="state-vault-owner-exec at 1280">

## www, checked for regressions

Home, pricing, library and a skill page (`/appointment-follow-up`), at 390 and 1280, from this branch's build. Their built HTML, CSS and JS are byte-identical to `main`'s (72 of the 73 built pages are; the 73rd is the learn app's `index.html`).

### www-home

<img src="www-home-390.jpg" width="195" alt="www home at 390"> <img src="www-home-1280.jpg" width="560" alt="www home at 1280">

### www-pricing

<img src="www-pricing-390.jpg" width="195" alt="www pricing at 390"> <img src="www-pricing-1280.jpg" width="560" alt="www pricing at 1280">

### www-library

<img src="www-library-390.jpg" width="195" alt="www library at 390"> <img src="www-library-1280.jpg" width="560" alt="www library at 1280">

### www-appointment-follow-up

<img src="www-appointment-follow-up-390.jpg" width="195" alt="www appointment-follow-up at 390"> <img src="www-appointment-follow-up-1280.jpg" width="560" alt="www appointment-follow-up at 1280">

